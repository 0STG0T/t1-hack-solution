from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Any, Optional
import mimetypes
from ..processors.document_processors import get_processor_for_content_type
from ..processors.integration_processors import get_integration_processor
from ..vector_store import VectorStore

router = APIRouter()

async def get_mongodb():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    try:
        yield client
    finally:
        client.close()

@router.post("/process/document")
async def process_document(
    file: UploadFile = File(...),
    mongodb: AsyncIOMotorClient = Depends(get_mongodb)
):
    try:
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
        if not content_type:
            raise HTTPException(status_code=400, detail="Could not determine file type")

        processor = get_processor_for_content_type(content_type, mongodb)
        content = await file.read()

        # Process document and store with vector embedding
        document = await processor.process_and_store(
            content,
            {"filename": file.filename, "content_type": content_type}
        )

        return {
            "status": "success",
            "document": document
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/url")
async def process_url(
    url: str = Form(...),
    mongodb: AsyncIOMotorClient = Depends(get_mongodb)
):
    try:
        # Get appropriate processor based on URL
        processor = get_integration_processor(url, mongodb)

        # Download content
        content = await processor.download_content(url)
        if not content:
            raise HTTPException(status_code=400, detail="Failed to fetch URL content")

        # Process and store content
        document = await processor.process_and_store(
            content,
            {"source_url": url, "content_type": processor.content_type}
        )

        return {
            "status": "success",
            "document": document
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_documents(
    query: str,
    limit: int = 5,
    content_type: Optional[str] = None,
    mongodb: AsyncIOMotorClient = Depends(get_mongodb)
):
    try:
        vector_store = VectorStore(mongodb)
        results = await vector_store.search_similar(
            query,
            limit=limit,
            content_type=content_type
        )

        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    mongodb: AsyncIOMotorClient = Depends(get_mongodb)
):
    try:
        vector_store = VectorStore(mongodb)
        success = await vector_store.delete_document(document_id)

        if not success:
            raise HTTPException(status_code=404, detail="Document not found")

        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
