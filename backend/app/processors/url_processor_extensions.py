from typing import Dict, Any, Optional, List
from bs4 import BeautifulSoup
import re
import logging
from datetime import datetime

class URLProcessorExtensions:
    @staticmethod
    async def _parse_google_docs(html: str) -> Dict[str, Any]:
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
                    'last_modified': URLProcessorExtensions._extract_google_docs_metadata(soup)
                }
            }
        except Exception as e:
            logging.error(f"Error parsing Google Docs content: {str(e)}")
            return URLProcessorExtensions._create_fallback_response("google_docs")

    @staticmethod
    async def _parse_medium(html: str) -> Dict[str, Any]:
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
                    'reading_time': URLProcessorExtensions._extract_medium_reading_time(soup),
                    'claps': URLProcessorExtensions._extract_medium_claps(soup)
                }
            }
        except Exception as e:
            logging.error(f"Error parsing Medium content: {str(e)}")
            return URLProcessorExtensions._create_fallback_response("medium")

    @staticmethod
    async def _parse_github(html: str) -> Dict[str, Any]:
        """Parse GitHub content"""
        try:
            soup = BeautifulSoup(html, 'html.parser')

            # Detect content type (README, Issue, PR, etc.)
            content_type = URLProcessorExtensions._determine_github_content_type(soup)

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
                'title': URLProcessorExtensions._extract_github_title(soup, content_type),
                'text': '\n\n'.join(text_blocks),
                'source_type': f'github_{content_type}',
                'metadata': URLProcessorExtensions._extract_github_metadata(soup, content_type)
            }
        except Exception as e:
            logging.error(f"Error parsing GitHub content: {str(e)}")
            return URLProcessorExtensions._create_fallback_response("github")

    @staticmethod
    def _determine_github_content_type(soup: BeautifulSoup) -> str:
        """Determine GitHub content type"""
        if soup.find('article', class_='markdown-body'):
            return 'readme'
        elif soup.find('div', class_=['issue-header', 'gh-header-meta']):
            return 'issue'
        elif soup.find('div', class_=['pull-request-header', 'gh-header-meta']):
            return 'pull_request'
        return 'unknown'

    @staticmethod
    def _extract_github_title(soup: BeautifulSoup, content_type: str) -> str:
        """Extract GitHub content title"""
        if content_type == 'readme':
            h1 = soup.find('h1')
            return h1.get_text(strip=True) if h1 else "README"
        else:
            title_elem = soup.find('span', class_='js-issue-title')
            return title_elem.get_text(strip=True) if title_elem else "Untitled"

    @staticmethod
    def _extract_github_metadata(soup: BeautifulSoup, content_type: str) -> Dict[str, Any]:
        """Extract GitHub-specific metadata"""
        metadata = {
            'content_type': content_type,
            'repository': URLProcessorExtensions._extract_repo_info(soup)
        }

        if content_type in ['issue', 'pull_request']:
            metadata.update({
                'author': URLProcessorExtensions._extract_github_author(soup),
                'created_at': URLProcessorExtensions._extract_github_timestamp(soup),
                'labels': URLProcessorExtensions._extract_github_labels(soup),
                'status': URLProcessorExtensions._extract_github_status(soup)
            })

        return metadata

    @staticmethod
    def _create_fallback_response(source_type: str) -> Dict[str, Any]:
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

    # Helper methods for metadata extraction
    @staticmethod
    def _extract_google_docs_metadata(soup: BeautifulSoup) -> str:
        last_modified = soup.find('div', class_='docs-last-modified')
        return last_modified.get_text(strip=True) if last_modified else None

    @staticmethod
    def _extract_medium_reading_time(soup: BeautifulSoup) -> Optional[int]:
        time_elem = soup.find('span', class_='readingTime')
        if time_elem:
            match = re.search(r'(\d+)', time_elem.get('title', ''))
            return int(match.group(1)) if match else None
        return None

    @staticmethod
    def _extract_medium_claps(soup: BeautifulSoup) -> Optional[int]:
        claps_elem = soup.find('span', class_='js-postMetaLockup')
        if claps_elem:
            match = re.search(r'(\d+)', claps_elem.get_text())
            return int(match.group(1)) if match else None
        return None

    @staticmethod
    def _extract_repo_info(soup: BeautifulSoup) -> Dict[str, str]:
        repo_elem = soup.find('a', class_='url fn')
        if repo_elem:
            return {
                'name': repo_elem.get_text(strip=True),
                'url': repo_elem.get('href')
            }
        return {}

    @staticmethod
    def _extract_github_author(soup: BeautifulSoup) -> Optional[str]:
        author_elem = soup.find('a', class_='author')
        return author_elem.get_text(strip=True) if author_elem else None

    @staticmethod
    def _extract_github_timestamp(soup: BeautifulSoup) -> Optional[str]:
        time_elem = soup.find('relative-time')
        return time_elem.get('datetime') if time_elem else None

    @staticmethod
    def _extract_github_labels(soup: BeautifulSoup) -> List[str]:
        labels = []
        for label in soup.find_all('a', class_='IssueLabel'):
            labels.append(label.get_text(strip=True))
        return labels

    @staticmethod
    def _extract_github_status(soup: BeautifulSoup) -> Optional[str]:
        status_elem = soup.find('span', class_=['State', 'IssueState'])
        return status_elem.get_text(strip=True) if status_elem else None
