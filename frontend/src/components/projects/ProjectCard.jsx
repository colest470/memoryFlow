import { Clock, User, Folder, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProjectCard({ project, onSelect }) {
  const statusColors = {
    active: 'bg-gradient-to-r from-green-900/40 to-green-900/20 text-green-300 border-green-600/50',
    completed: 'bg-gradient-to-r from-blue-900/40 to-blue-900/20 text-blue-300 border-blue-600/50',
    archived: 'bg-gradient-to-r from-gray-900/40 to-gray-900/20 text-gray-400 border-gray-600/50',
  };

  const navigate = useNavigate();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const entryCount = project.entry_count || 0;

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 p-6 hover:border-orange-500/60 hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      {/* Background glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/0 to-orange-900/0 group-hover:from-orange-900/10 group-hover:to-orange-900/5 transition-all duration-500"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl shadow-lg group-hover:shadow-orange-500/20 group-hover:scale-105 transition-all duration-300">
              <Folder className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-orange-300 transition-colors">
                {project.title}
              </h3>
              {project.department && (
                <p className="text-sm text-gray-400">{project.department}</p>
              )}
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${statusColors[project.status]}`}>
            {project.status}
          </span>
        </div>

        {project.description && (
          <p className="text-gray-300 mb-5 line-clamp-2 group-hover:text-gray-200 transition-colors">
            {project.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm border-t border-gray-700 pt-4">
          <div className="flex items-center gap-2">
            <div className="bg-gray-700/50 p-1.5 rounded-lg">
              <User className="w-4 h-4 text-orange-300" />
            </div>
            <span className="text-gray-300 font-medium">{project.owner_name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-gray-700/50 p-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-orange-300" />
            </div>
            <span className="text-gray-300">{formatDate(project.created_at)}</span>
          </div>

          {entryCount > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs px-2 py-1 bg-orange-900/30 text-orange-300 rounded-full border border-orange-700/30">
                {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          )}
        </div>

        {/* Hover action indicator */}
        <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <ArrowRight className="w-4 h-4 text-orange-400" />
        </div>
      </div>
    </div>
  );
}