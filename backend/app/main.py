from fastapi import FastAPI, File, UploadFile, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.processors.base import DocumentProcessor, URLProcessor, NotionProcessor, ConfluenceProcessor
import os

class URLRequest(BaseModel):
    url: str

class IntegrationRequest(BaseModel):
    page_id: str

app = FastAPI(title="Knowledge Window API")

# Minimal CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    return {
        "status": "ok",
        "message": "Knowledge Window API is running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), type: str = None):
    processor = DocumentProcessor()
    try:
        content = await file.read()
        result = await processor.process(content)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/urls/process")
async def process_url(request: URLRequest):
    processor = URLProcessor()
    try:
        result = await processor.process(request.url)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/notion/process")
async def process_notion(request: IntegrationRequest):
    processor = NotionProcessor()
    try:
        result = await processor.process(request.page_id)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/confluence/process")
async def process_confluence(request: IntegrationRequest):
    processor = ConfluenceProcessor()
    try:
        result = await processor.process(request.page_id)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Echo the received message with a processor status
            response = {"type": "message", "content": data, "status": "processed"}
            await websocket.send_json(response)
    except Exception as e:
        await websocket.close()

# Minimal server configuration
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
