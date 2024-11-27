from fastapi import APIRouter, UploadFile, File, Form, HTTPException, WebSocket
from typing import Optional, List, Dict, Any
from ..processors.document_processor_factory import DocumentProcessorFactory
import json
from datetime import datetime
import os

router = APIRouter()
websocket_connections: List[WebSocket] = []

@router.post("/upload/file")
async def upload_file(
    file: UploadFile = File(...),
    metadata: Optional[str] = Form(None)
):
    try:
        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        processor = DocumentProcessorFactory.get_processor_for_extension(file_ext)

        meta_dict = json.loads(metadata) if metadata else {}
        meta_dict['original_filename'] = file.filename

        result = await processor.process_content(content, meta_dict)

        # Notify connected clients about new document
        for connection in websocket_connections:
            await connection.send_json({
                "type": "document_update",
                "document": {
                    "id": result['document_id'],
                    "filename": file.filename,
                    "type": file_ext[1:],  # Remove the dot
                    "timestamp": datetime.now().isoformat()
                }
            })

        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/url")
async def process_url(url: str = Form(...)):
    try:
        return await document_processor.process_url(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/notion")
async def process_notion(
    url: str = Form(...),
    token: Optional[str] = Form(None)
):
    try:
        return await document_processor.process_notion(url, token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process/confluence")
async def process_confluence(
    url: str = Form(...),
    username: Optional[str] = Form(None),
    api_token: Optional[str] = Form(None)
):
    try:
        auth = {"username": username, "api_token": api_token} if username and api_token else None
        return await document_processor.process_confluence(url, auth)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_documents(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    try:
        return await document_processor.search_documents(query, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "preview_request":
                try:
                    node_type = message["payload"]["node_type"]
                    node_data = message["payload"]["data"]
                    node_id = message["payload"]["nodeId"]

                    # Get appropriate processor based on node type
                    processor = DocumentProcessorFactory.get_processor(node_type)
                    preview_result = await processor.get_preview(
                        node_data.get("content", b""),
                        node_data.get("metadata", {})
                    )

                    await websocket.send_json({
                        "type": "preview_updated" if preview_result["status"] == "success" else "preview_error",
                        "nodeId": node_id,
                        "preview": preview_result.get("data"),
                        "error": preview_result.get("error")
                    })

                except Exception as e:
                    await websocket.send_json({
                        "type": "preview_error",
                        "nodeId": message["payload"]["nodeId"],
                        "error": str(e)
                    })

            elif message.get("type") == "search":
                results = await document_processor.search_documents(
                    message["query"],
                    message.get("limit", 5)
                )
                await websocket.send_json({
                    "type": "search_results",
                    "results": results
                })

            elif message.get("type") == "node_update":
                # Broadcast node updates to all connected clients except sender
                for connection in websocket_connections:
                    if connection != websocket:
                        await connection.send_json({
                            "type": "node_update",
                            "node": message["node"]
                        })

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)
        await websocket.close()
