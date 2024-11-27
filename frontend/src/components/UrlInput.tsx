import React, { useState, useEffect } from 'react';
import { FiGlobe } from 'react-icons/fi';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  wsEndpoint?: string;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  onSubmit,
  wsEndpoint = 'ws://localhost:8000/ws/url-processing'
}) => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    description: string;
    type: 'success' | 'error';
    show: boolean;
  } | null>(null);

  useEffect(() => {
    const websocket = new WebSocket(wsEndpoint);
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'url_processing') {
        if (data.status === 'completed') {
          setIsProcessing(false);
          setToast({
            title: 'URL Processed',
            description: 'Content has been successfully added to the knowledge base',
            type: 'success',
            show: true
          });
          setTimeout(() => setToast(null), 3000);
        } else if (data.status === 'failed') {
          setIsProcessing(false);
          setToast({
            title: 'Processing Failed',
            description: data.error || 'Failed to process URL',
            type: 'error',
            show: true
          });
          setTimeout(() => setToast(null), 5000);
        }
      }
    };
    setWs(websocket);
    return () => websocket.close();
  }, [wsEndpoint]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      setIsProcessing(true);
      try {
        onSubmit(url.trim());
      } catch (error) {
        setIsProcessing(false);
        setToast({
          title: 'Error',
          description: 'Failed to submit URL',
          type: 'error',
          show: true
        });
        setTimeout(() => setToast(null), 3000);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center w-full">
        <div className="absolute left-3 text-gray-500">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent" />
          ) : (
            <FiGlobe className="h-5 w-5" />
          )}
        </div>
        <input
          className={`w-full pl-10 pr-4 py-2 rounded-md border ${
            isProcessing ? 'border-blue-300' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL (website, Notion, or Confluence)"
          type="url"
          required
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={isProcessing}
          className={`ml-2 px-4 py-2 rounded-md text-white ${
            isProcessing
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500'
          }`}
        >
          {isProcessing ? (
            <>
              <span className="animate-pulse">Processing</span>
            </>
          ) : (
            'Process'
          )}
        </button>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <h3 className="font-bold">{toast.title}</h3>
          <p>{toast.description}</p>
        </div>
      )}
    </form>
  );
};
