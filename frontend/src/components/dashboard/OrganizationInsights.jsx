import { useState, useEffect } from 'react';
import { Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { entriesAPI } from '../../lib/api/entries';

export default function OrganizationInsights() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    setLoading(true);
    setError('');
    
    try {
      const data = await entriesAPI.getOrganizationInsights();
      setInsights(data);
    } catch (err) {
      setError('Failed to load organization insights');
      console.error('Insights error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/3"></div>
              <div className="h-3 bg-slate-100 rounded w-full"></div>
              <div className="h-3 bg-slate-100 rounded w-5/6"></div>
            </div>
          </div>
        ))}
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

  if (!insights) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Most Reused */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Most Reused Entries
        </h3>

        {insights.most_reused && insights.most_reused.length > 0 ? (
          <div className="space-y-3">
            {insights.most_reused.slice(0, 5).map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 bg-blue-50 rounded border border-blue-200"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{entry.title}</p>
                  <div className="flex gap-3 mt-1 text-xs text-slate-600">
                    <span>📚 {entry.reuse_count || 0} reuses</span>
                    <span>📤 {entry.share_count || 0} shares</span>
                    {entry.avg_rating && <span>⭐ {entry.avg_rating.toFixed(1)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No reuse data yet</p>
        )}
      </div>

      {/* Trending */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          Trending (Last 7 Days)
        </h3>

        {insights.trending && insights.trending.length > 0 ? (
          <div className="space-y-3">
            {insights.trending.slice(0, 5).map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 bg-amber-50 rounded border border-amber-200"
              >
                <div className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-700">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{entry.title}</p>
                  <div className="flex gap-3 mt-1 text-xs text-slate-600">
                    <span>🔥 {(entry.reuse_count || 0) + (entry.share_count || 0)} interactions</span>
                    <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No trending entries this week</p>
        )}
      </div>
    </div>
  );
}
