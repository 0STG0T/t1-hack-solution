from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
import datetime
from typing import Dict, Any

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)  # Changed to Text for larger content
    source_type = Column(String)  # pdf, docx, txt, url, notion, confluence
    source_url = Column(String, nullable=True)
    vector_embedding = Column(JSON, nullable=True)  # Store document embeddings for vector search
    metadata = Column(JSON, nullable=True)  # Store additional metadata (e.g., font, color settings)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "source_type": self.source_type,
            "source_url": self.source_url,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class WorkflowConfig(Base):
    __tablename__ = "workflow_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    nodes = Column(JSON)  # Store workflow node configurations
    connections = Column(JSON)  # Store node connections
    metadata = Column(JSON, nullable=True)  # Store visual customization settings
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "nodes": self.nodes,
            "connections": self.connections,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class UICustomization(Base):
    __tablename__ = "ui_customizations"

    id = Column(Integer, primary_key=True, index=True)
    theme = Column(JSON)  # Store color scheme, fonts, etc.
    layout = Column(JSON)  # Store layout preferences
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "theme": self.theme,
            "layout": self.layout,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
