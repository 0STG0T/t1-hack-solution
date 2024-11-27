from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient

class VectorSearch:
    def __init__(self, mongodb_client: AsyncIOMotorClient):
        # Using a lightweight multilingual model suitable for commercial use
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        self.mongodb_client = mongodb_client
        self.collection = self.mongodb_client.knowledge_window.documents

    async def search_cross_collection(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        # Generate embedding for the search query
        query_embedding = self.generate_embedding(query)

        # Search in MongoDB using vector similarity
        cursor = self.collection.find({})
        documents = await cursor.to_list(length=100)  # Fetch initial batch

        # Calculate similarities and sort documents
        results = []
        for doc in documents:
            if 'vector_embedding' in doc:
                similarity = self.calculate_similarity(
                    query_embedding,
                    doc['vector_embedding']
                )
                results.append({
                    'id': str(doc.get('_id')),
                    'title': doc.get('title', ''),
                    'text': doc.get('text', ''),
                    'source_type': doc.get('source_type', ''),
                    'similarity': float(similarity)
                })

        # Sort by similarity and return top_k results
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:limit]

    def generate_embedding(self, text: str) -> List[float]:
        # Generate embeddings for the document text
        embedding = self.model.encode(text)
        return embedding.tolist()

    def calculate_similarity(self, query_embedding: List[float], document_embedding: List[float]) -> float:
        # Calculate cosine similarity between query and document
        query_array = np.array(query_embedding)
        doc_array = np.array(document_embedding)
        similarity = np.dot(query_array, doc_array) / (
            np.linalg.norm(query_array) * np.linalg.norm(doc_array)
        )
        return float(similarity)
