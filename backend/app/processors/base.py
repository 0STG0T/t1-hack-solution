from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseProcessor(ABC):
    @abstractmethod
    async def process(self, content: Any) -> Dict[str, Any]:
        pass

class DocumentProcessor(BaseProcessor):
    async def process(self, content: bytes) -> Dict[str, Any]:
        try:
            text_content = content.decode('utf-8')
            return {
                "status": "success",
                "content": text_content,
                "metadata": {
                    "length": len(text_content),
                    "type": "text"
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }

class URLProcessor(BaseProcessor):
    async def process(self, url: str) -> Dict[str, Any]:
        return {
            "status": "success",
            "url": url,
            "metadata": {
                "type": "url"
            }
        }

class NotionProcessor(BaseProcessor):
    async def process(self, page_id: str) -> Dict[str, Any]:
        return {
            "status": "success",
            "page_id": page_id,
            "metadata": {
                "type": "notion"
            }
        }

class ConfluenceProcessor(BaseProcessor):
    async def process(self, page_id: str) -> Dict[str, Any]:
        return {
            "status": "success",
            "page_id": page_id,
            "metadata": {
                "type": "confluence"
            }
        }
