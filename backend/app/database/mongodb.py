from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, TEXT, IndexModel
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json

class MongoDBManager:
    def __init__(self, connection_url: str = "mongodb://localhost:27017"):
        self.client = AsyncIOMotorClient(connection_url)
        self.db = self.client.knowledge_window
        self.documents = self.db.documents
        self.vectors = self.db.vectors
        self.setup_indexes()

    async def setup_indexes(self):
        """Setup MongoDB indexes for optimized queries"""
        # Document indexes
        await self.documents.create_index([("title", TEXT), ("content", TEXT)])
        await self.documents.create_index([("created_at", ASCENDING)])
        await self.documents.create_index([("document_type", ASCENDING)])
        await self.documents.create_index([("metadata.source_type", ASCENDING)])
        await self.documents.create_index([("metadata.tags", ASCENDING)])

        # Vector indexes
        await self.vectors.create_index([("document_id", ASCENDING)])
        await self.vectors.create_index([("embedding", "2dsphere")])
        await self.vectors.create_index([("metadata.source_type", ASCENDING)])

    async def store_document_batch(self, documents: List[Dict[str, Any]]) -> List[str]:
        """Store multiple documents in a single operation"""
        for doc in documents:
            doc["created_at"] = datetime.utcnow()
        result = await self.documents.insert_many(documents)
        return [str(id) for id in result.inserted_ids]

    async def store_document(self, document: Dict[str, Any]) -> str:
        """Store a single document with enhanced metadata"""
        document["created_at"] = datetime.utcnow()
        document["updated_at"] = datetime.utcnow()

        # Ensure metadata exists
        if "metadata" not in document:
            document["metadata"] = {}

        # Add processing metadata
        document["metadata"].update({
            "processed_at": datetime.utcnow().isoformat(),
            "word_count": len(document.get("content", "").split()),
            "has_vectors": False
        })

        result = await self.documents.insert_one(document)
        return str(result.inserted_id)

    async def store_vector_batch(self, vectors: List[Tuple[str, List[float], Dict[str, Any]]]) -> List[str]:
        """Store multiple vectors in a single operation"""
        vector_docs = [
            {
                "document_id": doc_id,
                "embedding": self._prepare_vector_for_storage(embedding),
                "metadata": metadata,
                "created_at": datetime.utcnow()
            }
            for doc_id, embedding, metadata in vectors
        ]
        result = await self.vectors.insert_many(vector_docs)
        return [str(id) for id in result.inserted_ids]

    async def store_vector(self, document_id: str, embedding: List[float], metadata: Dict[str, Any]) -> str:
        """Store vector with enhanced metadata tracking"""
        vector_doc = {
            "document_id": document_id,
            "embedding": self._prepare_vector_for_storage(embedding),
            "metadata": metadata,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = await self.vectors.insert_one(vector_doc)

        # Update document to mark it as having vectors
        await self.documents.update_one(
            {"_id": document_id},
            {"$set": {"metadata.has_vectors": True}}
        )

        return str(result.inserted_id)

    def _prepare_vector_for_storage(self, embedding: List[float]) -> Dict[str, Any]:
        """Convert embedding vector to MongoDB 2dsphere format"""
        normalized = self._normalize_vector(embedding)
        return {
            "type": "Point",
            "coordinates": [
                normalized[0] * 180,  # Convert to longitude (-180 to 180)
                normalized[1] * 90    # Convert to latitude (-90 to 90)
            ]
        }

    def _normalize_vector(self, vector: List[float]) -> List[float]:
        """Normalize vector to unit length"""
        array = np.array(vector)
        norm = np.linalg.norm(array)
        if norm == 0:
            return [0.0] * len(vector)
        return (array / norm).tolist()

    async def search_similar_vectors(self, query_embedding: List[float], limit: int = 10,
                                   filters: Optional[Dict[str, Any]] = None,
                                   min_similarity: float = 0.7) -> List[Dict[str, Any]]:
        """Enhanced vector search with similarity threshold and metadata filtering"""
        normalized_query = self._prepare_vector_for_storage(query_embedding)

        # Build pipeline with optional filters
        match_stage = {"$match": filters} if filters else None

        pipeline = [
            {
                "$geoNear": {
                    "near": normalized_query,
                    "distanceField": "distance",
                    "spherical": True,
                    "limit": limit * 2  # Fetch more to account for filtered results
                }
            }
        ]

        if match_stage:
            pipeline.append(match_stage)

        pipeline.extend([
            {
                "$lookup": {
                    "from": "documents",
                    "localField": "document_id",
                    "foreignField": "_id",
                    "as": "document"
                }
            },
            {"$unwind": "$document"},
            {
                "$addFields": {
                    "similarity": {
                        "$subtract": [1, {"$divide": ["$distance", 3.14159]}]
                    }
                }
            },
            {
                "$match": {
                    "similarity": {"$gte": min_similarity}
                }
            },
            {"$limit": limit},
            {
                "$project": {
                    "document": 1,
                    "similarity": 1,
                    "metadata": 1,
                    "_id": 0
                }
            }
        ])

        results = []
        async for doc in self.vectors.aggregate(pipeline):
            results.append(doc)
        return results

    async def get_documents_batch(self, document_ids: List[str]) -> List[Dict[str, Any]]:
        """Retrieve multiple documents by their IDs"""
        cursor = self.documents.find({"_id": {"$in": document_ids}})
        return [doc async for doc in cursor]

    async def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        return await self.documents.find_one({"_id": document_id})

    async def update_document(self, document_id: str, updates: Dict[str, Any]) -> bool:
        """Update document with timestamp tracking"""
        updates["updated_at"] = datetime.utcnow()

        # Preserve metadata structure
        if "metadata" in updates:
            updates["metadata"]["updated_at"] = datetime.utcnow().isoformat()

        result = await self.documents.update_one(
            {"_id": document_id},
            {"$set": updates}
        )
        return result.modified_count > 0

    async def delete_documents_batch(self, document_ids: List[str]) -> int:
        """Delete multiple documents and their vectors"""
        await self.vectors.delete_many({"document_id": {"$in": document_ids}})
        result = await self.documents.delete_many({"_id": {"$in": document_ids}})
        return result.deleted_count

    async def delete_document(self, document_id: str) -> bool:
        # Delete document and its vectors
        await self.vectors.delete_many({"document_id": document_id})
        result = await self.documents.delete_one({"_id": document_id})
        return result.deleted_count > 0

    async def list_documents(
        self,
        document_type: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 50,
        sort_by: str = "created_at",
        sort_order: int = ASCENDING,
        include_vectors: bool = False
    ) -> List[Dict[str, Any]]:
        """Enhanced document listing with vector data option"""
        query = {}
        if document_type:
            query["document_type"] = document_type
        if filters:
            query.update(filters)

        pipeline = [
            {"$match": query},
            {"$sort": {sort_by: sort_order}},
            {"$skip": skip},
            {"$limit": limit}
        ]

        if include_vectors:
            pipeline.extend([
                {
                    "$lookup": {
                        "from": "vectors",
                        "localField": "_id",
                        "foreignField": "document_id",
                        "as": "vectors"
                    }
                }
            ])

        results = []
        async for doc in self.documents.aggregate(pipeline):
            results.append(doc)
        return results

# Create singleton instance
mongodb = MongoDBManager()
