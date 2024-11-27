from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any, Optional
import json
import asyncio
from datetime import datetime

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, client_id: str, metadata: Optional[Dict[str, Any]] = None):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.connection_metadata[client_id] = {
            'connected_at': datetime.utcnow().isoformat(),
            'last_activity': datetime.utcnow().isoformat(),
            'metadata': metadata or {}
        }

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.connection_metadata:
            del self.connection_metadata[client_id]

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        message = {
            'type': event_type,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }

        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
                self.connection_metadata[client_id]['last_activity'] = datetime.utcnow().isoformat()
            except WebSocketDisconnect:
                disconnected_clients.append(client_id)
            except Exception as e:
                print(f"Error sending message to client {client_id}: {str(e)}")
                disconnected_clients.append(client_id)

        for client_id in disconnected_clients:
            self.disconnect(client_id)

    async def send_personal_message(self, client_id: str, event_type: str, data: Dict[str, Any]):
        if client_id not in self.active_connections:
            return

        message = {
            'type': event_type,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }

        try:
            await self.active_connections[client_id].send_json(message)
            self.connection_metadata[client_id]['last_activity'] = datetime.utcnow().isoformat()
        except WebSocketDisconnect:
            self.disconnect(client_id)
        except Exception as e:
            print(f"Error sending personal message to client {client_id}: {str(e)}")
            self.disconnect(client_id)

    async def broadcast_to_group(self, group: str, event_type: str, data: Dict[str, Any]):
        message = {
            'type': event_type,
            'data': data,
            'timestamp': datetime.utcnow().isoformat()
        }

        disconnected_clients = []
        for client_id, metadata in self.connection_metadata.items():
            if group in metadata.get('metadata', {}).get('groups', []):
                try:
                    await self.active_connections[client_id].send_json(message)
                    metadata['last_activity'] = datetime.utcnow().isoformat()
                except WebSocketDisconnect:
                    disconnected_clients.append(client_id)
                except Exception as e:
                    print(f"Error broadcasting to group member {client_id}: {str(e)}")
                    disconnected_clients.append(client_id)

        for client_id in disconnected_clients:
            self.disconnect(client_id)

    def get_active_connections_count(self) -> int:
        return len(self.active_connections)

    def get_client_metadata(self, client_id: str) -> Optional[Dict[str, Any]]:
        return self.connection_metadata.get(client_id)

    async def cleanup_inactive_connections(self, max_inactive_minutes: int = 30):
        while True:
            current_time = datetime.utcnow()
            disconnected_clients = []

            for client_id, metadata in self.connection_metadata.items():
                last_activity = datetime.fromisoformat(metadata['last_activity'])
                inactive_minutes = (current_time - last_activity).total_seconds() / 60

                if inactive_minutes > max_inactive_minutes:
                    disconnected_clients.append(client_id)

            for client_id in disconnected_clients:
                self.disconnect(client_id)

            await asyncio.sleep(60)  # Check every minute

manager = WebSocketManager()

# Start cleanup task
asyncio.create_task(manager.cleanup_inactive_connections())
