import React from 'react';

interface SearchResult {
  id: string;
  title: string;
  text: string;
  source_type: string;
  similarity: number;
  url?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results }) => {
  const getSourceColor = (sourceType: string): string => {
    switch (sourceType.toLowerCase()) {
      case 'document':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'url':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'notion':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'confluence':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[600px] mx-auto mt-4">
      {results.map((result) => (
        <div
          key={result.id}
          className="p-4 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full hover:shadow-md transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200">
              {result.title}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceColor(result.source_type)}`}>
              {result.source_type}
            </span>
          </div>

          <p className="text-gray-700 dark:text-gray-200 line-clamp-3 mb-2">
            {result.text}
          </p>

          {result.url && (
            <a
              href={result.url}
              className="text-blue-500 hover:underline text-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Source
            </a>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Similarity: {(result.similarity * 100).toFixed(1)}%
          </p>
        </div>
      ))}

      {results.length === 0 && (
        <div className="p-4 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full text-center">
          <p className="text-gray-700 dark:text-gray-200">No results found</p>
        </div>
      )}
    </div>
  );
};
