import { Clock, User, Tag, Link as LinkIcon } from 'lucide-react';
// import type { MemoryEntryWithAuthor } from '../../lib/api/entries';

// interface TimelineViewProps {
//   entries: MemoryEntryWithAuthor[];
//   onSelectEntry: (entry: MemoryEntryWithAuthor) => void;
//   onAddRelated: (parentEntry: MemoryEntryWithAuthor) => void;
// }

export default function TimelineView({ entries, onSelectEntry, onAddRelated }) {
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
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="space-y-8">
      {entries.map((entry, index) => (
        <div key={entry.id} className="relative">
          {index < entries.length - 1 && (
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
                    onClick={() => onSelectEntry(entry)}
                  >
                    {entry.title}
                  </h3>

                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(entry.created_at)}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {entry.author.full_name}
                      {entry.author.department && ` · ${entry.author.department}`}
                    </div>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${entryTypeColors[entry.entry_type] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                  {entry.entry_type.replace('_', ' ')}
                </span>
              </div>

              {entry.content && (
                <p className="text-slate-700 mb-4 line-clamp-3">
                  {entry.content}
                </p>
              )}

              {entry.tags.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => onAddRelated(entry)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                <LinkIcon className="w-4 h-4" />
                Add Related Entry
              </button>

              {entry.children && entry.children.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-blue-200">
                  <p className="text-sm text-slate-600 mb-2">Followed by {entry.children.length} {entry.children.length === 1 ? 'entry' : 'entries'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
