from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import aiohttp
from sentence_transformers import SentenceTransformer
from motor.motor_asyncio import AsyncIOMotorClient
from ..security.document_security import DocumentSecurity
from datetime import datetime

class BaseProcessor(ABC):
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.security = DocumentSecurity()
        self._preview_length = 500
        self._mongodb: Optional[AsyncIOMotorClient] = None

    @property
    def mongodb(self) -> AsyncIOMotorClient:
        if not self._mongodb:
            self._mongodb = AsyncIOMotorClient('mongodb://localhost:27017')
        return self._mongodb.knowledge_window.documents

    async def process_and_store(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Process content and store in MongoDB with vector embeddings"""
        try:
            # Process content securely
            processed_result = await self.process_content(content, metadata)

            # Generate vector embedding from processed text
            vector_embedding = self.model.encode(processed_result['content']).tolist()

            # Prepare document with security
            secured_content = await self.security.secure_document(
                processed_result['content'].encode(),
                {
                    **metadata,
                    **processed_result['metadata'],
                    'content_type': self.content_type,
                    'processor': self.__class__.__name__
                }
            )

            # Store in MongoDB
            document = {
                'content': secured_content['encrypted_data']['content'],
                'metadata': secured_content['encrypted_data']['metadata'],
                'vector_embedding': vector_embedding,
                'document_id': secured_content['document_id'],
                'created_at': metadata.get('created_at', datetime.now().isoformat())
            }

            result = await self.mongodb.insert_one(document)
            return {
                'document_id': secured_content['document_id'],
                'metadata': secured_content['encrypted_data']['metadata']
            }

        except Exception as e:
            raise ValueError(f"Processing failed: {str(e)}")

    async def get_preview(self, content: bytes, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate preview with consistent format across all processors"""
        try:
            # Process content for preview
            processed_result = await self.process_content(content, metadata or {})
            preview_text = processed_result['content']

            if len(preview_text) > self._preview_length:
                preview_text = preview_text[:self._preview_length] + '...'

            return {
                'status': 'success',
                'data': {
                    'title': processed_result['metadata'].get('title', 'Untitled'),
                    'preview': preview_text,
                    'source_type': self.content_type,
                    'metadata': {
                        'total_length': len(processed_result['content']),
                        'content_type': self.content_type,
                        'processor': self.__class__.__name__,
                        **processed_result['metadata']
                    }
                }
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }

    @property
    @abstractmethod
    def content_type(self) -> str:
        """Return the content type this processor handles"""
        pass

    @abstractmethod
    async def process_content(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process the content and return standardized format:
        {
            'content': str,  # The processed text content
            'metadata': {    # Metadata about the content
                'title': str,
                'source_type': str,
                ... additional metadata
            }
        }
        """
        pass

    async def search_similar(self, text: str, limit: int = 5) -> list:
        """Search for similar documents using vector similarity"""
        query_embedding = self.model.encode(text).tolist()

        pipeline = [
            {
                "$addFields": {
                    "similarity": {
                        "$reduce": {
                            "input": {"$range": [0, {"$size": "$vector_embedding"}]},
                            "initialValue": 0,
                            "in": {
                                "$add": [
                                    "$$value",
                                    {"$multiply": [
                                        {"$arrayElemAt": ["$vector_embedding", "$$this"]},
                                        {"$arrayElemAt": [query_embedding, "$$this"]}
                                    ]}
                                ]
                            }
                        }
                    }
                }
            },
            {"$sort": {"similarity": -1}},
            {"$limit": limit},
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "text": 1,
                    "metadata": 1,
                    "similarity": 1
                }
            }
        ]

        results = []
        async for doc in self.mongodb.aggregate(pipeline):
            doc['_id'] = str(doc['_id'])
            results.append(doc)

        return results

    @staticmethod
    async def download_content(url: str) -> Optional[bytes]:
        """Download content from URL"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.read()
                    return None
        except Exception:
            return None
