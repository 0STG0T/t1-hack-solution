from typing import Dict, Any, Optional, List
import aiohttp
import PyPDF2
import io
from datetime import datetime
from docx import Document
from bs4 import BeautifulSoup
from motor.motor_asyncio import AsyncIOMotorClient
from sentence_transformers import SentenceTransformer
import numpy as np
from fastapi import HTTPException
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self):
        self.model = None
        self.mongo_client = None
        self.db = None
        self.collection = None

    async def initialize(self):
        """Initialize the document processor with required models and connections"""
        try:
            logger.info("Initializing document processor...")
            self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            self.mongo_client = AsyncIOMotorClient("mongodb://localhost:27017")
            self.db = self.mongo_client.knowledge_window
            self.collection = self.db.documents
            logger.info("Document processor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize document processor: {e}")
            raise HTTPException(status_code=500, detail="Failed to initialize document processor")

    async def process_pdf(self, file_bytes: bytes) -> Dict[str, Any]:
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
            return await self._process_text(text, "pdf")
        except Exception as e:
            logger.error(f"Error processing PDF: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

    async def process_docx(self, file_bytes: bytes) -> Dict[str, Any]:
        try:
            doc = Document(io.BytesIO(file_bytes))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return await self._process_text(text, "docx")
        except Exception as e:
            logger.error(f"Error processing DOCX: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing DOCX: {str(e)}")

    async def process_txt(self, text: str) -> Dict[str, Any]:
        try:
            return await self._process_text(text, "txt")
        except Exception as e:
            logger.error(f"Error processing TXT: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing TXT: {str(e)}")

    async def process_url(self, url: str) -> Dict[str, Any]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        raise HTTPException(status_code=response.status, detail="Failed to fetch URL content")
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    text = soup.get_text(separator='\n', strip=True)
                    return await self._process_text(text, "url", metadata={"source_url": url})
        except Exception as e:
            logger.error(f"Error processing URL: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing URL: {str(e)}")

    async def process_notion(self, url: str, token: Optional[str] = None) -> Dict[str, Any]:
        try:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            async with aiohttp.ClientSession(headers=headers) as session:
                async with session.get(url) as response:
                    if response.status != 200:
                        raise HTTPException(status_code=response.status, detail="Failed to fetch Notion content")
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    text = soup.get_text(separator='\n', strip=True)
                    return await self._process_text(text, "notion", metadata={
                        "source_url": url,
                        "integration_type": "notion"
                    })
        except Exception as e:
            logger.error(f"Error processing Notion page: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing Notion page: {str(e)}")

    async def process_confluence(self, url: str, auth: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        try:
            auth_tuple = (auth["username"], auth["api_token"]) if auth else None
            async with aiohttp.ClientSession() as session:
                async with session.get(url, auth=auth_tuple) as response:
                    if response.status != 200:
                        raise HTTPException(status_code=response.status, detail="Failed to fetch Confluence content")
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    text = soup.get_text(separator='\n', strip=True)
                    return await self._process_text(text, "confluence", metadata={
                        "source_url": url,
                        "integration_type": "confluence"
                    })
        except Exception as e:
            logger.error(f"Error processing Confluence page: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing Confluence page: {str(e)}")

    async def _process_text(self, text: str, source_type: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.model or not self.collection:
            await self.initialize()

        try:
            # Generate embeddings
            embeddings = self.model.encode(text)

            # Prepare document data
            doc_data = {
                "content": text,
                "source_type": source_type,
                "vector_embedding": embeddings.tolist(),
                "metadata": metadata or {},
                "created_at": datetime.utcnow(),
            }

            # Store in MongoDB
            result = await self.collection.insert_one(doc_data)
            doc_data["_id"] = str(result.inserted_id)

            return doc_data
        except Exception as e:
            logger.error(f"Error processing text: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

    async def search_documents(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        if not self.model or not self.collection:
            await self.initialize()

        try:
            # Generate query embedding
            query_embedding = self.model.encode(query)

            # Find similar documents using vector similarity
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
                                            {"$arrayElemAt": [query_embedding.tolist(), "$$this"]}
                                        ]}
                                    ]
                                }
                            }
                        }
                    }
                },
                {"$sort": {"similarity": -1}},
                {"$limit": limit},
                {"$project": {
                    "content": 1,
                    "source_type": 1,
                    "metadata": 1,
                    "created_at": 1,
                    "similarity": 1
                }}
            ]

            cursor = self.collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            return [
                {**doc, "_id": str(doc["_id"])}
                for doc in results
            ]
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            raise HTTPException(status_code=500, detail=f"Error searching documents: {str(e)}")

document_processor = DocumentProcessor()
