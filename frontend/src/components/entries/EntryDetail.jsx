import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, MessageSquare, Calendar, User } from 'lucide-react';

export default function EntryDetail({ entryId, onClose, onAddRelated }) {
  const [entry, setEntry] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEntryDetail();
  }, [entryId]);

  const fetchEntryDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_BACKEND}/api/entries/${entryId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch entry');
      }

      const data = await response.json();
      setEntry(data.entry);
      setConnections(data.connections || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entry');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin">⏳</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-red-600">Error</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-slate-600">{error || 'Entry not found'}</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 px-6 py-4 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{entry.title}</h2>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEntryTypeColor(entry.entry_type)}`}>
                {entry.entry_type.replace(/_/g, ' ')}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(entry.status)}`}>
                {entry.status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Meta Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="w-4 h-4 text-slate-400" />
              <span><strong>Author:</strong> {entry.author_name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span><strong>Created:</strong> {formatDate(entry.created_at)}</span>
            </div>
            {entry.author_department && (
              <div className="text-slate-600">
                <strong>Department:</strong> {entry.author_department}
              </div>
            )}
            {entry.updated_at !== entry.created_at && (
              <div className="text-slate-600">
                <strong>Updated:</strong> {formatDate(entry.updated_at)}
              </div>
            )}
          </div>

          {/* Main Content */}
          {entry.content && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Content</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{entry.content}</p>
            </div>
          )}

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {entry.metadata?.ai_generated_tags && entry.metadata.ai_generated_tags.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                ✨ AI Insights
              </h3>
              {entry.metadata.ai_summary && (
                <p className="text-sm text-blue-800 mb-2"><strong>Summary:</strong> {entry.metadata.ai_summary}</p>
              )}
              {entry.metadata.ai_generated_tags.length > 0 && (
                <p className="text-sm text-blue-700"><strong>Suggested Tags:</strong> {entry.metadata.ai_generated_tags.join(', ')}</p>
              )}
            </div>
          )}

          {/* Connections */}
          {connections && connections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Related Entries ({connections.length})
              </h3>
              <div className="space-y-2">
                {connections.map(conn => (
                  <div
                    key={conn.id}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{conn.title}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {conn.link_type.replace(/_/g, ' ')} • {conn.entry_type.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(conn.status)}`}>
                        {conn.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      By {conn.author_name} • {formatDate(conn.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => onAddRelated(entry.id)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <LinkIcon className="w-4 h-4" />
              Add Related Entry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
