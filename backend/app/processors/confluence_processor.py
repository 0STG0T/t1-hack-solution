from typing import Dict, Any, Optional, List
import aiohttp
import bs4
from bs4 import BeautifulSoup
import re
from .base_processor import BaseProcessor
from ..security.document_security import DocumentSecurity
import json
from datetime import datetime

class ConfluenceProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self._preview_length = 1000  # Longer preview for web content
        self.content_selectors = {
            'title': ['h1.page-title', '.confluence-page-title'],
            'content': ['#main-content', '.wiki-content', '.confluence-content'],
            'metadata': ['.page-metadata', '.confluence-metadata']
        }

    @property
    def content_type(self) -> str:
        return 'confluence'

    async def process_content(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Process Confluence page content and extract text with metadata"""
        try:
            url = metadata.get('url')
            if not url:
                raise ValueError("Confluence URL not provided in metadata")

            html_content = content.decode('utf-8')
            soup = BeautifulSoup(html_content, 'html.parser')

            # Extract content and metadata with error handling
            try:
                title = self._extract_title(soup)
                main_content = self._extract_main_content(soup)
                page_metadata = self._extract_metadata(soup)

                # Extract page restrictions and custom properties
                restrictions = self._extract_page_restrictions(soup)
                custom_properties = self._extract_custom_properties(soup)

                # Process content blocks with enhanced error recovery
                processed_content = self._process_content_blocks(main_content)

                # Analyze document structure
                structure = self._analyze_document_structure(main_content)

                # Extract advanced features
                advanced_features = {
                    'restrictions': restrictions,
                    'custom_properties': custom_properties,
                    'content_properties': self._extract_content_properties(soup),
                    'page_tree_position': self._extract_page_tree_position(soup)
                }

                return {
                    'content': processed_content,
                    'metadata': {
                        'title': title,
                        'url': url,
                        'source_type': 'confluence',
                        'structure': structure,
                        'advanced_features': advanced_features,
                        'last_processed': self._get_current_timestamp(),
                        **page_metadata
                    }
                }
            except Exception as inner_e:
                # Attempt recovery with partial content
                return self._create_partial_response(soup, url, str(inner_e))

        except Exception as e:
            raise ValueError(f"Error processing Confluence content: {str(e)}")

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title from Confluence page"""
        for selector in self.content_selectors['title']:
            title_elem = soup.select_one(selector)
            if title_elem:
                return title_elem.get_text().strip()
        return "Untitled Confluence Page"

    def _extract_main_content(self, soup: BeautifulSoup) -> bs4.element.Tag:
        """Extract main content from Confluence page"""
        for selector in self.content_selectors['content']:
            content = soup.select_one(selector)
            if content:
                return content
        raise ValueError("Could not find main content in Confluence page")

    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract metadata from Confluence page with enhanced macro detection"""
        metadata = {}

        # Extract standard metadata
        meta_page_id = soup.find('meta', {'name': 'ajs-page-id'})
        if meta_page_id:
            metadata['page_id'] = meta_page_id.get('content')

        meta_space_key = soup.find('meta', {'name': 'ajs-space-key'})
        if meta_space_key:
            metadata['space_key'] = meta_space_key.get('content')

        # Extract author and last modified
        for selector in self.content_selectors['metadata']:
            metadata_elem = soup.select_one(selector)
            if metadata_elem:
                author_elem = metadata_elem.select_one('.author-link, .user-mention')
                if author_elem:
                    metadata['author'] = author_elem.get_text().strip()

                date_elem = metadata_elem.select_one('.date-modified, .last-modified')
                if date_elem:
                    metadata['last_modified'] = date_elem.get_text().strip()

                labels = metadata_elem.select('.label-list .label')
                if labels:
                    metadata['labels'] = [label.get_text().strip() for label in labels]

                break

        # Additional metadata
        metadata['has_attachments'] = bool(soup.find('div', class_='attachments'))
        metadata['has_comments'] = bool(soup.find('div', id='comments-section'))
        metadata['has_table_of_contents'] = bool(soup.find('div', class_='toc'))

        # Enhanced macro detection
        macro_data = self._analyze_macros(soup)
        if macro_data:
            metadata['macros'] = macro_data

        # Extract content statistics
        metadata['content_stats'] = {
            'word_count': len(soup.get_text().split()),
            'heading_count': len(soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])),
            'image_count': len(soup.find_all('img')),
            'table_count': len(soup.find_all('table')),
            'link_count': len(soup.find_all('a')),
            'code_block_count': len(soup.find_all('pre'))
        }

        # Extract version information
        version_elem = soup.find('meta', {'name': 'ajs-version-number'})
        if version_elem:
            metadata['version'] = version_elem.get('content')

        return metadata

    def _analyze_macros(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Analyze Confluence macros in detail"""
        macro_data = {
            'count': 0,
            'types': {},
            'details': []
        }

        macro_selectors = [
            'ac:structured-macro',
            'ri:structured-macro',
            'ac:placeholder',
            'ac:task-list',
            'ac:inline-task-list'
        ]

        for selector in macro_selectors:
            macros = soup.find_all(selector)
            for macro in macros:
                macro_data['count'] += 1
                macro_type = macro.get('ac:name', macro.get('ri:name', 'unknown'))
                macro_data['types'][macro_type] = macro_data['types'].get(macro_type, 0) + 1

                # Extract macro parameters
                params = {}
                for param in macro.find_all(['ac:parameter', 'ac:default-parameter']):
                    param_name = param.get('ac:name', 'default')
                    params[param_name] = param.get_text().strip()

                macro_data['details'].append({
                    'type': macro_type,
                    'parameters': params
                })

        return macro_data

    def _analyze_document_structure(self, content: bs4.element.Tag) -> Dict[str, Any]:
        """Enhanced document structure analysis"""
        structure = {
            'headings': [],
            'sections': [],
            'elements': {
                'tables': [],
                'code_blocks': [],
                'lists': [],
                'images': [],
                'links': [],
                'macros': []
            },
            'hierarchy': {
                'max_depth': 0,
                'sections_count': 0
            }
        }

        current_section = None
        current_depth = 0

        for element in content.find_all(['h1', 'h2', 'h3', 'h4', 'table', 'pre', 'ul', 'ol', 'img', 'a', 'ac:structured-macro']):
            if element.name.startswith('h'):
                level = int(element.name[1])
                text = element.get_text().strip()

                heading_info = {
                    'level': level,
                    'text': text,
                    'id': element.get('id', ''),
                    'has_anchor': bool(element.find('a', class_='anchor'))
                }
                structure['headings'].append(heading_info)

                if level > current_depth:
                    structure['hierarchy']['max_depth'] = max(structure['hierarchy']['max_depth'], level)

                if current_section:
                    structure['sections'].append(current_section)

                current_section = {
                    'heading': heading_info,
                    'content': [],
                    'subsections': []
                }
                structure['hierarchy']['sections_count'] += 1

            elif current_section:
                if element.name == 'table':
                    structure['elements']['tables'].append({
                        'rows': len(element.find_all('tr')),
                        'cols': len(element.find_all('th') or element.find_all('td'))
                    })
                elif element.name == 'pre':
                    structure['elements']['code_blocks'].append({
                        'language': element.get('class', [''])[0].replace('brush:', '').strip(),
                        'length': len(element.get_text().strip().split('\n'))
                    })
                elif element.name in ['ul', 'ol']:
                    structure['elements']['lists'].append({
                        'type': element.name,
                        'items': len(element.find_all('li'))
                    })
                elif element.name == 'img':
                    structure['elements']['images'].append({
                        'alt': element.get('alt', ''),
                        'src': element.get('src', '')
                    })
                elif element.name == 'ac:structured-macro':
                    structure['elements']['macros'].append({
                        'name': element.get('ac:name', 'unknown'),
                        'has_params': bool(element.find('ac:parameter'))
                    })

        if current_section:
            structure['sections'].append(current_section)

        return structure

    def _extract_macro_usage(self, content: bs4.element.Tag) -> Dict[str, int]:
        """Extract Confluence macro usage"""
        macros = {}
        for macro in content.find_all(['ac:structured-macro', 'ri:structured-macro']):
            macro_name = macro.get('ac:name', macro.get('ri:name', 'unknown'))
            macros[macro_name] = macros.get(macro_name, 0) + 1
        return macros

    def _process_content_blocks(self, content: bs4.element.Tag) -> str:
        """Process content blocks and convert to structured format"""
        processed_blocks = []

        # Process headers
        for header in content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            level = int(header.name[1])
            processed_blocks.append(f"{'#' * level} {header.get_text().strip()}")

        # Process paragraphs
        for para in content.find_all('p'):
            text = para.get_text().strip()
            if text:
                processed_blocks.append(text)

        # Process lists
        for list_elem in content.find_all(['ul', 'ol']):
            processed_blocks.append(self._process_list(list_elem))

        # Process code blocks
        for code in content.find_all('pre'):
            language = code.get('class', [''])[0].replace('brush:', '').strip()
            code_text = code.get_text().strip()
            processed_blocks.append(f"```{language}\n{code_text}\n```")

        # Process tables
        for table in content.find_all('table'):
            processed_blocks.append(self._process_table(table))

        return '\n\n'.join(processed_blocks)

    def _process_list(self, list_elem: bs4.element.Tag) -> str:
        """Process list elements"""
        items = []
        is_ordered = list_elem.name == 'ol'

        for i, item in enumerate(list_elem.find_all('li'), 1):
            text = item.get_text().strip()
            if is_ordered:
                items.append(f"{i}. {text}")
            else:
                items.append(f"- {text}")

        return '\n'.join(items)

    def _process_table(self, table: bs4.element.Tag) -> str:
        """Process table elements"""
        rows = []

        # Process headers
        headers = table.find_all('th')
        if headers:
            header_row = [header.get_text().strip() for header in headers]
            rows.append('| ' + ' | '.join(header_row) + ' |')
            rows.append('| ' + ' | '.join(['---'] * len(header_row)) + ' |')

        # Process data rows
        for row in table.find_all('tr'):
            cells = row.find_all(['td', 'th'])
            if cells and not (len(cells) == len(headers) and all(cell.name == 'th' for cell in cells)):
                row_data = [cell.get_text().strip() for cell in cells]
                rows.append('| ' + ' | '.join(row_data) + ' |')

        return '\n'.join(rows)

    def _clean_text(self, text: str) -> str:
        """Enhanced text cleaning and normalization"""
        # Basic cleaning
        text = re.sub(r'\s+', ' ', text)

        # Preserve Markdown syntax
        markdown_patterns = {
            r'\*\*.*?\*\*': lambda x: x.group(),  # Bold
            r'\*.*?\*': lambda x: x.group(),      # Italic
            r'\[.*?\]\(.*?\)': lambda x: x.group(), # Links
            r'`.*?`': lambda x: x.group(),        # Inline code
            r'```[\s\S]*?```': lambda x: x.group() # Code blocks
        }

        for pattern, handler in markdown_patterns.items():
            text = re.sub(pattern, handler, text)

        # Remove unwanted characters while preserving structure
        text = re.sub(r'[^\w\s\-.,?!()[\]{}\'"#*_~|`]', '', text)

        # Normalize quotes and apostrophes
        text = re.sub(r'[""]', '"', text)
        text = re.sub(r'['']', "'", text)

        return text.strip()
