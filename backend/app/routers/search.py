from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from ..vector_search import VectorSearch
from motor.motor_asyncio import AsyncIOMotorClient
from ..websocket_manager import WebSocketManager
from pydantic import BaseModel

router = APIRouter()
ws_manager = WebSocketManager()

class SearchQuery(BaseModel):
    query: str
    limit: int = 5

async def get_vector_search():
    # Use the existing MongoDB client from the app state
    from ..main import app
    return VectorSearch(app.state.mongodb)

@router.post("/similarity")
async def search_similar_documents(
    search_query: SearchQuery,
    search_service: VectorSearch = Depends(get_vector_search)
) -> List[Dict[str, Any]]:
    """
    Search for similar documents across all collections using vector similarity
    """
    try:
        results = await search_service.search_cross_collection(
            search_query.query,
            search_query.limit
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents")
async def search_documents(
    query: str,
    collection: str = "documents",
    limit: int = 5,
    search_service: VectorSearch = Depends(get_vector_search)
) -> List[Dict[str, Any]]:
    """
    Search for similar documents within a specific collection
    """
    try:
        results = await search_service.search_similar(query, collection, limit)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-embeddings")
async def generate_batch_embeddings(
    texts: List[str],
    search_service: VectorSearch = Depends(get_vector_search)
) -> List[List[float]]:
    """
    Generate embeddings for multiple texts in batch
    """
    try:
        embeddings = await search_service.batch_generate_embeddings(texts)
        return embeddings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update-embedding/{document_id}")
async def update_document_embedding(
    document_id: str,
    text: str,
    collection: str,
    search_service: VectorSearch = Depends(get_vector_search)
):
    """
    Update the vector embedding for a specific document
    """
    try:
        await search_service.update_document_embedding(document_id, text, collection)
        return {"status": "success", "message": "Embedding updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
