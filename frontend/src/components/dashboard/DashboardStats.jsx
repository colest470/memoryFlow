import { useState, useEffect } from 'react';
import { FileText, Users, TrendingUp, Award, BarChart3, AlertCircle } from 'lucide-react';
import { entriesAPI } from '../../lib/api/entries';

export default function DashboardStats({ refreshTrigger }) {
  const [stats, setStats] = useState({
    totalEntries: 0,
    activeContributors: 0,
    recentEntries: 0,
    byStatus: {},
    byType: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await entriesAPI.getStats();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate knowledge health percentage
  const knowledgeHealth = stats.byStatus
    ? Math.round(
        ((stats.byStatus.active || 0) / stats.totalEntries) * 100
      ) || 0
    : 0;

  // Calculate recent engagement rate
  const engagementRate = stats.totalEntries > 0
    ? Math.round((stats.recentEntries / stats.totalEntries) * 100)
    : 0;

  // Find risk areas
  const riskAreas = [];
  if (knowledgeHealth < 60) riskAreas.push('Many archived entries - knowledge may be outdated');
  if (stats.activeContributors < 3) riskAreas.push('Low contributor count - limited knowledge sharing');
  if (engagementRate < 30) riskAreas.push('Low recent activity - knowledge not being updated');

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 animate-pulse">
            <div className="h-12 bg-slate-200 rounded mb-4"></div>
            <div className="h-8 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Entries',
      value: stats.totalEntries,
      icon: FileText,
      color: 'bg-blue-500',
      description: 'Knowledge base size'
    },
    {
      label: 'Active Contributors',
      value: stats.activeContributors,
      icon: Users,
      color: 'bg-green-500',
      description: 'Team members sharing'
    },
    {
      label: 'Recent Activity',
      value: `${engagementRate}%`,
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Last 7 days'
    },
    {
      label: 'Knowledge Health',
      value: `${knowledgeHealth}%`,
      icon: Award,
      color: 'bg-purple-500',
      description: 'Active content ratio',
      isHealth: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow ${
              stat.isHealth && knowledgeHealth < 60 ? 'border-yellow-300' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {stat.label}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {stat.description}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Breakdown by Type and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entries by Type */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Entries by Type
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.byType || {}).length > 0 ? (
              Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-100 rounded h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{
                          width: `${(count / (stats.totalEntries || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </div>
        </div>

        {/* Entries by Status */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            Knowledge Health
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byStatus || {}).length > 0 ? (
              Object.entries(stats.byStatus).map(([status, count]) => {
                const percentage = (count / (stats.totalEntries || 1)) * 100;
                const colors = {
                  active: 'bg-green-100 text-green-800 border-green-200',
                  archived: 'bg-gray-100 text-gray-800 border-gray-200',
                  lesson_learned: 'bg-blue-100 text-blue-800 border-blue-200'
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colors[status] || colors.active}`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            status === 'active' ? 'bg-green-500' :
                            status === 'archived' ? 'bg-gray-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-900 w-12 text-right">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Risk Areas */}
      {riskAreas.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-yellow-900 mb-2">
                Risk Areas
              </h3>
              <ul className="space-y-2">
                {riskAreas.map((risk, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
