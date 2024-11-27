from typing import List, Dict, Any, Optional
import numpy as np
from sentence_transformers import SentenceTransformer
import torch
from ..database.mongodb import MongoDBManager
import logging
from datetime import datetime

class VectorSearch:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """Initialize vector search with specified model"""
        self.model = SentenceTransformer(model_name)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model.to(self.device)
        self.db_manager = MongoDBManager()
        self.similarity_threshold = 0.6
        self.batch_size = 32
        logging.info(f"Initialized VectorSearch with model {model_name} on {self.device}")

    async def generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """Generate embeddings for input texts"""
        try:
            embeddings = []
            for i in range(0, len(texts), self.batch_size):
                batch = texts[i:i + self.batch_size]
                with torch.no_grad():
                    batch_embeddings = self.model.encode(
                        batch,
                        convert_to_tensor=True,
                        device=self.device
                    )
                    embeddings.extend(batch_embeddings.cpu().numpy())
            return np.array(embeddings)
        except Exception as e:
            logging.error(f"Error generating embeddings: {str(e)}")
            raise

    async def index_document(self, doc_id: str, content: str, metadata: Dict[str, Any]) -> bool:
        """Index document content with embeddings"""
        try:
            # Split content into chunks for better search granularity
            chunks = self._chunk_content(content)
            chunk_embeddings = await self.generate_embeddings(chunks)

            document_data = {
                'document_id': doc_id,
                'chunks': chunks,
                'embeddings': chunk_embeddings.tolist(),
                'metadata': metadata,
                'indexed_at': datetime.utcnow().isoformat(),
                'chunk_count': len(chunks)
            }

            return await self.db_manager.update_document_vectors(doc_id, document_data)
        except Exception as e:
            logging.error(f"Error indexing document {doc_id}: {str(e)}")
            raise

    def _chunk_content(self, content: str, chunk_size: int = 512) -> List[str]:
        """Split content into overlapping chunks"""
        words = content.split()
        chunks = []
        overlap = 50  # Words of overlap between chunks

        for i in range(0, len(words), chunk_size - overlap):
            chunk = ' '.join(words[i:i + chunk_size])
            chunks.append(chunk)

        return chunks

    async def search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search for similar documents using vector similarity"""
        try:
            query_embedding = await self.generate_embeddings([query])
            documents = await self.db_manager.get_documents_with_vectors(filters)

            results = []
            for doc in documents:
                doc_embeddings = np.array(doc['embeddings'])
                # Calculate similarities with all chunks
                similarities = np.dot(doc_embeddings, query_embedding[0])
                max_similarity = float(np.max(similarities))

                if max_similarity >= self.similarity_threshold:
                    best_chunk_idx = int(np.argmax(similarities))
                    results.append({
                        'document_id': doc['document_id'],
                        'similarity': max_similarity,
                        'content': doc['chunks'][best_chunk_idx],
                        'metadata': doc['metadata']
                    })

            results.sort(key=lambda x: x['similarity'], reverse=True)
            return results[:limit]
        except Exception as e:
            logging.error(f"Error performing search: {str(e)}")
            raise

    async def batch_index_documents(self, documents: List[Dict[str, Any]]) -> bool:
        """Batch index multiple documents"""
        try:
            indexed_docs = []
            for doc in documents:
                chunks = self._chunk_content(doc['content'])
                chunk_embeddings = await self.generate_embeddings(chunks)
                indexed_docs.append({
                    'document_id': doc['document_id'],
                    'chunks': chunks,
                    'embeddings': chunk_embeddings.tolist(),
                    'metadata': doc['metadata'],
                    'indexed_at': datetime.utcnow().isoformat(),
                    'chunk_count': len(chunks)
                })

            return await self.db_manager.batch_update_vectors(indexed_docs)
        except Exception as e:
            logging.error(f"Error batch indexing documents: {str(e)}")
            raise

    async def delete_document_vectors(self, doc_id: str) -> bool:
        """Delete document vectors from the index"""
        try:
            return await self.db_manager.delete_document_vectors(doc_id)
        except Exception as e:
            logging.error(f"Error deleting document vectors for {doc_id}: {str(e)}")
            raise

    async def reindex_document(self, doc_id: str, content: str, metadata: Dict[str, Any]) -> bool:
        """Reindex document with new content"""
        try:
            await self.delete_document_vectors(doc_id)
            return await self.index_document(doc_id, content, metadata)
        except Exception as e:
            logging.error(f"Error reindexing document {doc_id}: {str(e)}")
            raise
