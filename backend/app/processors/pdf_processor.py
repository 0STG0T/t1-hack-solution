from typing import Dict, Any, Optional
import fitz  # PyMuPDF
import io
from .base_processor import BaseProcessor

class PDFProcessor(BaseProcessor):
    def __init__(self):
        super().__init__()
        self._preview_length = 500

    @property
    def content_type(self) -> str:
        return 'application/pdf'

    async def process_content(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Process PDF content and extract text with metadata"""
        try:
            # Create PDF document object from bytes
            pdf_stream = io.BytesIO(content)
            doc = fitz.open(stream=pdf_stream, filetype="pdf")

            # Extract all text content
            full_text = ""
            for page in doc:
                full_text += page.get_text()

            # Clean and normalize text
            full_text = self._clean_text(full_text)

            # Extract document info
            doc_info = {
                'title': doc.metadata.get('title', metadata.get('title', 'Untitled PDF')),
                'author': doc.metadata.get('author', 'Unknown'),
                'creation_date': doc.metadata.get('creationDate', ''),
                'modification_date': doc.metadata.get('modDate', ''),
                'page_count': len(doc),
                'producer': doc.metadata.get('producer', ''),
                'creator': doc.metadata.get('creator', '')
            }

            # Merge with provided metadata
            doc_metadata = {
                **metadata,
                **doc_info,
                'source_type': 'pdf',
                'processor_version': fitz.__version__
            }

            return {
                'content': full_text,
                'metadata': doc_metadata
            }

        except Exception as e:
            raise ValueError(f"Error processing PDF content: {str(e)}")

    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        # Remove excessive whitespace
        text = ' '.join(text.split())
        # Remove any control characters
        text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\t')
        return text.strip()

    def _extract_toc(self, doc) -> list:
        """Extract table of contents if available"""
        try:
            toc = doc.get_toc()
            return [{'level': level, 'title': title, 'page': page}
                   for level, title, page in toc]
        except:
            return []
