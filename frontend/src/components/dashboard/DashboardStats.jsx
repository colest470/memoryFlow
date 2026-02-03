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
          <div key={i} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 animate-pulse">
            <div className="h-12 bg-gray-700 rounded mb-4"></div>
            <div className="h-8 bg-gray-700 rounded"></div>
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
      color: 'bg-gradient-to-r from-blue-600 to-blue-500',
      bgColor: 'bg-blue-900/20',
      description: 'Knowledge base size'
    },
    {
      label: 'Active Contributors',
      value: stats.activeContributors,
      icon: Users,
      color: 'bg-gradient-to-r from-green-600 to-green-500',
      bgColor: 'bg-green-900/20',
      description: 'Team members sharing'
    },
    {
      label: 'Recent Activity',
      value: `${engagementRate}%`,
      icon: TrendingUp,
      color: 'bg-gradient-to-r from-orange-600 to-orange-500',
      bgColor: 'bg-orange-900/20',
      description: 'Last 7 days'
    },
    {
      label: 'Knowledge Health',
      value: `${knowledgeHealth}%`,
      icon: Award,
      color: 'bg-gradient-to-r from-purple-600 to-purple-500',
      bgColor: 'bg-purple-900/20',
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
            className={`bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 hover:border-orange-500/50 hover:shadow-xl transition-all duration-300 ${
              stat.isHealth && knowledgeHealth < 60 ? 'border-yellow-500/50' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  {stat.label}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {stat.description}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <div className={stat.color + " p-2 rounded-lg"}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <p className="text-3xl font-bold text-white">
              {stat.value}
            </p>
            {stat.isHealth && (
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      knowledgeHealth >= 80 ? 'bg-green-500' :
                      knowledgeHealth >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${knowledgeHealth}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Breakdown by Type and Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entries by Type */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Entries by Type
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.byType || {}).length > 0 ? (
              Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-700 rounded h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-full transition-all duration-500"
                        style={{
                          width: `${(count / (stats.totalEntries || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-white w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Entries by Status */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            Knowledge Health
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.byStatus || {}).length > 0 ? (
              Object.entries(stats.byStatus).map(([status, count]) => {
                const percentage = (count / (stats.totalEntries || 1)) * 100;
                const colors = {
                  active: 'bg-green-900/30 text-green-300 border-green-700',
                  archived: 'bg-gray-900/30 text-gray-300 border-gray-700',
                  lesson_learned: 'bg-blue-900/30 text-blue-300 border-blue-700'
                };
                const barColors = {
                  active: 'bg-gradient-to-r from-green-500 to-green-400',
                  archived: 'bg-gradient-to-r from-gray-500 to-gray-400',
                  lesson_learned: 'bg-gradient-to-r from-blue-500 to-blue-400'
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.active}`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-700 rounded h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${barColors[status] || barColors.active}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white w-12 text-right">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Risk Areas - Orange Theme */}
      {riskAreas.length > 0 && (
        <div className="bg-gradient-to-r from-orange-900/20 to-orange-900/10 border-l-4 border-orange-500 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-orange-300 mb-2">
                Risk Areas
              </h3>
              <ul className="space-y-2">
                {riskAreas.map((risk, index) => (
                  <li key={index} className="text-sm text-orange-200 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-gradient-to-r from-red-900/20 to-red-900/10 border border-red-700 rounded-lg p-4 text-red-300 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}