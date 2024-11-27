from typing import Dict, Any, Optional
import aiohttp
from bs4 import BeautifulSoup
from .base_processor import BaseProcessor

class NotionProcessor(BaseProcessor):
    @property
    def content_type(self) -> str:
        return 'application/notion'

    async def process_content(self, content: bytes) -> Dict[str, str]:
        try:
            soup = BeautifulSoup(content, 'html.parser')

            # Extract title (look for Notion-specific elements)
            title_elem = (
                soup.find('div', {'class': ['notion-title-block']}) or
                soup.find('h1', {'class': ['notion-header']}) or
                soup.find('title')
            )
            title = title_elem.get_text(strip=True) if title_elem else "Untitled Notion Document"

            # Extract content (focus on Notion-specific content blocks)
            content_blocks = []

            # Get all Notion blocks
            blocks = soup.find_all(['div', 'p'], {
                'class': [
                    'notion-text-block',
                    'notion-header-block',
                    'notion-sub_header-block',
                    'notion-bulleted_list-block',
                    'notion-numbered_list-block',
                    'notion-toggle-block',
                    'notion-code-block',
                    'notion-quote-block'
                ]
            })

            for block in blocks:
                # Clean and append block content
                text = block.get_text(strip=True)
                if text:
                    content_blocks.append(text)

            return {
                'title': title,
                'text': '\n'.join(content_blocks)
            }

        except Exception as e:
            raise Exception(f"Notion processing failed: {str(e)}")

class ConfluenceProcessor(BaseProcessor):
    @property
    def content_type(self) -> str:
        return 'application/confluence'

    async def process_content(self, content: bytes) -> Dict[str, str]:
        try:
            soup = BeautifulSoup(content, 'html.parser')

            # Extract title (look for Confluence-specific elements)
            title_elem = (
                soup.find('h1', {'id': 'title-heading'}) or
                soup.find('title') or
                soup.find('h1', {'class': 'with-breadcrumbs'})
            )
            title = title_elem.get_text(strip=True) if title_elem else "Untitled Confluence Document"

            # Extract main content
            main_content = (
                soup.find('div', {'id': 'main-content'}) or
                soup.find('div', {'id': 'content'}) or
                soup.find('div', {'class': 'wiki-content'})
            )

            if not main_content:
                raise ValueError("Could not find main content in Confluence page")

            # Remove navigation elements and other unwanted content
            for element in main_content.find_all(['div', 'nav'], {
                'class': [
                    'conf-macro',
                    'navigation',
                    'footer',
                    'header',
                    'confluence-information-macro'
                ]
            }):
                element.decompose()

            # Extract cleaned content
            content_text = main_content.get_text(separator='\n', strip=True)

            return {
                'title': title,
                'text': content_text
            }

        except Exception as e:
            raise Exception(f"Confluence processing failed: {str(e)}")

    async def authenticate(self, url: str, credentials: Optional[Dict[str, str]] = None) -> Optional[str]:
        """Handle Confluence authentication if needed"""
        if not credentials:
            return None

        try:
            async with aiohttp.ClientSession() as session:
                auth_data = {
                    'os_username': credentials.get('username'),
                    'os_password': credentials.get('password'),
                }

                async with session.post(f"{url}/dologin.action", data=auth_data) as response:
                    if response.status == 200:
                        return response.cookies.get('JSESSIONID')

            return None

        except Exception:
            return None

def get_integration_processor(url: str, mongodb_client) -> BaseProcessor:
    """Factory function to get the appropriate integration processor"""
    if 'notion.site' in url:
        return NotionProcessor(mongodb_client)
    elif any(x in url for x in ['confluence', 'atlassian']):
        return ConfluenceProcessor(mongodb_client)
    else:
        raise ValueError(f"No integration processor available for URL: {url}")
