import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload } from 'react-icons/fi';

interface DocumentUploadProps {
  onUpload: (file: File) => void;
  wsEndpoint?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUpload, wsEndpoint = 'ws://localhost:8000/ws' }) => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    description: string;
    type: 'success' | 'error';
    show: boolean;
  } | null>(null);

  useEffect(() => {
    const websocket = new WebSocket(wsEndpoint);
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'process_status') {
        setUploadProgress(data.progress || 0);
        if (data.status === 'completed') {
          setToastMessage({
            title: 'Upload Complete',
            description: data.message || 'Document processed successfully',
            type: 'success',
            show: true
          });
          setTimeout(() => setToastMessage(null), 3000);
        }
      }
    };
    setWs(websocket);
    return () => websocket.close();
  }, [wsEndpoint]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (allowedTypes.includes(file.type)) {
        onUpload(file);
      } else {
        setToastMessage({
          title: 'Invalid file type',
          description: 'Please upload PDF, DOCX, or TXT files only.',
          type: 'error',
          show: true
        });
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-400'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-3">
          <FiUpload className="w-8 h-8 text-gray-400" />
          <p className="text-gray-600 text-center">
            {isDragActive
              ? 'Drop the files here...'
              : 'Drag & drop files here, or click to select files'}
          </p>
          <p className="text-sm text-gray-500">
            Supported formats: PDF, DOCX, TXT
          </p>
        </div>
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-200"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {toastMessage && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg ${
          toastMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          <h3 className="font-bold">{toastMessage.title}</h3>
          <p>{toastMessage.description}</p>
        </div>
      )}
    </div>
  );
};
