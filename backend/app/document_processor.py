from typing import Optional, Dict, Any, List
import json
from fastapi import UploadFile
import PyPDF2
import io
from docx import Document
import aiohttp
from bs4 import BeautifulSoup
from .vector_search import vector_search
from motor.motor_asyncio import AsyncIOMotorClient
import time

class DocumentProcessor:
    def __init__(self):
        self.mongodb_client = AsyncIOMotorClient("mongodb://localhost:27017")
        self.db = self.mongodb_client.knowledge_window
        self.documents = self.db.documents

    async def _process_text(self, text: str, source_type: str, title: str, source_url: Optional[str] = None) -> Dict[str, Any]:
        # Generate vector embedding for the text
        vector_embedding = vector_search.generate_embedding(text)

        document = {
            "content": text,
            "source_type": source_type,
            "title": title,
            "source_url": source_url,
            "vector_embedding": json.dumps(vector_embedding),
            "created_at": time.time()
        }

        # Store in MongoDB
        result = await self.documents.insert_one(document)
        document["_id"] = str(result.inserted_id)
        return document

    async def process_pdf(self, file: UploadFile) -> Dict[str, Any]:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return await self._process_text(text, "pdf", file.filename)

    async def process_docx(self, file: UploadFile) -> Dict[str, Any]:
        content = await file.read()
        doc = Document(io.BytesIO(content))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return await self._process_text(text, "docx", file.filename)

    async def process_txt(self, file: UploadFile) -> Dict[str, Any]:
        content = await file.read()
        text = content.decode()
        return await self._process_text(text, "txt", file.filename)

    async def process_url(self, url: str) -> Dict[str, Any]:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                # Remove script and style elements
                for script in soup(["script", "style"]):
                    script.decompose()
                text = soup.get_text()
                # Clean and process text
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = ' '.join(chunk for chunk in chunks if chunk)

                return await self._process_text(text, "url", url, url)

    async def process_notion(self, notion_url: str, notion_token: Optional[str] = None) -> Dict[str, Any]:
        try:
            async with aiohttp.ClientSession() as session:
                headers = {}
                if notion_token:
                    headers['Authorization'] = f'Bearer {notion_token}'
                async with session.get(notion_url, headers=headers) as response:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    text = soup.get_text()
                    return await self._process_text(text, "notion", notion_url, notion_url)
        except Exception:
            # Fallback to basic URL processing if Notion-specific processing fails
            return await self.process_url(notion_url)

    async def process_confluence(self, confluence_url: str, auth: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        try:
            async with aiohttp.ClientSession() as session:
                auth_tuple = None
                if auth and 'username' in auth and 'api_token' in auth:
                    auth_tuple = (auth['username'], auth['api_token'])
                async with session.get(confluence_url, auth=auth_tuple) as response:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    text = soup.get_text()
                    return await self._process_text(text, "confluence", confluence_url, confluence_url)
        except Exception:
            # Fallback to basic URL processing if Confluence-specific processing fails
            return await self.process_url(confluence_url)

    async def search_documents(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        # Fetch all documents from MongoDB
        documents = await self.documents.find().to_list(None)

        # Use vector search to find relevant documents
        results = vector_search.search_documents(query, documents, top_k=limit)

        # Clean up results for response
        for doc in results:
            doc["_id"] = str(doc["_id"])
            doc.pop("vector_embedding", None)  # Remove embedding from response

        return results

document_processor = DocumentProcessor()
