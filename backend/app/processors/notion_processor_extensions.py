from typing import Dict, Any, Optional, List
from bs4 import BeautifulSoup
import re
from datetime import datetime
import logging
from ..database.mongodb import MongoDBManager

class NotionProcessorExtensions:
    @staticmethod
    async def extract_database_content(soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract Notion database content and structure"""
        database_content = {
            'views': [],
            'properties': {},
            'rows': [],
            'filters': [],
            'sorts': []
        }

        try:
            # Extract database views
            view_headers = soup.find_all(class_=re.compile(r'notion-collection-view'))
            for view in view_headers:
                database_content['views'].append({
                    'name': view.get_text().strip(),
                    'type': NotionProcessorExtensions._determine_view_type(view),
                    'is_default': 'active' in view.get('class', [])
                })

            # Extract property columns
            property_headers = soup.find_all(class_=re.compile(r'property-.*-header'))
            for header in property_headers:
                prop_name = header.get_text().strip()
                prop_type = NotionProcessorExtensions._determine_property_type(header)
                database_content['properties'][prop_name] = {
                    'type': prop_type,
                    'options': NotionProcessorExtensions._extract_property_options(header, prop_type)
                }

            # Extract rows
            rows = soup.find_all(class_=re.compile(r'notion-collection-item'))
            for row in rows:
                row_data = NotionProcessorExtensions._extract_row_data(row, database_content['properties'])
                database_content['rows'].append(row_data)

            # Extract filters and sorts
            filter_section = soup.find(class_=re.compile(r'notion-collection-view-filter'))
            if filter_section:
                database_content['filters'] = NotionProcessorExtensions._extract_filters(filter_section)

            sort_section = soup.find(class_=re.compile(r'notion-collection-view-sort'))
            if sort_section:
                database_content['sorts'] = NotionProcessorExtensions._extract_sorts(sort_section)

            return database_content
        except Exception as e:
            logging.error(f"Error extracting database content: {str(e)}")
            return database_content

    @staticmethod
    def _determine_view_type(view: BeautifulSoup) -> str:
        """Determine the type of database view"""
        view_classes = ' '.join(view.get('class', []))
        if 'table-view' in view_classes:
            return 'table'
        elif 'board-view' in view_classes:
            return 'board'
        elif 'calendar-view' in view_classes:
            return 'calendar'
        elif 'gallery-view' in view_classes:
            return 'gallery'
        elif 'list-view' in view_classes:
            return 'list'
        return 'unknown'

    @staticmethod
    def _determine_property_type(header: BeautifulSoup) -> str:
        """Determine the type of database property"""
        type_indicators = {
            'select': ['select', 'multi-select'],
            'date': ['date', 'created-time', 'last-edited-time'],
            'person': ['person', 'created-by', 'last-edited-by'],
            'file': ['file', 'media'],
            'checkbox': ['checkbox'],
            'url': ['url'],
            'email': ['email'],
            'phone': ['phone'],
            'number': ['number'],
            'formula': ['formula'],
            'relation': ['relation'],
            'rollup': ['rollup']
        }

        header_classes = ' '.join(header.get('class', []))
        for prop_type, indicators in type_indicators.items():
            if any(indicator in header_classes for indicator in indicators):
                return prop_type
        return 'text'

    @staticmethod
    def _extract_property_options(header: BeautifulSoup, prop_type: str) -> Optional[List[Dict[str, Any]]]:
        """Extract property options for select/multi-select properties"""
        if prop_type not in ['select', 'multi-select']:
            return None

        options = []
        option_elements = header.find_all(class_=re.compile(r'select-option'))
        for option in option_elements:
            options.append({
                'name': option.get_text().strip(),
                'color': NotionProcessorExtensions._extract_option_color(option)
            })
        return options

    @staticmethod
    def _extract_option_color(option: BeautifulSoup) -> str:
        """Extract color from select option"""
        color_class = next((c for c in option.get('class', []) if 'color-' in c), None)
        return color_class.replace('color-', '') if color_class else 'default'

    @staticmethod
    def _extract_row_data(row: BeautifulSoup, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Extract data from database row"""
        row_data = {
            'id': row.get('data-block-id', ''),
            'properties': {}
        }

        for prop_name, prop_info in properties.items():
            prop_elem = row.find(class_=re.compile(f'property-{prop_name}'))
            if prop_elem:
                row_data['properties'][prop_name] = NotionProcessorExtensions._extract_property_value(
                    prop_elem,
                    prop_info['type']
                )

        return row_data

    @staticmethod
    def _extract_property_value(prop_elem: BeautifulSoup, prop_type: str) -> Any:
        """Extract value from property element based on type"""
        if prop_type == 'select':
            return prop_elem.get_text().strip()
        elif prop_type == 'multi-select':
            return [tag.get_text().strip() for tag in prop_elem.find_all(class_='multi-select-tag')]
        elif prop_type == 'date':
            return prop_elem.get('data-value', prop_elem.get_text().strip())
        elif prop_type == 'person':
            return [person.get_text().strip() for person in prop_elem.find_all(class_='notion-user')]
        elif prop_type == 'checkbox':
            return 'checked' in prop_elem.get('class', [])
        elif prop_type in ['number', 'formula']:
            try:
                return float(prop_elem.get_text().strip())
            except ValueError:
                return prop_elem.get_text().strip()
        return prop_elem.get_text().strip()

    @staticmethod
    def _extract_filters(filter_section: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract database filters"""
        filters = []
        filter_elements = filter_section.find_all(class_=re.compile(r'filter-item'))

        for filter_elem in filter_elements:
            property_elem = filter_elem.find(class_='filter-property')
            operator_elem = filter_elem.find(class_='filter-operator')
            value_elem = filter_elem.find(class_='filter-value')

            if property_elem and operator_elem:
                filters.append({
                    'property': property_elem.get_text().strip(),
                    'operator': operator_elem.get_text().strip(),
                    'value': value_elem.get_text().strip() if value_elem else None
                })

        return filters

    @staticmethod
    def _extract_sorts(sort_section: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract database sorts"""
        sorts = []
        sort_elements = sort_section.find_all(class_=re.compile(r'sort-item'))

        for sort_elem in sort_elements:
            property_elem = sort_elem.find(class_='sort-property')
            direction_elem = sort_elem.find(class_='sort-direction')

            if property_elem and direction_elem:
                sorts.append({
                    'property': property_elem.get_text().strip(),
                    'direction': 'descending' if 'descending' in direction_elem.get('class', []) else 'ascending'
                })

        return sorts
