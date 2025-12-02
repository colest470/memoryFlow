import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/auth/AuthForm';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import SearchPage from './pages/SearchPage';
import { useEffect, useState } from 'react';

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState({ view: 'dashboard' });

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('project/')) {
        const projectId = hash.split('/')[1];
        setCurrentView({ view: 'project', params: { projectId } });
      } else if (hash === 'search') {
        setCurrentView({ view: 'search' });
      } else {
        setCurrentView({ view: 'dashboard' });
      }
    }

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  if (!user) {
    return <AuthForm />;
  }

  if (currentView.view === 'project') {
    return <ProjectView projectId={currentView.params.projectId} />;
  }

  if (currentView.view === 'search') {
    return <SearchPage />;
  }

  return <Dashboard />;
}

export default App;

