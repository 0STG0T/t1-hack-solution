from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, Any, List
import json
from datetime import datetime
import logging
import numpy as np

logger = logging.getLogger(__name__)

class MongoDB:
    def __init__(self):
        self.client = AsyncIOMotorClient("mongodb://localhost:27017")
        self.db = self.client.knowledge_window
        self.documents = self.db.documents
        self.workflows = self.db.workflows
        self.vector_dimension = 384  # For paraphrase-multilingual-MiniLM-L12-v2

    async def store_document(self, document: Dict[str, Any]) -> str:
        try:
            document["created_at"] = datetime.utcnow()
            document["vector_embedding"] = json.dumps(document.get("vector_embedding", []))
            result = await self.documents.insert_one(document)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to store document: {e}")
            raise

    async def get_document(self, document_id: str) -> Dict[str, Any]:
        document = await self.documents.find_one({"_id": document_id})
        if document:
            document["_id"] = str(document["_id"])
            document["vector_embedding"] = json.loads(document["vector_embedding"])
        return document

    async def list_documents(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        try:
            cursor = self.documents.find().sort("created_at", -1).skip(skip).limit(limit)
            documents = []
            async for document in cursor:
                document["_id"] = str(document["_id"])
                document["vector_embedding"] = json.loads(document["vector_embedding"])
                documents.append(document)
            return documents
        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            raise

    async def search_similar_documents(self, query_vector: List[float], limit: int = 5) -> List[Dict[str, Any]]:
        try:
            pipeline = [
                {
                    "$addFields": {
                        "similarity": {
                            "$reduce": {
                                "input": {"$range": [0, self.vector_dimension]},
                                "initialValue": 0,
                                "in": {
                                    "$add": [
                                        "$$value",
                                        {"$multiply": [
                                            {"$arrayElemAt": [{"$fromJson": "$vector_embedding"}, "$$this"]},
                                            {"$arrayElemAt": [query_vector, "$$this"]}
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
                        "content": 1,
                        "source_type": 1,
                        "metadata": 1,
                        "created_at": 1,
                        "similarity": 1
                    }
                }
            ]

            cursor = self.documents.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            return [{**doc, "_id": str(doc["_id"])} for doc in results]
        except Exception as e:
            logger.error(f"Failed to search documents: {e}")
            raise

    async def store_workflow(self, workflow: Dict[str, Any]) -> str:
        workflow["created_at"] = datetime.utcnow()
        result = await self.workflows.insert_one(workflow)
        return str(result.inserted_id)

    async def get_workflow(self, workflow_id: str) -> Dict[str, Any]:
        workflow = await self.workflows.find_one({"_id": workflow_id})
        if workflow:
            workflow["_id"] = str(workflow["_id"])
        return workflow

    async def update_workflow(self, workflow_id: str, workflow: Dict[str, Any]) -> bool:
        result = await self.workflows.update_one(
            {"_id": workflow_id},
            {"$set": {**workflow, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

mongodb = MongoDB()
