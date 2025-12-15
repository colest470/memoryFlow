import { useState, useEffect } from 'react';
import { Plus, Search as SearchIcon, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, createProject } from '../lib/api/projects';
import { entriesAPI } from '../lib/api/entries';
import DashboardStats from '../components/dashboard/DashboardStats';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectForm from '../components/projects/ProjectForm';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [stats, setStats] = useState({
    totalEntries: 0,
    activeProjects: 0,
    contributors: 0,
    lessonLearned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('projects');
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const projectsData = await getProjects();
      setProjects(projectsData || []);

      console.log('Projects data:', projectsData);

      const statsData = await entriesAPI.getStats();
      if (statsData && statsData.stats) {
        setStats({
          totalEntries: statsData.stats.totalEntries || 0,
          activeProjects: projectsData?.filter(p => p.status === 'active').length || 0,
          contributors: statsData.stats.totalAuthors || 0,
          lessonLearned: statsData.stats.lessonLearnedCount || 0,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(data) {
    try {
      await createProject(data);
      setShowProjectForm(false);
      await loadDashboardData();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  }

  function handleSelectProject(id) {
    window.location.hash = `project/${id}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">MemoryFlow</h1>
              <p className="text-sm text-slate-600">
                {user?.organization} {user?.department && `· ${user.department}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.full_name}</p>
                <p className="text-xs text-slate-600 capitalize">{user?.role}</p>
              </div>
              <button
                //onClick={signOut}
                onClick={() =>navigate('/logout')}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <DashboardStats stats={stats} />
        </div>

        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveView('projects')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'projects'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                Projects
              </button>
              <button
                onClick={() => window.location.hash = 'search'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <SearchIcon className="w-5 h-5" />
                Search All
              </button>
            </div>

            <button
              onClick={() => setShowProjectForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>

          {activeView === 'projects' && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Projects</h2>
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No projects yet</p>
                  <button
                    onClick={() => setShowProjectForm(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelect={handleSelectProject}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showProjectForm && (
        <ProjectForm
          onSubmit={handleCreateProject}
          onClose={() => setShowProjectForm(false)}
        />
      )}
    </div>
  );
}
