from typing import Dict, Any, Optional, List
import aiohttp
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import json
from .base_processor import BaseProcessor
import trafilatura
from readability import Document
import re
import logging
from datetime import datetime

class URLProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self._preview_length = 1000  # Longer preview for web content
        self.supported_domains = {
            'notion.site': self._parse_notion,
            'confluence': self._parse_confluence,
            'docs.google.com': self._parse_google_docs,
            'medium.com': self._parse_medium,
            'github.com': self._parse_github,
            'gitlab.com': self._parse_gitlab
        }

    @property
    def content_type(self) -> str:
        return 'url'

    async def process_content(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Process URL content and extract text with metadata"""
        try:
            url = metadata.get('url')
            if not url:
                raise ValueError("URL not provided in metadata")

            html = content.decode('utf-8')
            domain = urlparse(url).netloc

            # Try trafilatura first for best content extraction
            extracted_text = trafilatura.extract(html,
                                              include_comments=False,
                                              include_tables=True,
                                              include_links=True,
                                              no_fallback=False)

            # Parse content based on domain or fall back to generic
            parser = next((parser for domain_key, parser in self.supported_domains.items()
                         if domain_key in domain), self._parse_generic)
            parsed_content = await parser(html)

            # Use extracted text if available, otherwise use parsed content
            final_text = extracted_text if extracted_text else parsed_content['text']

            # Use readability as fallback for title
            if not parsed_content['title']:
                doc = Document(html)
                parsed_content['title'] = doc.title()

            # Analyze content structure
            structure = self._analyze_content_structure(html)

            return {
                'content': final_text,
                'metadata': {
                    'title': parsed_content['title'],
                    'url': url,
                    'domain': domain,
                    'source_type': parsed_content['source_type'],
                    'extraction_method': 'trafilatura' if extracted_text else 'fallback',
                    'structure': structure,
                    **parsed_content['metadata']
                }
            }

        except Exception as e:
            raise ValueError(f"Error processing URL content: {str(e)}")

    def _get_headers(self) -> Dict[str, str]:
        """Get headers for URL requests"""
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }

    async def _parse_notion(self, html: str) -> Dict:
        """Parse Notion-specific content"""
        soup = BeautifulSoup(html, 'html.parser')

        title = self._extract_title(soup)
        content_blocks = soup.find_all(['div', 'p', 'h1', 'h2', 'h3', 'li'],
                                     class_=lambda x: x and 'notion-' in x)

        text_blocks = []
        for block in content_blocks:
            if 'notion-text-block' in str(block.get('class', [])):
                text_blocks.append(block.get_text(strip=True))
            elif any(header in str(block.get('class', [])) for header in ['h1', 'h2', 'h3']):
                level = next(i for i, h in enumerate(['h1', 'h2', 'h3'], 1)
                           if h in str(block.get('class', [])))
                text_blocks.append(f"{'#' * level} {block.get_text(strip=True)}")

        return {
            'title': title,
            'text': '\n\n'.join(text_blocks),
            'source_type': 'notion',
            'metadata': {
                'blocks_count': len(content_blocks),
                'has_table_of_contents': bool(soup.find(class_='notion-table-of-contents'))
            }
        }

    async def _parse_confluence(self, html: str) -> Dict:
        """Parse Confluence-specific content"""
        soup = BeautifulSoup(html, 'html.parser')

        title = self._extract_title(soup)
        content = soup.find('div', {'id': 'main-content'}) or \
                 soup.find('div', class_='wiki-content')

        text_blocks = []
        if content:
            for elem in content.find_all(['p', 'h1', 'h2', 'h3', 'li', 'pre', 'table']):
                if elem.name in ['h1', 'h2', 'h3']:
                    level = int(elem.name[1])
                    text_blocks.append(f"{'#' * level} {elem.get_text(strip=True)}")
                elif elem.name == 'pre':
                    text_blocks.append(f"```\n{elem.get_text(strip=True)}\n```")
                else:
                    text_blocks.append(elem.get_text(strip=True))

        return {
            'title': title,
            'text': '\n\n'.join(text_blocks),
            'source_type': 'confluence',
            'metadata': {
                'page_id': self._extract_confluence_page_id(html),
                'has_attachments': bool(soup.find('div', class_='attachments')),
                'has_comments': bool(soup.find('div', id='comments-section'))
            }
        }

    async def _parse_google_docs(self, html: str) -> Dict[str, Any]:
        """Parse Google Docs content"""
        try:
            soup = BeautifulSoup(html, 'html.parser')

            # Extract content from Google Docs structure
            content_elem = soup.find('div', class_='kix-appview-editor')
            title = soup.find('div', class_='docs-title-input')

            text_blocks = []
            if content_elem:
                for elem in content_elem.find_all(['p', 'h1', 'h2', 'h3', 'li']):
                    text_blocks.append(elem.get_text(strip=True))

            return {
                'title': title.get_text(strip=True) if title else "Untitled Document",
                'text': '\n\n'.join(text_blocks),
                'source_type': 'google_docs',
                'metadata': {
                    'blocks_count': len(text_blocks),
                    'last_modified': self._extract_google_docs_metadata(soup)
                }
            }
        except Exception as e:
            logging.error(f"Error parsing Google Docs content: {str(e)}")
            return self._create_fallback_response("google_docs")

    async def _parse_medium(self, html: str) -> Dict[str, Any]:
        """Parse Medium article content"""
        try:
            soup = BeautifulSoup(html, 'html.parser')

            # Extract article content
            article = soup.find('article')
            title = soup.find('h1')
            author = soup.find('meta', {'name': 'author'})

            text_blocks = []
            if article:
                for elem in article.find_all(['p', 'h1', 'h2', 'h3', 'pre', 'blockquote']):
                    if elem.name in ['h1', 'h2', 'h3']:
                        level = int(elem.name[1])
                        text_blocks.append(f"{'#' * level} {elem.get_text(strip=True)}")
                    elif elem.name == 'pre':
                        text_blocks.append(f"```\n{elem.get_text(strip=True)}\n```")
                    elif elem.name == 'blockquote':
                        text_blocks.append(f"> {elem.get_text(strip=True)}")
                    else:
                        text_blocks.append(elem.get_text(strip=True))

            return {
                'title': title.get_text(strip=True) if title else "Untitled Article",
                'text': '\n\n'.join(text_blocks),
                'source_type': 'medium',
                'metadata': {
                    'author': author.get('content') if author else None,
                    'reading_time': self._extract_medium_reading_time(soup),
                    'claps': self._extract_medium_claps(soup)
                }
            }
        except Exception as e:
            logging.error(f"Error parsing Medium content: {str(e)}")
            return self._create_fallback_response("medium")

    async def _parse_github(self, html: str) -> Dict[str, Any]:
        """Parse GitHub content"""
        try:
            soup = BeautifulSoup(html, 'html.parser')

            # Detect content type (README, Issue, PR, etc.)
            content_type = self._determine_github_content_type(soup)

            content_elem = None
            if content_type == 'readme':
                content_elem = soup.find('article', class_='markdown-body')
            elif content_type in ['issue', 'pull_request']:
                content_elem = soup.find('div', class_='comment-body')

            text_blocks = []
            if content_elem:
                for elem in content_elem.find_all(['p', 'h1', 'h2', 'h3', 'pre', 'li']):
                    if elem.name in ['h1', 'h2', 'h3']:
                        level = int(elem.name[1])
                        text_blocks.append(f"{'#' * level} {elem.get_text(strip=True)}")
                    elif elem.name == 'pre':
                        text_blocks.append(f"```\n{elem.get_text(strip=True)}\n```")
                    else:
                        text_blocks.append(elem.get_text(strip=True))

            return {
                'title': self._extract_github_title(soup, content_type),
                'text': '\n\n'.join(text_blocks),
                'source_type': f'github_{content_type}',
                'metadata': self._extract_github_metadata(soup, content_type)
            }
        except Exception as e:
            logging.error(f"Error parsing GitHub content: {str(e)}")
            return self._create_fallback_response("github")

    async def _parse_gitlab(self, html: str) -> Dict[str, Any]:
        """Parse GitLab content"""
        try:
            soup = BeautifulSoup(html, 'html.parser')

            # Detect content type (README, Issue, MR, etc.)
            content_type = self._determine_gitlab_content_type(soup)

            content_elem = None
            if content_type == 'readme':
                content_elem = soup.find('article', class_='markdown-body')
            elif content_type in ['issue', 'merge_request']:
                content_elem = soup.find('div', class_='note-text')

            text_blocks = []
            if content_elem:
                for elem in content_elem.find_all(['p', 'h1', 'h2', 'h3', 'pre', 'li']):
                    if elem.name in ['h1', 'h2', 'h3']:
                        level = int(elem.name[1])
                        text_blocks.append(f"{'#' * level} {elem.get_text(strip=True)}")
                    elif elem.name == 'pre':
                        text_blocks.append(f"```\n{elem.get_text(strip=True)}\n```")
                    else:
                        text_blocks.append(elem.get_text(strip=True))

            return {
                'title': self._extract_gitlab_title(soup, content_type),
                'text': '\n\n'.join(text_blocks),
                'source_type': f'gitlab_{content_type}',
                'metadata': self._extract_gitlab_metadata(soup, content_type)
            }
        except Exception as e:
            logging.error(f"Error parsing GitLab content: {str(e)}")
            return self._create_fallback_response("gitlab")

    async def _parse_generic(self, html: str) -> Dict[str, Any]:
        """Parse generic web page content"""
        soup = BeautifulSoup(html, 'html.parser')

        # Remove unwanted elements
        for element in soup(['script', 'style', 'nav', 'footer', 'iframe']):
            element.decompose()

        # Extract title
        title = self._extract_title(soup)

        # Extract meta description
        meta_desc = soup.find('meta', {'name': ['description', 'Description']})
        description = meta_desc.get('content', '').strip() if meta_desc else ''

        # Extract main content
        main_content = soup.find(['main', 'article', 'div', {'id': 'content'}])
        if main_content:
            text_blocks = main_content.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'li'])
        else:
            text_blocks = soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'li'])

        text = '\n'.join([block.get_text(strip=True)
                         for block in text_blocks
                         if block.get_text(strip=True)])

        return {
            'title': title,
            'text': text,
            'source_type': 'web',
            'metadata': {
                'description': description,
                'text_blocks_count': len(text_blocks),
                'has_meta_description': bool(description)
            }
        }

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title using multiple methods"""
        # Try meta title first
        meta_title = soup.find('meta', property='og:title') or \
                    soup.find('meta', {'name': 'title'})
        if meta_title:
            return meta_title.get('content', '').strip()

        # Try main title tag
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.text.strip()

        # Try h1
        h1_tag = soup.find('h1')
        if h1_tag:
            return h1_tag.text.strip()

        return "Untitled Page"

    def _analyze_content_structure(self, html: str) -> Dict[str, Any]:
        """Analyze the structure of the web content"""
        soup = BeautifulSoup(html, 'html.parser')

        structure = {
            'headings': {
                'h1': len(soup.find_all('h1')),
                'h2': len(soup.find_all('h2')),
                'h3': len(soup.find_all('h3'))
            },
            'elements': {
                'paragraphs': len(soup.find_all('p')),
                'lists': len(soup.find_all(['ul', 'ol'])),
                'tables': len(soup.find_all('table')),
                'images': len(soup.find_all('img')),
                'links': len(soup.find_all('a')),
                'code_blocks': len(soup.find_all('pre'))
            },
            'metadata': {
                'has_meta_description': bool(soup.find('meta', {'name': 'description'})),
                'has_meta_keywords': bool(soup.find('meta', {'name': 'keywords'})),
                'has_favicon': bool(soup.find('link', rel='icon')),
                'has_structured_data': bool(soup.find('script', {'type': 'application/ld+json'}))
            }
        }

        return structure

    def _extract_confluence_page_id(self, html: str) -> Optional[str]:
        soup = BeautifulSoup(html, 'html.parser')
        meta_tags = soup.find_all('meta', {'name': 'ajs-page-id'})
        return meta_tags[0].get('content') if meta_tags else None

    def _extract_google_docs_metadata(self, soup: BeautifulSoup) -> str:
        last_modified = soup.find('div', class_='docs-last-modified')
        return last_modified.get_text(strip=True) if last_modified else None

    def _extract_medium_reading_time(self, soup: BeautifulSoup) -> Optional[int]:
        time_elem = soup.find('span', class_='readingTime')
        if time_elem:
            match = re.search(r'(\d+)', time_elem.get('title', ''))
            return int(match.group(1)) if match else None
        return None

    def _extract_medium_claps(self, soup: BeautifulSoup) -> Optional[int]:
        claps_elem = soup.find('span', class_='js-postMetaLockup')
        if claps_elem:
            match = re.search(r'(\d+)', claps_elem.get_text())
            return int(match.group(1)) if match else None
        return None

    def _determine_github_content_type(self, soup: BeautifulSoup) -> str:
        """Determine GitHub content type"""
        if soup.find('article', class_='markdown-body'):
            return 'readme'
        elif soup.find('div', class_=['issue-header', 'gh-header-meta']):
            return 'issue'
        elif soup.find('div', class_=['pull-request-header', 'gh-header-meta']):
            return 'pull_request'
        return 'unknown'

    def _extract_github_title(self, soup: BeautifulSoup, content_type: str) -> str:
        """Extract GitHub content title"""
        if content_type == 'readme':
            h1 = soup.find('h1')
            return h1.get_text(strip=True) if h1 else "README"
        else:
            title_elem = soup.find('span', class_='js-issue-title')
            return title_elem.get_text(strip=True) if title_elem else "Untitled"

    def _extract_github_metadata(self, soup: BeautifulSoup, content_type: str) -> Dict[str, Any]:
        """Extract GitHub-specific metadata"""
        metadata = {
            'content_type': content_type,
            'repository': self._extract_repo_info(soup)
        }

        if content_type in ['issue', 'pull_request']:
            metadata.update({
                'author': self._extract_github_author(soup),
                'created_at': self._extract_github_timestamp(soup),
                'labels': self._extract_github_labels(soup),
                'status': self._extract_github_status(soup)
            })

        return metadata

    def _extract_repo_info(self, soup: BeautifulSoup) -> Dict[str, str]:
        repo_elem = soup.find('a', class_='url fn')
        if repo_elem:
            return {
                'name': repo_elem.get_text(strip=True),
                'url': repo_elem.get('href')
            }
        return {}

    def _extract_github_author(self, soup: BeautifulSoup) -> Optional[str]:
        author_elem = soup.find('a', class_='author')
        return author_elem.get_text(strip=True) if author_elem else None

    def _extract_github_timestamp(self, soup: BeautifulSoup) -> Optional[str]:
        time_elem = soup.find('relative-time')
        return time_elem.get('datetime') if time_elem else None

    def _extract_github_labels(self, soup: BeautifulSoup) -> List[str]:
        labels = []
        for label in soup.find_all('a', class_='IssueLabel'):
            labels.append(label.get_text(strip=True))
        return labels

    def _extract_github_status(self, soup: BeautifulSoup) -> Optional[str]:
        status_elem = soup.find('span', class_=['State', 'IssueState'])
        return status_elem.get_text(strip=True) if status_elem else None

    def _determine_gitlab_content_type(self, soup: BeautifulSoup) -> str:
        """Determine GitLab content type"""
        if soup.find('article', class_='markdown-body'):
            return 'readme'
        elif soup.find('div', class_=['issue-header', 'gh-header-meta']):
            return 'issue'
        elif soup.find('div', class_=['merge-request-header', 'gh-header-meta']):
            return 'merge_request'
        return 'unknown'

    def _extract_gitlab_title(self, soup: BeautifulSoup, content_type: str) -> str:
        """Extract GitLab content title"""
        if content_type == 'readme':
            h1 = soup.find('h1')
            return h1.get_text(strip=True) if h1 else "README"
        else:
            title_elem = soup.find('span', class_='js-issue-title')
            return title_elem.get_text(strip=True) if title_elem else "Untitled"

    def _extract_gitlab_metadata(self, soup: BeautifulSoup, content_type: str) -> Dict[str, Any]:
        """Extract GitLab-specific metadata"""
        metadata = {
            'content_type': content_type,
            'repository': self._extract_repo_info(soup)
        }

        if content_type in ['issue', 'merge_request']:
            metadata.update({
                'author': self._extract_github_author(soup),
                'created_at': self._extract_github_timestamp(soup),
                'labels': self._extract_github_labels(soup),
                'status': self._extract_github_status(soup)
            })

        return metadata

    def _create_fallback_response(self, source_type: str) -> Dict[str, Any]:
        """Create fallback response when parsing fails"""
        return {
            'title': "Untitled Document",
            'text': "",
            'source_type': source_type,
            'metadata': {
                'error': 'Failed to parse content',
                'timestamp': datetime.utcnow().isoformat()
            }
        }
