from typing import Dict, Any, Optional, List
from bs4 import BeautifulSoup
import re
from datetime import datetime

class ConfluenceProcessorExtensions:
    @staticmethod
    def _extract_page_restrictions(soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract page viewing and editing restrictions"""
        restrictions = {
            'view': [],
            'edit': [],
            'has_restrictions': False
        }

        restriction_container = soup.find('div', class_=re.compile(r'restrictions|page-restrictions'))
        if restriction_container:
            restrictions['has_restrictions'] = True
            for restriction in restriction_container.find_all('div', class_='restriction'):
                restriction_type = 'view' if 'view' in str(restriction.get('class', [])) else 'edit'
                users = restriction.find_all('a', class_='user-mention')
                groups = restriction.find_all('a', class_='group-mention')

                restrictions[restriction_type].extend([user.get_text().strip() for user in users])
                restrictions[restriction_type].extend([group.get_text().strip() for group in groups])

        return restrictions

    @staticmethod
    def _extract_custom_properties(soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract custom page properties"""
        properties = {}

        property_list = soup.find('div', class_=re.compile(r'content-property-list'))
        if property_list:
            for prop in property_list.find_all('div', class_='content-property'):
                key = prop.find(class_='property-key')
                value = prop.find(class_='property-value')
                if key and value:
                    properties[key.get_text().strip()] = value.get_text().strip()

        return properties

    @staticmethod
    def _extract_content_properties(soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract content-specific properties"""
        properties = {
            'has_attachments': False,
            'has_comments': False,
            'has_children': False,
            'is_template': False,
            'content_status': 'current'
        }

        # Check for attachments
        if soup.find('div', class_=re.compile(r'attachments|attachment-content')):
            properties['has_attachments'] = True

        # Check for comments
        comments_section = soup.find('div', id='comments-section')
        if comments_section:
            properties['has_comments'] = True
            properties['comment_count'] = len(comments_section.find_all('div', class_='comment'))

        # Check if page is template
        if soup.find('meta', {'name': 'confluence-is-template'}):
            properties['is_template'] = True

        # Check for child pages
        if soup.find('div', class_=re.compile(r'child-pages|children-show-hide')):
            properties['has_children'] = True

        return properties

    @staticmethod
    def _extract_page_tree_position(soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract page position in the Confluence tree"""
        position = {
            'breadcrumb': [],
            'parent_page': None,
            'space': None
        }

        # Extract breadcrumb
        breadcrumb = soup.find('div', id='breadcrumb-section')
        if breadcrumb:
            for link in breadcrumb.find_all('a'):
                position['breadcrumb'].append({
                    'title': link.get_text().strip(),
                    'url': link.get('href', '')
                })

        # Extract parent page
        parent_link = soup.find('a', id='parent-page-link')
        if parent_link:
            position['parent_page'] = {
                'title': parent_link.get_text().strip(),
                'url': parent_link.get('href', '')
            }

        # Extract space information
        space_link = soup.find('a', id='space-navigation-link')
        if space_link:
            position['space'] = {
                'key': space_link.get('data-space-key', ''),
                'name': space_link.get_text().strip()
            }

        return position

    @staticmethod
    def _create_partial_response(soup: BeautifulSoup, url: str, error_message: str) -> Dict[str, Any]:
        """Create partial response when full processing fails"""
        try:
            # Extract basic content
            title = soup.find('title')
            main_content = soup.find(['div', 'article'])

            return {
                'content': main_content.get_text().strip() if main_content else '',
                'metadata': {
                    'title': title.get_text().strip() if title else 'Untitled Page',
                    'url': url,
                    'source_type': 'confluence',
                    'is_partial': True,
                    'error_message': error_message,
                    'last_processed': datetime.utcnow().isoformat()
                }
            }
        except Exception:
            # Return minimal response if even partial extraction fails
            return {
                'content': '',
                'metadata': {
                    'url': url,
                    'source_type': 'confluence',
                    'is_partial': True,
                    'error_message': error_message,
                    'last_processed': datetime.utcnow().isoformat()
                }
            }
