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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Orange gradient header - RESTORED */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-orange-500 to-black">
        <header className="top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">MemoryFlow</h1>
                <p className="text-sm text-orange-100">
                  {user?.organization} {user?.department && `· ${user.department}`}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-white">{user?.full_name}</p>
                  <p className="text-xs text-orange-200 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={() => navigate('/logout')}
                  className="px-4 py-2 text-sm font-medium bg-orange-900 hover:bg-orange-700 text-white rounded-lg transition-colors shadow-sm hover:shadow"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* Main content area with black background */}
      <div className="pt-40 min-h-screen bg-black">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <DashboardStats stats={stats} />
          </div>

          <div className="bg-gray-900 rounded-xl shadow-lg border border-gray-800 p-6 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <button
                  onClick={() => setActiveView('projects')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeView === 'projects'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'text-slate-300 hover:bg-gray-800 border border-gray-700'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  Projects
                </button>
                <button
                  onClick={() => window.location.hash = 'search'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-slate-300 hover:bg-gray-800 transition-colors border border-gray-700"
                >
                  <SearchIcon className="w-5 h-5" />
                  Search All
                </button>
              </div>

              <button
                onClick={() => setShowProjectForm(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors border border-orange-500 w-full sm:w-auto"
              >
                <Plus className="w-5 h-5" />
                New Project
              </button>
            </div>

            {activeView === 'projects' && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Your Projects</h2>
                {projects.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">No projects yet</p>
                    <button
                      onClick={() => setShowProjectForm(true)}
                      className="text-orange-400 hover:text-orange-300 font-medium"
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
    </div>
  );
}