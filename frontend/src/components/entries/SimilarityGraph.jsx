import { useState, useEffect } from 'react';
import { Network, TrendingUp, MessageCircle, Share2, Repeat2 } from 'lucide-react';
import { entriesAPI } from '../../lib/api/entries';

export default function SimilarityGraph({ entryId }) {
  const [loading, setLoading] = useState(true);
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGraph();
  }, [entryId]);

  async function loadGraph() {
    setLoading(true);
    setError('');
    
    try {
      const data = await entriesAPI.getEntryGraph(entryId);
      setGraph(data);
    } catch (err) {
      setError('Failed to load similarity graph');
      console.error('Graph error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-3 bg-slate-100 rounded w-full"></div>
          <div className="h-3 bg-slate-100 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (!graph) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Analytics Summary */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Network className="w-5 h-5" />
          Knowledge Impact
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded p-3">
            <p className="text-xs text-slate-600">Views</p>
            <p className="text-2xl font-bold text-slate-900">{graph.analytics.view_count || 0}</p>
          </div>
          
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-blue-600">Reused</p>
            <p className="text-2xl font-bold text-blue-700">{graph.analytics.reuse_count || 0}</p>
          </div>
          
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-green-600">Shared</p>
            <p className="text-2xl font-bold text-green-700">{graph.analytics.share_count || 0}</p>
          </div>
          
          <div className="bg-yellow-50 rounded p-3">
            <p className="text-xs text-yellow-600">Rating</p>
            <p className="text-2xl font-bold text-yellow-700">
              {graph.analytics.avg_rating ? graph.analytics.avg_rating.toFixed(1) : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Related Entries */}
      {graph.related_entries && graph.related_entries.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Related Entries ({graph.related_entries.length})
          </h3>

          <div className="space-y-3">
            {graph.related_entries.map((relatedEntry) => (
              <div
                key={relatedEntry.id}
                className="p-3 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{relatedEntry.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{relatedEntry.entry_type}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                    {relatedEntry.link_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {new Date(relatedEntry.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!graph.related_entries || graph.related_entries.length === 0) && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-slate-600 text-sm">
          No related entries yet. Create links to build the knowledge graph.
        </div>
      )}
    </div>
  );
}
