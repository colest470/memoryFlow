import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import { getProject } from '../lib/api/projects';
import { entriesAPI } from '../lib/api/entries';
import TimelineView from '../components/timeline/TimelineView';
import EntryForm from '../components/forms/EntryForm';
import { useParams, useNavigate } from 'react-router-dom';

export default function ProjectView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [parentEntryId, setParentEntryId] = useState(undefined);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  async function loadProjectData() {
    try {
      const [projectData, timelineData] = await Promise.all([
        getProject(projectId),
        entriesAPI.getProjectTimeline(projectId),
      ]);
      setProject(projectData);
      setEntries(timelineData);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEntry(data) {
    // `EntryForm` already performs the create request and passes the created entry
    // here as `data`. Just refresh the timeline and reset UI state.
    setShowEntryForm(false);
    setParentEntryId(undefined);
    await loadProjectData();
  }

  function handleAddRelated(entry) {
    setParentEntryId(entry.id);
    setShowEntryForm(true);
  }

  function handleSelectEntry(entry) {
    setSelectedEntry(entry);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">Project not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.hash = ''}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
                {project.description && (
                  <p className="text-sm text-slate-600">{project.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setParentEntryId(undefined);
                setShowEntryForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Entry
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">Memory Timeline</h2>
              {entries?.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">No entries yet</p>
                  <button
                    onClick={() => setShowEntryForm(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first entry
                  </button>
                </div>
              ) : (
                <TimelineView
                  entries={entries}
                  onSelectEntry={handleSelectEntry}
                  onAddRelated={handleAddRelated}
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-600">Status</p>
                  <p className="font-medium text-slate-900 capitalize">{project.status}</p>
                </div>
                {project.department && (
                  <div>
                    <p className="text-slate-600">Department</p>
                    <p className="font-medium text-slate-900">{project.department}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-600">Owner</p>
                  <p className="font-medium text-slate-900">{project.owner_name}</p>
                </div>
                <div>
                  <p className="text-slate-600">Total Entries</p>
                  <p className="font-medium text-slate-900">{entries.length}</p>
                </div>
              </div>

              {selectedEntry && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Selected Entry</h4>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-slate-900">{selectedEntry.title}</p>
                    <p className="text-slate-600">{selectedEntry.content}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedEntry.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showEntryForm && (
        <EntryForm
          projectId={projectId}
          parentEntryId={parentEntryId}
          onSubmit={handleCreateEntry}
          onClose={() => {
            setShowEntryForm(false);
            setParentEntryId(undefined);
          }}
        />
      )}
    </div>
  );
}
