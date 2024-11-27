from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
import numpy as np
from sentence_transformers import SentenceTransformer

class VectorStore:
    def __init__(self, mongodb_client: AsyncIOMotorClient):
        self.client = mongodb_client
        self.collection: AsyncIOMotorCollection = self.client.knowledge_window.documents
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    async def store_document(self, content: str, metadata: Dict[str, Any]) -> str:
        """Store document with vector embedding"""
        try:
            # Generate vector embedding
            embedding = self.model.encode(content).tolist()

            # Prepare document
            document = {
                'content': content,
                'vector_embedding': embedding,
                'metadata': metadata
            }

            # Store in MongoDB
            result = await self.collection.insert_one(document)
            return str(result.inserted_id)

        except Exception as e:
            raise Exception(f"Failed to store document: {str(e)}")

    async def search_similar(
        self,
        query: str,
        limit: int = 5,
        content_type: Optional[str] = None,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """Search for similar documents using cosine similarity"""
        try:
            # Generate query embedding
            query_embedding = self.model.encode(query).tolist()

            # Build aggregation pipeline
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
                                            {"$arrayElemAt": [query_embedding, "$$this"]}
                                        ]}
                                    ]
                                }
                            }
                        }
                    }
                }
            ]

            # Add content type filter if specified
            if content_type:
                pipeline.append({
                    "$match": {
                        "metadata.content_type": content_type
                    }
                })

            # Add similarity threshold and sort
            pipeline.extend([
                {"$match": {"similarity": {"$gt": threshold}}},
                {"$sort": {"similarity": -1}},
                {"$limit": limit},
                {
                    "$project": {
                        "_id": 1,
                        "content": 1,
                        "metadata": 1,
                        "similarity": 1
                    }
                }
            ])

            results = []
            async for doc in self.collection.aggregate(pipeline):
                doc['_id'] = str(doc['_id'])
                results.append(doc)

            return results

        except Exception as e:
            raise Exception(f"Search failed: {str(e)}")

    async def delete_document(self, document_id: str) -> bool:
        """Delete a document by ID"""
        try:
            result = await self.collection.delete_one({"_id": document_id})
            return result.deleted_count > 0
        except Exception as e:
            raise Exception(f"Failed to delete document: {str(e)}")

    async def update_document(
        self,
        document_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Update document content and/or metadata"""
        try:
            update_data = {}

            if content:
                # Generate new embedding for updated content
                embedding = self.model.encode(content).tolist()
                update_data.update({
                    'content': content,
                    'vector_embedding': embedding
                })

            if metadata:
                update_data['metadata'] = metadata

            if update_data:
                result = await self.collection.update_one(
                    {"_id": document_id},
                    {"$set": update_data}
                )
                return result.modified_count > 0

            return False

        except Exception as e:
            raise Exception(f"Failed to update document: {str(e)}")
