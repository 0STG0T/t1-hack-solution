from cryptography.fernet import Fernet
from typing import Dict, Any, Optional
import os
import json
import hashlib
from datetime import datetime, timedelta
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pathlib import Path

class DocumentSecurity:
    def __init__(self):
        # Generate or load encryption key
        key_path = Path("keys/document_key.key")
        key_path.parent.mkdir(exist_ok=True)

        if key_path.exists():
            with open(key_path, "rb") as key_file:
                self.key = key_file.read()
        else:
            self.key = Fernet.generate_key()
            with open(key_path, "wb") as key_file:
                key_file.write(self.key)

        self.cipher_suite = Fernet(self.key)
        self.security = HTTPBearer()
        self.SECRET_KEY = os.getenv("JWT_SECRET_KEY", self._generate_secret_key())

    def _generate_secret_key(self) -> str:
        """Generate a secure secret key if none exists"""
        return hashlib.sha256(os.urandom(32)).hexdigest()

    def encrypt_document(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt document content and metadata"""
        try:
            # Encrypt content
            encrypted_content = self.cipher_suite.encrypt(content)

            # Encrypt sensitive metadata
            sensitive_fields = ['title', 'author', 'tags']
            encrypted_metadata = metadata.copy()

            for field in sensitive_fields:
                if field in metadata:
                    encrypted_metadata[field] = self.cipher_suite.encrypt(
                        metadata[field].encode()
                    ).decode()

            return {
                'content': encrypted_content,
                'metadata': encrypted_metadata,
                'encryption_timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error encrypting document: {str(e)}"
            )

    def decrypt_document(self, encrypted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt document content and metadata"""
        try:
            # Decrypt content
            decrypted_content = self.cipher_suite.decrypt(encrypted_data['content'])

            # Decrypt sensitive metadata
            sensitive_fields = ['title', 'author', 'tags']
            decrypted_metadata = encrypted_data['metadata'].copy()

            for field in sensitive_fields:
                if field in encrypted_data['metadata']:
                    decrypted_metadata[field] = self.cipher_suite.decrypt(
                        encrypted_data['metadata'][field].encode()
                    ).decode()

            return {
                'content': decrypted_content,
                'metadata': decrypted_metadata
            }
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error decrypting document: {str(e)}"
            )

    def create_access_token(self, user_id: str, permissions: list) -> str:
        """Create JWT access token with permissions"""
        expire = datetime.utcnow() + timedelta(hours=24)
        to_encode = {
            'user_id': user_id,
            'permissions': permissions,
            'exp': expire
        }
        return jwt.encode(to_encode, self.SECRET_KEY, algorithm='HS256')

    def verify_token(self, credentials: HTTPAuthorizationCredentials = Security(HTTPBearer())) -> Dict[str, Any]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(
                credentials.credentials,
                self.SECRET_KEY,
                algorithms=['HS256']
            )
            if payload['exp'] < datetime.utcnow().timestamp():
                raise HTTPException(
                    status_code=401,
                    detail='Token has expired'
                )
            return payload
        except jwt.JWTError:
            raise HTTPException(
                status_code=401,
                detail='Invalid authentication token'
            )

    def check_permission(self, token_data: Dict[str, Any], required_permission: str) -> bool:
        """Check if user has required permission"""
        return required_permission in token_data.get('permissions', [])

    def sanitize_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive information from metadata before storage"""
        sensitive_fields = ['password', 'api_key', 'secret']
        return {k: v for k, v in metadata.items() if k.lower() not in sensitive_fields}

    def hash_file(self, content: bytes) -> str:
        """Create SHA-256 hash of file content for integrity verification"""
        return hashlib.sha256(content).hexdigest()

    def verify_file_integrity(self, content: bytes, stored_hash: str) -> bool:
        """Verify file integrity using stored hash"""
        return self.hash_file(content) == stored_hash

    def generate_document_id(self, content: bytes, metadata: Dict[str, Any]) -> str:
        """Generate unique document ID based on content and metadata"""
        unique_string = f"{content}{json.dumps(metadata, sort_keys=True)}{datetime.utcnow().isoformat()}"
        return hashlib.sha256(unique_string.encode()).hexdigest()

    async def secure_document(self, content: bytes, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Complete document security process"""
        # Sanitize metadata
        clean_metadata = self.sanitize_metadata(metadata)

        # Generate document ID
        doc_id = self.generate_document_id(content, clean_metadata)

        # Calculate content hash
        content_hash = self.hash_file(content)

        # Encrypt document
        encrypted_data = self.encrypt_document(content, clean_metadata)

        return {
            'document_id': doc_id,
            'content_hash': content_hash,
            'encrypted_data': encrypted_data
        }
