from typing import Dict, Type, Optional, Tuple
from .base_processor import BaseProcessor
from .pdf_processor import PDFProcessor
from .docx_processor import DOCXProcessor
from .txt_processor import TXTProcessor
from .notion_processor import NotionProcessor
from .confluence_processor import ConfluenceProcessor
from .url_processor import URLProcessor
import magic
import re
from urllib.parse import urlparse

class DocumentProcessorFactory:
    """Factory for creating and managing document processors"""

    _processors: Dict[str, Type[BaseProcessor]] = {
        'application/pdf': PDFProcessor,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': DOCXProcessor,
        'text/plain': TXTProcessor,
        'notion': NotionProcessor,
        'confluence': ConfluenceProcessor,
        'url': URLProcessor
    }

    _extension_mapping = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.text': 'text/plain',
        '.md': 'text/plain'
    }

    _url_patterns = {
        r'notion\.site': 'notion',
        r'confluence': 'confluence',
        r'http[s]?://': 'url'
    }

    _instances: Dict[str, BaseProcessor] = {}

    @classmethod
    def detect_content_type(cls, content: bytes, filename: Optional[str] = None, url: Optional[str] = None) -> Tuple[str, Dict[str, str]]:
        """Detect content type and return additional metadata"""
        metadata = {}

        # Check URL first if provided
        if url:
            domain = urlparse(url).netloc
            for pattern, processor_type in cls._url_patterns.items():
                if re.search(pattern, domain):
                    metadata['url'] = url
                    return processor_type, metadata

        # Check file extension if provided
        if filename:
            ext = cls._get_extension(filename)
            if ext in cls._extension_mapping:
                return cls._extension_mapping[ext], metadata

        # Use magic to detect MIME type
        mime_type = magic.from_buffer(content, mime=True)
        if mime_type in cls._processors:
            return mime_type, metadata

        # Default to URL processor if content looks like HTML
        if b'<!DOCTYPE html>' in content or b'<html' in content:
            return 'url', metadata

        raise ValueError("Unable to determine content type")

    @classmethod
    def get_processor(cls, content_type: str) -> BaseProcessor:
        """Get or create processor instance for content type"""
        if content_type not in cls._processors:
            raise ValueError(f"No processor available for content type: {content_type}")

        if content_type not in cls._instances:
            processor_class = cls._processors[content_type]
            cls._instances[content_type] = processor_class()

        return cls._instances[content_type]

    @classmethod
    def get_processor_for_content(cls, content: bytes, filename: Optional[str] = None, url: Optional[str] = None) -> Tuple[BaseProcessor, Dict[str, str]]:
        """Get appropriate processor based on content analysis"""
        content_type, metadata = cls.detect_content_type(content, filename, url)
        return cls.get_processor(content_type), metadata

    @classmethod
    def get_processor_for_extension(cls, file_extension: str) -> BaseProcessor:
        """Get processor based on file extension"""
        content_type = cls._extension_mapping.get(file_extension.lower())
        if not content_type:
            raise ValueError(f"Unsupported file extension: {file_extension}")

        return cls.get_processor(content_type)

    @classmethod
    def register_processor(cls, content_type: str, processor_class: Type[BaseProcessor]):
        """Register a new processor for a content type"""
        cls._processors[content_type] = processor_class
        # Clear instance if it exists to ensure new class is used
        if content_type in cls._instances:
            del cls._instances[content_type]

    @classmethod
    def supported_types(cls) -> list[str]:
        """Get list of supported content types"""
        return list(cls._processors.keys())

    @classmethod
    def supported_extensions(cls) -> list[str]:
        """Get list of supported file extensions"""
        return list(cls._extension_mapping.keys())

    @staticmethod
    def _get_extension(filename: str) -> str:
        """Extract extension from filename"""
        return re.sub(r'^.*(\.[^.]+)$', r'\1', filename.lower())

    @classmethod
    def clear_instances(cls):
        """Clear all processor instances"""
        cls._instances.clear()
