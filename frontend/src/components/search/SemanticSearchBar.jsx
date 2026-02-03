import { useState } from 'react';
import { Search, TrendingUp, ArrowRight } from 'lucide-react';
import { entriesAPI } from '../../lib/api/entries';

export default function SemanticSearchBar({ onResultsFound }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await entriesAPI.semanticSearch(query, {
        limit: 10,
        minSimilarity: 0.3
      });
      
      setResults(response.results || []);
      setShowResults(true);
      
      if (onResultsFound) {
        onResultsFound(response.results);
      }
    } catch (err) {
      setError('Failed to search. Try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by meaning... (e.g., 'user authentication patterns')"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Similar Entries ({results.length})
          </h3>
          <div className="space-y-2">
            {results.map((result) => (
              <div key={result.memory_entry_id} className="p-3 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{result.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded"
                          style={{ width: `${result.similarity * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{(result.similarity * 100).toFixed(0)}% match</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResults && results.length === 0 && !loading && (
        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-600 text-sm">
          No similar entries found. Try a different search.
        </div>
      )}
    </div>
  );
}
