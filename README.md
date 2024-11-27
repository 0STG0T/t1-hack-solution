# Knowledge Window - AI-Powered Knowledge Base Assistant

A modern knowledge base management system with real-time collaboration features and an intuitive drag-and-drop interface.

## Features
- 📄 Multi-format document processing (PDF, DOCX, TXT)
- 🔗 URL content integration
- 📝 Notion and Confluence integration
- 🎨 Customizable interface with modern design
- 🔄 Real-time collaboration via WebSocket
- 🎯 Drag-and-drop workflow builder
- 🔍 Advanced vector search capabilities

## Prerequisites
- Node.js 18+ (with pnpm)
- Python 3.10+
- PostgreSQL (for document metadata storage)

## Quick Start

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
pnpm install
```

3. Create `.env` file:
```bash
VITE_BACKEND_URL=http://localhost:8000
VITE_WEBSOCKET_URL=ws://localhost:8000/ws
```

4. Start development server:
```bash
pnpm dev
```

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

## Project Structure
```
knowledge-window/
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom React hooks
│   │   └── styles/        # TailwindCSS styles
│   └── package.json
└── backend/                # FastAPI backend
    ├── app/
    │   ├── routers/       # API routes
    │   ├── processors/    # Document processors
    │   └── models/        # Database models
    └── requirements.txt
```

## Development
- Frontend runs on http://localhost:5173
- Backend API runs on http://localhost:8000
- API documentation available at http://localhost:8000/docs

## Tech Stack
- Frontend:
  - React + TypeScript
  - TailwindCSS for styling
  - WebSocket for real-time updates
- Backend:
  - FastAPI
  - PostgreSQL
  - Vector search capabilities
