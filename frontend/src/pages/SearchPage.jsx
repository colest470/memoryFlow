import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import SearchBar from '../components/search/SearchBar';
import SearchResults from '../components/search/SearchResults';
import { entriesAPI } from '../lib/api/entries';
import { useAuth } from '../contexts/AuthContext';

export default function SearchPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(query, filters) {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await entriesAPI.searchEntries(query, filters);
      setResults(data || []);
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectEntry(id) {
    console.log('Selected entry:', id);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.hash = ''}
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Search Memory</h1>
              <p className="text-sm text-slate-600">Find insights across all projects</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-6">
          <SearchBar onSearch={handleSearch} showFilters={true} />
        </div>

        {hasSearched && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
            <SearchResults
              results={results}
              onSelectEntry={handleSelectEntry}
              loading={loading}
            />
          </div>
        )}
      </main>
    </div>
  );
}
