from typing import Dict, Any, Optional
import aiohttp
from bs4 import BeautifulSoup
from .base_processor import BaseProcessor
from datetime import datetime
from urllib.parse import urlparse
import re

class GenericURLProcessor(BaseProcessor):
    @property
    def content_type(self) -> str:
        return 'text/html'

    async def process_content(self, content: bytes) -> Dict[str, Any]:
        try:
            soup = BeautifulSoup(content, 'html.parser')
            metadata = self._extract_metadata(soup)
            text_content, structure = self._extract_content(soup)

            return {
                'title': metadata['title'],
                'text': text_content,
                'metadata': metadata,
                'structure': structure,
                'success': True
            }
        except Exception as e:
            return {
                'error': f"URL processing failed: {str(e)}",
                'success': False
            }

    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        metadata = {
            'title': soup.title.string if soup.title else "Untitled Page",
            'timestamp': datetime.now().isoformat(),
            'meta_tags': {}
        }

        # Extract meta tags
        for meta in soup.find_all('meta'):
            name = meta.get('name', meta.get('property', ''))
            content = meta.get('content', '')
            if name and content:
                metadata['meta_tags'][name] = content

        return metadata

    def _extract_content(self, soup: BeautifulSoup) -> tuple[str, Dict[str, Any]]:
        # Remove unwanted elements
        for element in soup.find_all(['script', 'style', 'nav', 'footer']):
            element.decompose()

        structure = {
            'headings': [],
            'links': [],
            'images': len(soup.find_all('img')),
            'paragraphs': len(soup.find_all('p'))
        }

        # Extract headings
        for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            structure['headings'].append({
                'level': int(heading.name[1]),
                'text': heading.get_text(strip=True)
            })

        # Extract links
        for link in soup.find_all('a', href=True):
            href = link['href']
            if href.startswith(('http', 'https')):
                structure['links'].append({
                    'text': link.get_text(strip=True),
                    'url': href
                })

        main_content = soup.find('main') or soup.find('article') or \
                      soup.find('div', {'class': ['content', 'main']}) or soup.body

        return main_content.get_text(separator=' ', strip=True), structure

class NotionProcessor(GenericURLProcessor):
    @property
    def content_type(self) -> str:
        return 'application/notion'

    async def process_content(self, content: bytes) -> Dict[str, Any]:
        try:
            soup = BeautifulSoup(content, 'html.parser')
            metadata = self._extract_notion_metadata(soup)
            text_content, structure = self._extract_notion_content(soup)

            return {
                'title': metadata['title'],
                'text': text_content,
                'metadata': metadata,
                'structure': structure,
                'success': True
            }
        except Exception as e:
            return {
                'error': f"Notion processing failed: {str(e)}",
                'success': False
            }

    def _extract_notion_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        metadata = self._extract_metadata(soup)
        metadata['platform'] = 'notion'

        # Extract Notion-specific metadata
        title_elem = soup.find('div', {'class': 'notion-title'}) or \
                    soup.find('h1', {'class': ['notion-header-block']})
        metadata['title'] = title_elem.get_text(strip=True) if title_elem else "Untitled Notion Page"

        return metadata

    def _extract_notion_content(self, soup: BeautifulSoup) -> tuple[str, Dict[str, Any]]:
        structure = {
            'blocks': [],
            'databases': [],
            'images': len(soup.find_all('img')),
            'code_blocks': len(soup.find_all('pre'))
        }

        content_blocks = soup.find_all(['div', 'p'], {'class': [
            'notion-text-block',
            'notion-header-block',
            'notion-sub_header-block',
            'notion-bulleted_list-block',
            'notion-numbered_list-block'
        ]})

        text_content = []
        for block in content_blocks:
            block_text = block.get_text(strip=True)
            text_content.append(block_text)
            structure['blocks'].append({
                'type': block.get('class', [''])[0],
                'text': block_text
            })

        return ' '.join(text_content), structure

class ConfluenceProcessor(GenericURLProcessor):
    @property
    def content_type(self) -> str:
        return 'application/confluence'

    async def process_content(self, content: bytes) -> Dict[str, Any]:
        try:
            soup = BeautifulSoup(content, 'html.parser')
            metadata = self._extract_confluence_metadata(soup)
            text_content, structure = self._extract_confluence_content(soup)

            return {
                'title': metadata['title'],
                'text': text_content,
                'metadata': metadata,
                'structure': structure,
                'success': True
            }
        except Exception as e:
            return {
                'error': f"Confluence processing failed: {str(e)}",
                'success': False
            }

    def _extract_confluence_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        metadata = self._extract_metadata(soup)
        metadata['platform'] = 'confluence'

        # Extract Confluence-specific metadata
        title_elem = soup.find('h1', {'id': 'title-text'}) or soup.find('title')
        metadata['title'] = title_elem.get_text(strip=True) if title_elem else "Untitled Confluence Page"

        # Extract page info
        page_info = soup.find('div', {'class': 'page-metadata'})
        if page_info:
            metadata['page_info'] = {
                'last_modified': page_info.get('data-last-modified', ''),
                'version': page_info.get('data-version-number', ''),
                'creator': page_info.get('data-creator-name', '')
            }

        return metadata

    def _extract_confluence_content(self, soup: BeautifulSoup) -> tuple[str, Dict[str, Any]]:
        main_content = soup.find('div', {'id': 'main-content'}) or \
                      soup.find('div', {'id': 'content'})

        if not main_content:
            raise ValueError("Could not find main content in Confluence page")

        # Remove navigation and other unwanted elements
        for element in main_content.find_all(['div'], {'class': ['navigation', 'header', 'footer']}):
            element.decompose()

        structure = {
            'sections': [],
            'attachments': [],
            'comments': len(soup.find_all('div', {'class': 'comment'})),
            'tables': len(soup.find_all('table'))
        }

        # Extract sections
        for section in main_content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            structure['sections'].append({
                'level': int(section.name[1]),
                'title': section.get_text(strip=True)
            })

        # Extract attachments
        for attachment in main_content.find_all('div', {'class': 'attachment'}):
            structure['attachments'].append({
                'name': attachment.get('data-attachment-name', ''),
                'type': attachment.get('data-attachment-type', '')
            })

        return main_content.get_text(separator=' ', strip=True), structure

def get_url_processor(url: str, mongodb_client) -> BaseProcessor:
    """Factory function to get the appropriate processor for a URL"""
    if 'notion.site' in url:
        return NotionProcessor(mongodb_client)
    elif any(x in url for x in ['confluence', 'atlassian']):
        return ConfluenceProcessor(mongodb_client)
    else:
        return GenericURLProcessor(mongodb_client)
