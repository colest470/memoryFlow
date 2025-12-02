import { Clock, User, Tag, FileText } from 'lucide-react';

// interface SearchResult {
//   id: string;
//   title: string;
//   content: string | null;
//   entry_type: string;
//   created_at: string;
//   tags: string[];
//   author: {
//     full_name: string;
//     department: string | null;
//   };
//   project?: {
//     title: string;
//   } | null;
// }

// interface SearchResultsProps {
//   results: SearchResult[];
//   onSelectEntry: (id: string) => void;
//   loading?: boolean;
// }

export default function SearchResults({ results, onSelectEntry, loading }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const entryTypeColors = {
    proposal: 'bg-blue-100 text-blue-800',
    report: 'bg-green-100 text-green-800',
    meeting_note: 'bg-yellow-100 text-yellow-800',
    insight: 'bg-purple-100 text-purple-800',
    decision: 'bg-red-100 text-red-800',
    experiment: 'bg-orange-100 text-orange-800',
    outcome: 'bg-teal-100 text-teal-800',
    result: 'bg-cyan-100 text-cyan-800',
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-slate-600">Searching...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600">No results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Found {results.length} {results.length === 1 ? 'result' : 'results'}
      </p>

      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.id}
            onClick={() => onSelectEntry(result.id)}
            className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900 flex-1">
                {result.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${entryTypeColors[result.entry_type] || 'bg-slate-100 text-slate-800'}`}>
                {result.entry_type.replace('_', ' ')}
              </span>
            </div>

            {result.content && (
              <p className="text-slate-700 mb-3 line-clamp-2">
                {result.content}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(result.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {result.author.full_name}
              </div>
              {result.project && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {result.project.title}
                </div>
              )}
            </div>

            {result.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                <Tag className="w-4 h-4 text-slate-400" />
                <div className="flex flex-wrap gap-2">
                  {result.tags.slice(0, 5).map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {result.tags.length > 5 && (
                    <span className="px-2 py-1 text-slate-500 text-xs">
                      +{result.tags.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
