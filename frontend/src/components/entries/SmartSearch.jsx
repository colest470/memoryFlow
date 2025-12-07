import { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function SmartSearch({ onEntrySelect, onCreateEntry }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    entry_type: '',
    status: '',
    department: '',
    sort: 'created_at',
    order: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError('');

      const queryParams = new URLSearchParams({
        q: searchQuery,
        sort: filters.sort,
        order: filters.order,
        limit: 20
      });

      if (filters.entry_type) queryParams.append('entry_type', filters.entry_type);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.department) queryParams.append('department', filters.department);

      const response = await fetch(
        `${import.meta.env.VITE_API_BACKEND}/api/entries?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() || Object.values(filters).some(v => v)) {
      handleSearch();
    }
  }, [filters]);

  const handleClearFilters = () => {
    setFilters({
      entry_type: '',
      status: '',
      department: '',
      sort: 'created_at',
      order: 'desc'
    });
    setSearchQuery('');
    setEntries([]);
  };

  const getEntryTypeColor = (type) => {
    const colors = {
      report: 'bg-blue-100 text-blue-800',
      meeting_note: 'bg-purple-100 text-purple-800',
      insight: 'bg-green-100 text-green-800',
      decision: 'bg-orange-100 text-orange-800',
      experiment: 'bg-pink-100 text-pink-800',
      outcome: 'bg-indigo-100 text-indigo-800',
      proposal: 'bg-yellow-100 text-yellow-800',
      result: 'bg-cyan-100 text-cyan-800'
    };
    return colors[type] || 'bg-slate-100 text-slate-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800',
      lesson_learned: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 p-6">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, content, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 font-medium"
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Entry Type</label>
                <select
                  value={filters.entry_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, entry_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All types</option>
                  <option value="report">Report</option>
                  <option value="meeting_note">Meeting Note</option>
                  <option value="insight">Insight</option>
                  <option value="decision">Decision</option>
                  <option value="experiment">Experiment</option>
                  <option value="outcome">Outcome</option>
                  <option value="proposal">Proposal</option>
                  <option value="result">Result</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                  <option value="lesson_learned">Lesson Learned</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created_at">Created Date</option>
                  <option value="updated_at">Updated Date</option>
                  <option value="title">Title</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <select
                  value={filters.order}
                  onChange={(e) => setFilters(prev => ({ ...prev, order: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClearFilters}
                className="flex-1 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-3">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="p-6">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg mb-4">
              {searchQuery || Object.values(filters).some(v => v)
                ? 'No entries found matching your search'
                : 'Start searching or apply filters to find knowledge'}
            </p>
            <button
              onClick={onCreateEntry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create New Entry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 font-medium mb-4">
              Found {entries.length} result{entries.length !== 1 ? 's' : ''}
            </p>
            {entries.map(entry => (
              <div
                key={entry.id}
                onClick={() => onEntrySelect(entry.id)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-4 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{entry.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{entry.content}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateEntry(entry.id);
                    }}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                  >
                    Link Entry
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`px-2 py-1 text-xs rounded font-medium ${getEntryTypeColor(entry.entry_type)}`}>
                    {entry.entry_type.replace(/_/g, ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded font-medium ${getStatusColor(entry.status)}`}>
                    {entry.status}
                  </span>
                  {entry.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  By {entry.author_name} • {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
