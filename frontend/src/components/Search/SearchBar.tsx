import React, { useState, useCallback } from 'react';
import { FiSearch } from 'react-icons/fi';

interface SearchResult {
  id: string;
  title: string;
  text: string;
  source_type: string;
  similarity: number;
  url?: string;
}

interface SearchBarProps {
  onResultsFound?: (results: SearchResult[]) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onResultsFound }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch('http://localhost:8000/api/search/similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results: SearchResult[] = await response.json();
      onResultsFound?.(results);
    } catch (error) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSearching(false);
    }
  }, [query, onResultsFound]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-[600px] mx-auto relative">
      <div className="relative">
        <input
          className="w-full px-4 py-2 pr-12 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search knowledge base..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isSearching ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
          ) : (
            <button
              className="p-2 text-gray-500 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSearch}
              disabled={!query.trim()}
              aria-label="Search"
            >
              <FiSearch className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      {showToast && (
        <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow-lg">
          Failed to perform search. Please try again.
        </div>
      )}
    </div>
  );
};
