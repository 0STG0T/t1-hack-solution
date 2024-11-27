from fastapi import APIRouter, HTTPException, WebSocket, Depends
from typing import Dict, List
from ..processors.url_processor import URLProcessor
from ..mongodb import MongoDB
from ..websocket_manager import WebSocketManager
import json

router = APIRouter()
ws_manager = WebSocketManager()

async def get_url_processor():
    mongodb = MongoDB()
    return URLProcessor(mongodb.client)

@router.post("/process")
async def process_url(url: str, processor: URLProcessor = Depends(get_url_processor)):
    try:
        # Notify connected clients about processing start
        await ws_manager.broadcast({
            "type": "url_processing",
            "status": "started",
            "url": url
        })

        # Process the URL
        document = await processor.process_url(url)

        # Notify connected clients about processing completion
        await ws_manager.broadcast({
            "type": "url_processing",
            "status": "completed",
            "url": url,
            "document_id": str(document.get("_id"))
        })

        return {
            "status": "success",
            "document_id": str(document.get("_id")),
            "title": document.get("title"),
            "source_type": document.get("source_type")
        }
    except Exception as e:
        # Notify connected clients about processing failure
        await ws_manager.broadcast({
            "type": "url_processing",
            "status": "failed",
            "url": url,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/url-processing")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "url_status":
                    # Handle status requests
                    await websocket.send_json({
                        "type": "url_status_response",
                        "status": "active"
                    })
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON message"
                })
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await ws_manager.disconnect(websocket)

@router.get("/sources")
async def get_processed_sources(processor: URLProcessor = Depends(get_url_processor)):
    try:
        # Get all processed documents from MongoDB
        documents = await processor.mongodb_client.knowledge_base.urls.find(
            {},
            {"url": 1, "title": 1, "source_type": 1, "_id": 1}
        ).to_list(length=None)

        return [{
            "id": str(doc["_id"]),
            "url": doc["url"],
            "title": doc["title"],
            "source_type": doc["source_type"]
        } for doc in documents]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
