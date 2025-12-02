import { FileText, Users, TrendingUp, Award } from 'lucide-react';

// interface DashboardStatsProps {
//   stats: {
//     totalEntries: number;
//     activeProjects: number;
//     contributors: number;
//     lessonLearned: number;
//   };
// }

export default function DashboardStats({ stats }) {
  const statCards = [
    {
      label: 'Total Entries',
      value: stats.totalEntries,
      icon: FileText,
      color: 'bg-blue-500',
    },
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Contributors',
      value: stats.contributors,
      icon: Users,
      color: 'bg-orange-500',
    },
    {
      label: 'Lessons Learned',
      value: stats.lessonLearned,
      icon: Award,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {stat.value}
              </p>
            </div>
            <div className={`${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
