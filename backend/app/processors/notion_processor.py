from typing import Dict, Any, Optional, List
import aiohttp
import bs4
from bs4 import BeautifulSoup
import re
from .base_processor import BaseProcessor
from ..security.document_security import DocumentSecurity
import json
from datetime import datetime

class NotionProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self._preview_length = 1000
        self.supported_blocks = {
            'notion-text-block': self._process_text_block,
            'notion-header-block': self._process_header_block,
            'notion-list-block': self._process_list_block,
            'notion-code-block': self._process_code_block,
            'notion-quote-block': self._process_quote_block,
            'notion-table-block': self._process_table_block,
            'notion-callout-block': self._process_callout_block,
            'notion-toggle-block': self._process_toggle_block,
            'notion-equation-block': self._process_equation_block
        }

    @property
    def content_type(self) -> str:
        return 'notion'

    async def process_content(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Process Notion page content and extract text with metadata"""
        try:
            url = metadata.get('url')
            if not url:
                raise ValueError("Notion URL not provided in metadata")

            html_content = content.decode('utf-8')
            soup = BeautifulSoup(html_content, 'html.parser')

            try:
                # Detect if this is a database page
                is_database = bool(soup.find('div', class_=re.compile(r'notion-collection')))

                if is_database:
                    from .notion_processor_extensions import NotionProcessorExtensions
                    database_content = await NotionProcessorExtensions.extract_database_content(soup)
                    return {
                        'content': self._process_database_content(database_content),
                        'metadata': {
                            'url': url,
                            'source_type': 'notion_database',
                            'database_structure': database_content,
                            'last_processed': self._get_current_timestamp()
                        }
                    }

                # Regular page processing
                title = self._extract_title(soup)
                content_blocks = self._extract_content_blocks(soup)
                processed_content = self._process_blocks(content_blocks)
                block_types = self._analyze_block_types(content_blocks)
                structure = self._analyze_document_structure(content_blocks)

                return {
                    'content': processed_content,
                    'metadata': {
                        'title': title,
                        'url': url,
                        'source_type': 'notion_page',
                        'block_count': len(content_blocks),
                        'block_types': block_types,
                        'structure': structure,
                        'has_table_of_contents': self._has_table_of_contents(soup),
                        'last_processed': self._get_current_timestamp()
                    }
                }

            except Exception as inner_e:
                logging.error(f"Error processing Notion content structure: {str(inner_e)}")
                # Attempt recovery with basic content extraction
                return self._create_basic_response(soup, url, str(inner_e))

        except Exception as e:
            logging.error(f"Error processing Notion content: {str(e)}")
            raise ValueError(f"Error processing Notion content: {str(e)}")

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title from Notion page"""
        title_elem = soup.find('h1', class_=re.compile(r'notion-title'))
        if not title_elem:
            title_elem = soup.find('div', class_=re.compile(r'notion-page-title'))
        return title_elem.get_text().strip() if title_elem else "Untitled Notion Page"

    def _extract_content_blocks(self, soup: BeautifulSoup) -> list:
        """Extract content blocks from Notion page with enhanced nested block support"""
        content_blocks = []
        main_content = soup.find('div', class_=re.compile(r'notion-page-content'))

        if main_content:
            blocks = main_content.find_all(['div', 'p', 'pre', 'figure'], class_=re.compile(r'notion-'))
            current_parent = None
            nesting_level = 0

            for block in blocks:
                block_type = self._determine_block_type(block)
                if block_type:
                    block_data = {
                        'type': block_type,
                        'element': block,
                        'metadata': self._extract_block_metadata(block),
                        'nesting_level': nesting_level,
                        'children': []
                    }

                    # Check for nested content
                    if 'notion-sub-block' in block.get('class', []):
                        nesting_level += 1
                        if current_parent:
                            current_parent['children'].append(block_data)
                        continue

                    if nesting_level > 0:
                        nesting_level = 0
                        current_parent = None

                    content_blocks.append(block_data)
                    if block_type in ['notion-toggle-block', 'notion-callout-block']:
                        current_parent = block_data

        return content_blocks

    def _determine_block_type(self, block: bs4.element.Tag) -> Optional[str]:
        """Determine the type of Notion block"""
        classes = block.get('class', [])
        class_str = ' '.join(classes)

        block_types = {
            r'text-block': 'notion-text-block',
            r'h[1-3]': 'notion-header-block',
            r'bulleted-list|numbered-list': 'notion-list-block',
            r'code-block': 'notion-code-block',
            r'quote-block': 'notion-quote-block',
            r'collection-table': 'notion-table-block',
            r'callout-block': 'notion-callout-block',
            r'toggle-block': 'notion-toggle-block',
            r'equation-block': 'notion-equation-block'
        }

        for pattern, block_type in block_types.items():
            if re.search(pattern, class_str):
                return block_type

        return None

    def _extract_block_metadata(self, block: bs4.element.Tag) -> Dict[str, Any]:
        """Extract enhanced block metadata"""
        metadata = {}

        # Basic metadata
        block_id = block.get('data-block-id')
        if block_id:
            metadata['block_id'] = block_id

        # Enhanced metadata extraction
        metadata.update({
            'has_children': bool(block.find(class_=re.compile(r'notion-sub-block'))),
            'style_data': self._extract_style_data(block),
            'attributes': self._extract_block_attributes(block),
            'interactive_elements': self._extract_interactive_elements(block)
        })

        # Content-specific metadata
        if 'code-block' in str(block.get('class', [])):
            metadata['language'] = block.get('data-language', '')
            metadata['has_line_numbers'] = bool(block.find(class_='line-numbers'))
        elif 'equation-block' in str(block.get('class', [])):
            metadata['equation'] = block.get('data-equation', '')
            metadata['equation_type'] = 'display'  # or 'inline'
        elif 'callout-block' in str(block.get('class', [])):
            icon_elem = block.find(class_='notion-emoji')
            if icon_elem:
                metadata['icon'] = icon_elem.get_text()
                metadata['icon_type'] = 'emoji'

        return metadata

    def _extract_style_data(self, block: bs4.element.Tag) -> Dict[str, Any]:
        """Extract style information from block"""
        style_data = {}

        # Extract color information
        color_class = next((c for c in block.get('class', []) if 'color-' in c), None)
        if color_class:
            style_data['color'] = color_class.replace('color-', '')

        # Extract background color
        bg_class = next((c for c in block.get('class', []) if 'background-' in c), None)
        if bg_class:
            style_data['background'] = bg_class.replace('background-', '')

        return style_data

    def _extract_block_attributes(self, block: bs4.element.Tag) -> Dict[str, Any]:
        """Extract block-specific attributes"""
        attributes = {}

        # Extract data attributes
        for attr in block.attrs:
            if attr.startswith('data-'):
                attributes[attr.replace('data-', '')] = block[attr]

        return attributes

    def _extract_interactive_elements(self, block: bs4.element.Tag) -> Dict[str, Any]:
        """Extract interactive elements from block"""
        elements = {
            'links': [],
            'mentions': [],
            'checkboxes': []
        }

        # Process links
        for link in block.find_all('a'):
            elements['links'].append({
                'text': link.get_text(),
                'href': link.get('href'),
                'type': 'external' if link.get('href', '').startswith('http') else 'internal'
            })

        # Process mentions
        for mention in block.find_all(class_=re.compile(r'notion-mention')):
            elements['mentions'].append({
                'text': mention.get_text(),
                'type': self._determine_mention_type(mention)
            })

        # Process checkboxes
        for checkbox in block.find_all(class_=re.compile(r'notion-checkbox')):
            elements['checkboxes'].append({
                'checked': 'checked' in checkbox.get('class', []),
                'text': checkbox.parent.get_text().replace('☐', '').replace('☑', '').strip()
            })

        return elements

    def _determine_mention_type(self, mention: bs4.element.Tag) -> str:
        """Determine the type of a mention element"""
        classes = mention.get('class', [])
        if any('user' in c for c in classes):
            return 'user'
        elif any('page' in c for c in classes):
            return 'page'
        elif any('date' in c for c in classes):
            return 'date'
        return 'unknown'

    def _analyze_block_types(self, blocks: list) -> Dict[str, int]:
        """Analyze the frequency of different block types"""
        type_counts = {}
        for block in blocks:
            block_type = block['type']
            type_counts[block_type] = type_counts.get(block_type, 0) + 1
        return type_counts

    def _analyze_document_structure(self, blocks: list) -> Dict[str, Any]:
        """Analyze the document structure"""
        structure = {
            'headings': [],
            'sections': [],
            'depth': 0,
            'blocks': {
                'total': len(blocks),
                'by_type': {},
                'has_equations': False,
                'has_code': False,
                'has_tables': False
            }
        }

        current_section = None
        for block in blocks:
            block_type = block['type']
            structure['blocks']['by_type'][block_type] = structure['blocks']['by_type'].get(block_type, 0) + 1

            if block_type == 'notion-header-block':
                heading = self._process_header_block(block['element'])
                level = heading.count('#')
                structure['depth'] = max(structure['depth'], level)

                heading_info = {
                    'level': level,
                    'text': heading.replace('#', '').strip(),
                    'metadata': block.get('metadata', {})
                }
                structure['headings'].append(heading_info)

                if current_section:
                    structure['sections'].append(current_section)
                current_section = {
                    'heading': heading_info,
                    'blocks': [],
                    'content_types': set()
                }
            elif current_section:
                current_section['blocks'].append({
                    'type': block_type,
                    'metadata': block.get('metadata', {})
                })
                current_section['content_types'].add(block_type)

            # Track special content types
            if block_type == 'notion-equation-block':
                structure['blocks']['has_equations'] = True
            elif block_type == 'notion-code-block':
                structure['blocks']['has_code'] = True
            elif block_type == 'notion-table-block':
                structure['blocks']['has_tables'] = True

        if current_section:
            structure['sections'].append(current_section)

        return structure

    def _has_table_of_contents(self, soup: BeautifulSoup) -> bool:
        """Check if the document has a table of contents"""
        toc_indicators = [
            'table of contents',
            'contents',
            'toc'
        ]

        for indicator in toc_indicators:
            if soup.find(string=re.compile(indicator, re.IGNORECASE)):
                return True
        return False

    def _process_blocks(self, blocks: list) -> str:
        """Process all content blocks and combine into final content"""
        processed_content = []

        for block in blocks:
            block_type = block['type']
            if block_type in self.supported_blocks:
                processed_block = self.supported_blocks[block_type](block['element'])
                if processed_block:
                    processed_content.append(processed_block)

        return '\n\n'.join(processed_content)

    def _process_text_block(self, block: bs4.element.Tag) -> str:
        """Process text block"""
        return block.get_text().strip()

    def _process_header_block(self, block: bs4.element.Tag) -> str:
        """Process header block"""
        level = 1
        for class_name in block.get('class', []):
            if 'h2' in class_name:
                level = 2
            elif 'h3' in class_name:
                level = 3

        return f"{'#' * level} {block.get_text().strip()}"

    def _process_list_block(self, block: bs4.element.Tag) -> str:
        """Process list block"""
        is_numbered = 'numbered-list' in block.get('class', [])
        items = block.find_all('li')

        processed_items = []
        for i, item in enumerate(items, 1):
            text = item.get_text().strip()
            if is_numbered:
                processed_items.append(f"{i}. {text}")
            else:
                processed_items.append(f"- {text}")

        return '\n'.join(processed_items)

    def _process_code_block(self, block: bs4.element.Tag) -> str:
        """Process code block"""
        code = block.get_text().strip()
        language = block.get('data-language', '')
        return f"```{language}\n{code}\n```"

    def _process_quote_block(self, block: bs4.element.Tag) -> str:
        """Process quote block"""
        return f"> {block.get_text().strip()}"

    def _process_table_block(self, block: bs4.element.Tag) -> str:
        """Process table block"""
        rows = []
        for row in block.find_all('tr'):
            cells = [cell.get_text().strip() for cell in row.find_all(['td', 'th'])]
            rows.append(' | '.join(cells))
        return '\n'.join(rows)

    def _process_callout_block(self, block: bs4.element.Tag) -> str:
        """Process callout block"""
        icon = block.find(class_='notion-emoji')
        icon_text = icon.get_text() if icon else ''
        content = block.get_text().replace(icon_text, '', 1).strip()
        return f"> {icon_text} {content}"

    def _process_toggle_block(self, block: bs4.element.Tag) -> str:
        """Process toggle block"""
        summary = block.find(class_='notion-toggle-summary')
        content = block.find(class_='notion-toggle-content')

        if summary and content:
            return f"<details>\n<summary>{summary.get_text().strip()}</summary>\n{content.get_text().strip()}\n</details>"
        return ""

    def _process_equation_block(self, block: bs4.element.Tag) -> str:
        """Process equation block"""
        equation = block.get('data-equation', '')
        return f"$$\n{equation}\n$$"

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Preserve important punctuation while removing special characters
        text = re.sub(r'[^\w\s\-.,?!()[\]{}\'\"]+', '', text)
        # Normalize quotes
        text = re.sub(r'[""]', '"', text)
        text = re.sub(r'['']', "'", text)
        return text.strip()
