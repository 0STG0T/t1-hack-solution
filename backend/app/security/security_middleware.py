from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hashlib
from cryptography.fernet import Fernet
import os
import json

class SecurityMiddleware:
    def __init__(self):
        # Generate or load encryption key
        self.encryption_key = os.getenv('ENCRYPTION_KEY', Fernet.generate_key())
        self.fernet = Fernet(self.encryption_key)

        # JWT settings
        self.jwt_secret = os.getenv('JWT_SECRET', 'your-secret-key')
        self.jwt_algorithm = "HS256"
        self.token_expire_minutes = 60

        # Security bearer token
        self.security = HTTPBearer()

        # Rate limiting settings
        self.rate_limit_window = 60  # seconds
        self.max_requests = 100
        self.request_history: Dict[str, list] = {}

    async def verify_token(self, credentials: HTTPAuthorizationCredentials = Security(HTTPBearer())) -> Dict[str, Any]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(credentials.credentials, self.jwt_secret, algorithms=[self.jwt_algorithm])
            if payload.get('exp') < datetime.utcnow().timestamp():
                raise HTTPException(status_code=401, detail="Token has expired")
            return payload
        except jwt.JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

    def create_token(self, data: Dict[str, Any]) -> str:
        """Create JWT token with payload"""
        expiration = datetime.utcnow() + timedelta(minutes=self.token_expire_minutes)
        payload = {
            **data,
            'exp': expiration.timestamp()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)

    def encrypt_data(self, data: Any) -> bytes:
        """Encrypt sensitive data"""
        json_data = json.dumps(data)
        return self.fernet.encrypt(json_data.encode())

    def decrypt_data(self, encrypted_data: bytes) -> Any:
        """Decrypt sensitive data"""
        try:
            decrypted_data = self.fernet.decrypt(encrypted_data)
            return json.loads(decrypted_data.decode())
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to decrypt data")

    def hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    async def rate_limit(self, request: Request) -> None:
        """Implement rate limiting"""
        client_ip = request.client.host
        current_time = datetime.utcnow().timestamp()

        # Clean old requests
        if client_ip in self.request_history:
            self.request_history[client_ip] = [
                timestamp for timestamp in self.request_history[client_ip]
                if current_time - timestamp < self.rate_limit_window
            ]
        else:
            self.request_history[client_ip] = []

        # Check rate limit
        if len(self.request_history[client_ip]) >= self.max_requests:
            raise HTTPException(status_code=429, detail="Too many requests")

        # Add current request
        self.request_history[client_ip].append(current_time)

    def sanitize_input(self, data: str) -> str:
        """Sanitize user input to prevent XSS and injection attacks"""
        # Remove potentially dangerous characters and HTML tags
        sanitized = data.replace("<", "&lt;").replace(">", "&gt;")
        return sanitized

    async def process_request(self, request: Request) -> None:
        """Process incoming request with security checks"""
        # Rate limiting
        await self.rate_limit(request)

        # Verify content type
        content_type = request.headers.get('content-type', '')
        if request.method in ['POST', 'PUT'] and 'application/json' not in content_type:
            raise HTTPException(status_code=400, detail="Content-Type must be application/json")

        # Check for required security headers
        if not request.headers.get('x-request-id'):
            raise HTTPException(status_code=400, detail="Missing request ID")

    def validate_file_upload(self, file_content: bytes, allowed_extensions: list) -> bool:
        """Validate file uploads for security"""
        # Check file signature/magic numbers
        file_signatures = {
            'pdf': b'%PDF',
            'docx': b'PK\x03\x04',
            'txt': None  # Text files don't have a signature
        }

        # Check file extension
        file_ext = None
        for ext, signature in file_signatures.items():
            if signature and file_content.startswith(signature):
                file_ext = ext
                break

        return file_ext in allowed_extensions if file_ext else False

    async def log_security_event(self, event_type: str, details: Dict[str, Any]) -> None:
        """Log security events for audit"""
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': event_type,
            'details': details
        }
        # TODO: Implement secure logging mechanism
        print(f"Security Event: {event}")  # Replace with proper logging

# Create singleton instance
security_middleware = SecurityMiddleware()
