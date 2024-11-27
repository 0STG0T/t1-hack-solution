import React, { useState } from 'react';
import { SearchBar } from './SearchBar';
import { SearchResults } from './SearchResults';

interface SearchResult {
  id: string;
  title: string;
  text: string;
  source_type: string;
  similarity: number;
  url?: string;
}

export const SearchContainer: React.FC = () => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const handleResultsFound = (results: SearchResult[]) => {
    setSearchResults(results);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <SearchBar onResultsFound={handleResultsFound} />
      </div>
      <SearchResults results={searchResults} />
    </div>
  );
};

export { SearchBar } from './SearchBar';
export { SearchResults } from './SearchResults';
export type { SearchResult };
