from typing import Dict, Any, Optional
import io
from .base_processor import BaseProcessor

class TXTProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self._preview_length = 500

    @property
    def content_type(self) -> str:
        return 'text/plain'

    async def process_content(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Process TXT content and extract text with metadata"""
        try:
            # Decode text content with fallback encodings
            text_content = None
            encodings = ['utf-8', 'latin-1', 'cp1252']

            for encoding in encodings:
                try:
                    text_content = content.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue

            if text_content is None:
                raise ValueError("Unable to decode text content with supported encodings")

            # Clean and normalize text
            text_content = self._clean_text(text_content)

            # Calculate document statistics
            lines = text_content.split('\n')
            words = text_content.split()

            # Extract title from first line or metadata
            title = metadata.get('title')
            if not title:
                first_line = lines[0].strip() if lines else ''
                title = first_line if len(first_line) <= 50 else "Untitled Text Document"

            # Prepare document metadata
            doc_info = {
                'title': title,
                'line_count': len(lines),
                'word_count': len(words),
                'char_count': len(text_content),
                'avg_line_length': sum(len(line) for line in lines) / len(lines) if lines else 0,
                'encoding': 'utf-8',  # We convert everything to UTF-8
                'has_unicode': any(ord(char) > 127 for char in text_content)
            }

            # Merge with provided metadata
            doc_metadata = {
                **metadata,
                **doc_info,
                'source_type': 'txt'
            }

            return {
                'content': text_content,
                'metadata': doc_metadata
            }

        except Exception as e:
            raise ValueError(f"Error processing TXT content: {str(e)}")

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text content"""
        # Normalize line endings
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        # Remove null bytes and other control characters
        text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')

        # Remove excessive blank lines
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(line for line in lines if line)

        return text
