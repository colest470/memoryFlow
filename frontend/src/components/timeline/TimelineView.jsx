import { Clock, User, Tag, Link as LinkIcon, FolderOpen, AlertCircle } from 'lucide-react';

export default function TimelineView({ entries, onSelectEntry, onAddRelated }) {
  // Debug logging
  console.log('TimelineView received entries:', entries);
  console.log('Type of entries:', typeof entries);
  console.log('Is array?', Array.isArray(entries));
  
  const entryTypeColors = {
    proposal: 'bg-blue-100 text-blue-800 border-blue-200',
    report: 'bg-green-100 text-green-800 border-green-200',
    meeting_note: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    insight: 'bg-purple-100 text-purple-800 border-purple-200',
    decision: 'bg-red-100 text-red-800 border-red-200',
    experiment: 'bg-orange-100 text-orange-800 border-orange-200',
    outcome: 'bg-teal-100 text-teal-800 border-teal-200',
    result: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Handle all possible entry states
  const getEntriesArray = () => {
    // If entries is already an array, return it
    if (Array.isArray(entries)) {
      return entries;
    }
    
    // If entries is falsy (undefined, null, etc.), return empty array
    if (!entries) {
      return [];
    }
    
    // If entries is an object with a data property
    if (entries.data && Array.isArray(entries.data)) {
      return entries.data;
    }
    
    // If entries is an object with an items property
    if (entries.items && Array.isArray(entries.items)) {
      return entries.items;
    }
    
    // If entries is an object with results property
    if (entries.results && Array.isArray(entries.results)) {
      return entries.results;
    }
    
    // If entries is an object that should be turned into an array
    if (typeof entries === 'object' && entries !== null) {
      // Check if it's an array-like object
      if (entries.length !== undefined) {
        try {
          return Array.from(entries);
        } catch (error) {
          console.error('Failed to convert to array:', error);
        }
      }
      
      // Return as single item array
      return [entries];
    }
    
    // If entries is a string that might be JSON
    if (typeof entries === 'string') {
      try {
        const parsed = JSON.parse(entries);
        return getEntriesArray(parsed); // Recursively handle parsed data
      } catch (error) {
        // Not valid JSON, return empty array
        return [];
      }
    }
    
    // Default: return empty array
    return [];
  };

  // Get safe entries array
  const safeEntries = getEntriesArray();
  console.log('Safe entries array:', safeEntries);
  console.log('Safe entries length:', safeEntries.length);

  // Show error if entries is an object that couldn't be properly converted
  if (entries && typeof entries === 'object' && !Array.isArray(entries) && safeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Invalid Data Format
        </h3>
        <p className="text-slate-500 max-w-md mb-2">
          Expected an array of entries but received an object.
        </p>
        <pre className="text-xs text-slate-400 bg-slate-50 p-2 rounded max-w-md overflow-auto">
          {JSON.stringify(entries, null, 2)}
        </pre>
      </div>
    );
  }

  // Handle empty array
  if (!safeEntries || safeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          No Entries Yet
        </h3>
        <p className="text-slate-500 max-w-md mb-6">
          Start by creating the first entry for this project timeline.
        </p>
        {onAddRelated && (
          <button
            onClick={() => onAddRelated(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <LinkIcon className="w-4 h-4" />
            Create First Entry
          </button>
        )}
      </div>
    );
  }

  // Now safeEntries is guaranteed to be an array
  return (
    <div className="space-y-8">
      {safeEntries.map((entry, index) => (
        <div key={entry.id || index} className="relative">
          {index < safeEntries.length - 1 && (
            <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-slate-200" />
          )}

          <div className="relative flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
              {index + 1}
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3
                    className="text-xl font-semibold text-slate-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => onSelectEntry && onSelectEntry(entry)}
                  >
                    {entry.title || 'Untitled Entry'}
                  </h3>

                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {entry.created_at ? formatDate(entry.created_at) : 'No date'}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {entry.author?.full_name || entry.author_name || 'Unknown Author'}
                      {(entry.author?.department || entry.author_department) && (
                        ` · ${entry.author?.department || entry.author_department}`
                      )}
                    </div>
                  </div>
                </div>

                {entry.entry_type && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${entryTypeColors[entry.entry_type] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                    {entry.entry_type.replace('_', ' ')}
                  </span>
                )}
              </div>

              {entry.content && (
                <p className="text-slate-700 mb-4 line-clamp-3">
                  {typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content)}
                </p>
              )}

              {entry.tags && (
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(entry.tags) ? (
                      entry.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                          {tag}
                        </span>
                      ))
                    ) : typeof entry.tags === 'string' ? (
                      entry.tags.split(',').map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                          {tag.trim()}
                        </span>
                      ))
                    ) : null}
                  </div>
                </div>
              )}

              {onAddRelated && (
                <button
                  onClick={() => onAddRelated(entry)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Add Related Entry
                </button>
              )}

              {entry.children && entry.children.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-blue-200">
                  <p className="text-sm text-slate-600 mb-2">
                    Followed by {entry.children.length} {entry.children.length === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}