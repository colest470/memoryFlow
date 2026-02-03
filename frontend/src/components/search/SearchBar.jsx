import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

// interface SearchBarProps {
//   onSearch: (query: string, filters: SearchFilters) => void;
//   showFilters?: boolean;
// }

// export interface SearchFilters {
//   entry_type?: string;
//   status?: string;
//   department?: string;
// }

export default function SearchBar({ onSearch, showFilters = true }) {
  const [query, setQuery] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState({});

  const handleSearch = () => {
    onSearch(query, filters);
  };

  const handleClearFilters = () => {
    setFilters({});
    onSearch(query, {});
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search memory entries, reports, insights..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Search
        </button>

        {showFilters && (
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors relative"
          >
            <Filter className="w-5 h-5 text-slate-600" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {showFilterPanel && showFilters && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Filters</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Entry Type
              </label>
              <select
                value={filters.entry_type || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, entry_type: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All types</option>
                <option value="proposal">Proposal</option>
                <option value="report">Report</option>
                <option value="meeting_note">Meeting Note</option>
                <option value="insight">Insight</option>
                <option value="decision">Decision</option>
                <option value="experiment">Experiment</option>
                <option value="outcome">Outcome</option>
                <option value="result">Result</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="lesson_learned">Lesson Learned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={filters.department || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value || undefined }))}
                placeholder="Filter by department..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
