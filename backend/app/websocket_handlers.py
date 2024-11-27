from typing import Dict, Optional, List, Any
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import WebSocket
from .processors.document_processors import get_processor_for_content_type
from .processors.url_processor import URLProcessor
from .processors.notion_processor import NotionProcessor
from .processors.confluence_processor import ConfluenceProcessor
import json

class WebSocketHandler:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.processors: Dict[str, Any] = {}
        self.mongodb_client: Optional[AsyncIOMotorClient] = None

    async def initialize(self, mongodb_client: AsyncIOMotorClient):
        """Initialize processors with MongoDB client"""
        self.mongodb_client = mongodb_client
        self.processors = {
            'url': URLProcessor(mongodb_client),
            'document': lambda content_type: get_processor_for_content_type(content_type, mongodb_client),
            'notion': NotionProcessor(),
            'confluence': ConfluenceProcessor()
        }

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        for connection in self.active_connections.values():
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting message: {e}")

    async def handle_message(self, client_id: str, message_raw: str):
        """Handle incoming WebSocket messages"""
        try:
            message = json.loads(message_raw)
            message_type = message.get('type')
            payload = message.get('payload', {})

            if message_type == 'preview_requested':
                await self._handle_preview_request(client_id, payload)
            elif message_type in ['node_added', 'node_moved', 'node_deleted']:
                await self._handle_node_update(message_type, payload)
            elif message_type in ['connection_added', 'connection_deleted']:
                await self._handle_connection_update(message_type, payload)

        except Exception as e:
            error_message = {
                'type': 'error',
                'payload': {
                    'message': str(e),
                    'client_id': client_id
                }
            }
            await self.active_connections[client_id].send_json(error_message)

    async def _handle_preview_request(self, client_id: str, payload: Dict[str, Any]):
        """Process preview requests for different node types"""
        node_type = payload.get('nodeType')
        node_id = payload.get('nodeId')
        data = payload.get('data', {})

        try:
            preview_data = await self._process_node(node_type, data)
            response = {
                'type': 'preview_updated',
                'payload': {
                    'nodeId': node_id,
                    'preview': preview_data
                }
            }
            await self.active_connections[client_id].send_json(response)
        except Exception as e:
            error_response = {
                'type': 'preview_error',
                'payload': {
                    'nodeId': node_id,
                    'error': str(e)
                }
            }
            await self.active_connections[client_id].send_json(error_response)

    async def _process_node(self, node_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process different node types and return preview data"""
        try:
            if node_type in ['notion', 'confluence']:
                processor = self.processors[node_type]
                preview_data = await processor.get_preview(data.get('url', ''))
            elif node_type == 'url':
                processor = self.processors['url']
                preview_data = await processor.get_preview(data.get('url', ''))
            elif node_type in ['pdf', 'docx', 'txt']:
                processor = self.processors['document'](f'application/{node_type}')
                preview_data = await processor.get_preview(
                    content=data.get('content', b''),
                    metadata=data.get('metadata', {})
                )
            else:
                raise ValueError(f"Unsupported node type: {node_type}")

            if preview_data['status'] == 'error':
                raise ValueError(preview_data['error'])

            return preview_data['data']
        except Exception as e:
            raise ValueError(f"Error processing {node_type} node: {str(e)}")

    async def _handle_node_update(self, update_type: str, payload: Dict[str, Any]):
        """Handle node updates and broadcast to all clients"""
        await self.broadcast({
            'type': update_type,
            'payload': payload
        })

    async def _handle_connection_update(self, update_type: str, payload: Dict[str, Any]):
        """Handle connection updates and broadcast to all clients"""
        await self.broadcast({
            'type': update_type,
            'payload': payload
        })

websocket_handler = WebSocketHandler()
