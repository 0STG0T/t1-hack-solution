import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { DocumentUpload } from './components/DocumentUpload';
import { DragDropBuilder } from './components/DragDropBuilder';
import { UrlInput } from './components/UrlInput';
import { CustomizationPanel } from './components/CustomizationPanel';
import { WebSocketProvider } from './components/WebSocketProvider';

const App: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload/file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setDocuments(prev => [...prev, result]);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleUrlSubmit = async (url: string) => {
    const formData = new FormData();
    formData.append('url', url);

    try {
      const response = await fetch('http://localhost:8000/process/url', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('URL processing failed');
      }

      const result = await response.json();
      setDocuments(prev => [...prev, result]);
    } catch (error) {
      console.error('URL processing failed:', error);
    }
  };

  return (
    <WebSocketProvider url="ws://localhost:8000/ws">
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-white">
              Knowledge Window
            </h1>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8">
                <div className="space-y-6">
                  <DocumentUpload onUpload={handleFileUpload} />
                  <UrlInput onSubmit={handleUrlSubmit} />
                  <DragDropBuilder />
                </div>
              </div>

              <div className="col-span-4">
                <CustomizationPanel />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </WebSocketProvider>
  );
};

export default App;
