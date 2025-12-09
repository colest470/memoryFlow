import { Clock, User, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProjectCard({ project, onSelect }) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 border-green-200',
    completed: 'bg-blue-100 text-blue-800 border-blue-200',
    archived: 'bg-slate-100 text-slate-800 border-slate-200',
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

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Folder className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {project.title}
            </h3>
            {project.department && (
              <p className="text-sm text-slate-600">{project.department}</p>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[project.status]}`}>
          {project.status}
        </span>
      </div>

      {project.description && (
        <p className="text-slate-700 mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          {project.owner_name}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {formatDate(project.created_at)}
        </div>
      </div>
    </div>
  );
}
