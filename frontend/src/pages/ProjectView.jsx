import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, Zap, BarChart3, Users, Clock, TrendingUp } from 'lucide-react';
import { getProject } from '../lib/api/projects';
import { entriesAPI } from '../lib/api/entries';
import TimelineView from '../components/timeline/TimelineView';
import EntryForm from '../components/forms/EntryForm';
import ProjectMembers from '../components/projects/ProjectMembers';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Calendar, User, Tag, Link as LinkIcon, MessageSquare, Download, Copy } from 'lucide-react';

export default function ProjectView() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [parentEntryId, setParentEntryId] = useState(undefined);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline', 'analytics', 'team'
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

      console.log("TimelineData: ", timelineData);

      setProject(projectData);
      setEntries(timelineData.entries);
      // if (Array.isArray(timelineData)) {
      //   setEntries(timelineData.entries);
      // } else {
      //   console.warn('API returned non-array for entries. Defaulting to empty array.', timelineData);
      //   setEntries(timelineData.entries || []);
      // }
      
    } catch (error) {
      console.error('Error loading project:', error);
      setEntries([]); // Ensure entries is reset on failure
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

  async function handleAnalyzeProject() {
    setAnalyzeLoading(true);
    try {
      const result = await entriesAPI.analyzeProject(projectId);
      setAnalyzeResult(result);
      setShowAnalysisModal(true);
    } catch (err) {
      console.error('Analyze project failed', err);
      alert('Failed to analyze project');
    } finally {
      setAnalyzeLoading(false);
    }
  }

  const showSelectedEntry = (entry) => {
    setSelectedEntry(entry);
    setShowEntryModal(true);
  };

const EntryDetailModal = ({ entry, onClose, onAddRelated }) => {
  const [copied, setCopied] = useState(false);

  if (!entry) return null;

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      return dateString || 'Unknown date';
    }
  };

  const copyToClipboard = () => {
    const content = `${entry.title}\n\n${entry.content || ''}\n\nTags: ${Array.isArray(entry.tags) ? entry.tags.join(', ') : entry.tags}\nCreated: ${formatDate(entry.created_at)}\nAuthor: ${entry.author_name || entry.author?.full_name || 'Unknown'}`;
    
    navigator.clipboard.writeText(content)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy:', err));
  };

  const downloadAsText = () => {
    const content = `
=== ENTRY DETAILS ===
Title: ${entry.title}
Type: ${entry.entry_type}
Created: ${formatDate(entry.created_at)}
Author: ${entry.author_name || entry.author?.full_name || 'Unknown'}
Department: ${entry.author_department || entry.author?.department || 'N/A'}
Status: ${entry.status || 'active'}
Project: ${entry.project_title || 'N/A'}

=== CONTENT ===
${entry.content || 'No content'}

=== TAGS ===
${Array.isArray(entry.tags) ? entry.tags.join(', ') : entry.tags || 'No tags'}

=== METADATA ===
${entry.metadata ? JSON.stringify(entry.metadata, null, 2) : 'No metadata'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entry-${entry.id}-${entry.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 border-b border-blue-200 flex items-start justify-between z-10">
          <div className="flex-1 pr-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-white line-clamp-2">{entry.title || 'Untitled Entry'}</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-blue-100">
              <span className="bg-blue-800 bg-opacity-50 px-3 py-1 rounded-full font-medium">
                {entry.entry_type?.replace('_', ' ') || 'entry'}
              </span>
              {entry.status && (
                <span className={`px-3 py-1 rounded-full font-medium ${
                  entry.status === 'active' ? 'bg-green-800 bg-opacity-50 text-green-100' :
                  entry.status === 'archived' ? 'bg-yellow-800 bg-opacity-50 text-yellow-100' :
                  'bg-purple-800 bg-opacity-50 text-purple-100'
                }`}>
                  {entry.status}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Content Section */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Content
                </h3>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-slate-700 bg-transparent p-0">
                    {entry.content || 'No content provided.'}
                  </pre>
                </div>
              </div>

              {/* AI Suggestions from Metadata */}
              {entry.metadata?.ai_suggestions && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    AI Insights
                  </h3>
                  {entry.metadata.ai_suggestions.suggestions?.summary && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Summary</h4>
                      <p className="text-slate-700 bg-white p-3 rounded border">
                        {entry.metadata.ai_suggestions.suggestions.summary}
                      </p>
                    </div>
                  )}
                  
                  {entry.metadata.ai_suggestions.suggestions?.key_points && 
                   Array.isArray(entry.metadata.ai_suggestions.suggestions.key_points) && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Key Points</h4>
                      <ul className="space-y-2">
                        {entry.metadata.ai_suggestions.suggestions.key_points.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-700">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {entry.metadata.ai_suggestions.suggestions?.action_items && 
                   Array.isArray(entry.metadata.ai_suggestions.suggestions.action_items) && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Suggested Actions</h4>
                      <ul className="space-y-2">
                        {entry.metadata.ai_suggestions.suggestions.action_items.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-700">
                            <span className="text-green-500 mt-1">›</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-blue-200 text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      <span>Generated by: {entry.metadata.ai_suggestions.model || 'AI'}</span>
                      <span>Confidence: {entry.metadata.ai_suggestions.suggestions?.confidence || 'high'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Attached Files */}
              {entry.metadata?.attached_files && Array.isArray(entry.metadata.attached_files) && entry.metadata.attached_files.length > 0 && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-600" />
                    Attached Files
                  </h3>
                  <div className="space-y-3">
                    {entry.metadata.attached_files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-xs">
                              {file.name?.split('.').pop()?.toUpperCase() || 'FILE'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{file.name || 'Unnamed File'}</p>
                            {file.size && (
                              <p className="text-xs text-slate-500">
                                {typeof file.size === 'number' 
                                  ? `${(file.size / 1024).toFixed(1)} KB`
                                  : file.size}
                              </p>
                            )}
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              {/* Entry Info Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Entry Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Created</p>
                      <p className="font-medium text-slate-900">{formatDate(entry.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Author</p>
                      <p className="font-medium text-slate-900">{entry.author_name || entry.author?.full_name || 'Unknown'}</p>
                      {entry.author_department && (
                        <p className="text-xs text-slate-500">{entry.author_department}</p>
                      )}
                    </div>
                  </div>
                  
                  {entry.project_title && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-sm text-slate-500">Project</p>
                      <p className="font-medium text-slate-900">{entry.project_title}</p>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-2">Entry ID</p>
                    <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">
                      {entry.id}
                    </code>
                  </div>
                </div>
              </div>

              {/* Tags Section */}
              {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-slate-400" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Actions</h3>
                
                {onAddRelated && (
                  <button
                    onClick={() => {
                      onAddRelated(entry);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Add Follow-up Entry
                  </button>
                )}
                
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                
                <button
                  onClick={downloadAsText}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download as Text
                </button>
              </div>

              {/* JSON View (Debug) */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                    View Raw JSON
                  </summary>
                  <pre className="mt-3 text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center">
          <div className="text-sm text-slate-500">
            Entry ID: <span className="font-mono font-medium">{entry.id}</span>
            {entry.created_at && (
              <span className="ml-4">
                Created: {new Date(entry.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">{project.title}</h1>
                {project.description && (
                  <p className="text-sm text-slate-400 mt-1">{project.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700 bg-opacity-60 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <FileText className="w-4 h-4" />
                <span>Total Entries</span>
              </div>
              <p className="text-2xl font-bold text-white">{entries?.length || 0}</p>
            </div>
            <div className="bg-slate-700 bg-opacity-60 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <Clock className="w-4 h-4" />
                <span>Last Entry</span>
              </div>
              <p className="text-lg font-bold text-white">
                {entries?.length > 0
                  ? new Date(entries[0].created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'None'}
              </p>
            </div>
            <div className="bg-slate-700 bg-opacity-60 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Status</span>
              </div>
              <p className="text-lg font-bold text-green-400 capitalize">{project.status}</p>
            </div>
            <div className="bg-slate-700 bg-opacity-60 rounded-lg p-3 border border-slate-600">
              <div className="flex items-center gap-2 text-slate-300 text-xs mb-1">
                <Users className="w-4 h-4" />
                <span>Owner</span>
              </div>
              <p className="text-sm font-bold text-white truncate">{project.owner_name}</p>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setParentEntryId(undefined);
                setShowEntryForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium text-white"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium text-white"
            >
              <Plus className="w-4 h-4" />
              Entries
            </button>
            <button
              onClick={handleAnalyzeProject}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={analyzeLoading}
            >
              <Zap className="w-4 h-4" />
              {analyzeLoading ? 'Analyzing...' : 'Analyze Project'}
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors font-medium text-white"
              title="Project statistics and insights"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics {/* I want this to be like a tab for a analytics view */}
            </button>
            <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                    activeTab === 'team'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
            >
                <Users className="w-4 h-4" />
                Team
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                  {activeTab === 'timeline' && (
                    <>
                      <h2 className="text-xl font-semibold text-slate-900 mb-6">Memory Timeline</h2>
                      
                      {entries?.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-600 mb-4">No entries yet</p>
                          <button
                            onClick={() => setShowEntryForm(true)}
                            className="text-blue-600 hover:text-blue-700 font-medium transition duration-150 ease-in-out"
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
                    </>
                  )} 
                  
                  {activeTab === 'analytics' && (
                    <>
                      <h2 className="text-xl font-semibold text-slate-900 mb-6">Project Analytics</h2>
                      <p className="text-slate-600">Analytics view is under construction.</p>
                    </>
                  )} 
                  {(!['timeline', 'analytics'].includes(activeTab)) && (
                    <>
                      <h2 className="text-xl font-semibold text-slate-900 mb-6">Project Team</h2>
                      <ProjectMembers projectId={projectId} />
                    </>
                  )}
                </div>
              </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sticky top-32">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Project Details
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start justify-between">
                  <span className="text-slate-600">Status</span>
                  <span className="font-semibold text-slate-900 capitalize bg-green-100 text-green-800 px-2 py-1 rounded">
                    {project.status}
                  </span>
                </div>
                {project.department && (
                  <div className="flex items-start justify-between">
                    <span className="text-slate-600">Department</span>
                    <span className="font-medium text-slate-900 text-right">{project.department}</span>
                  </div>
                )}
                <div className="flex items-start justify-between pt-4 border-t border-slate-200">
                  <span className="text-slate-600">Owner</span>
                  <span className="font-medium text-slate-900 text-right flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {project.owner_name}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-600">Total Entries</span>
                  <span className="font-bold text-slate-900 bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {entries.length}
                  </span>
                </div>
                <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                  <span className="text-slate-600">Last Updated</span>
                  <span className="font-medium text-slate-900">
                    {entries?.length > 0
                      ? new Date(entries[0].created_at).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  Activity
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">This Week</span>
                    {/* 👇 Fix applied here (using `entries || []`) for defensive filtering */}
                    <span className="font-bold text-slate-900">
                      {(entries || []).filter(
                        (e) =>
                          new Date(e.created_at) >
                          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">This Month</span>
                    {/* 👇 Fix applied here (using `entries || []`) for defensive filtering */}
                    <span className="font-bold text-slate-900">
                      {(entries || []).filter(
                        (e) =>
                          new Date(e.created_at) >
                          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      ).length || 0}
                    </span>
                  </div>
                </div>
              </div>

              {selectedEntry && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Selected Entry
                  </h4>
                  <div className="space-y-3 text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="font-semibold text-slate-900 line-clamp-2">{selectedEntry.title}</p>
                    <p className="text-slate-700 line-clamp-3">{selectedEntry.content}</p>
                    {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedEntry.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-white text-blue-700 border border-blue-200 rounded text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                      <button 
                        onClick={() => showSelectedEntry(selectedEntry)} 
                        className="mt-2 w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View Full Entry →
                      </button>
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

      
      {/* Entry Detail Modal */}
      {showEntryModal && selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => {
            setShowEntryModal(false);
            setSelectedEntry(null);
          }}
          onAddRelated={handleAddRelated}
        />
      )}

      {/* Analysis Results Modal */}
      {showAnalysisModal && analyzeResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 p-6 border-b border-purple-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white">Project Analysis Results</h2>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-white hover:bg-purple-500 p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-8">
              {/* Insights Section */}
              {analyzeResult.insights && analyzeResult.insights.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-slate-900">Key Insights</h3>
                  </div>
                  <div className="space-y-3">
                    {analyzeResult.insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg"
                      >
                        <p className="text-slate-800">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions Section */}
              {analyzeResult.suggestions && analyzeResult.suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-slate-900">Timeline Suggestions</h3>
                  </div>
                  <div className="space-y-4">
                    {analyzeResult.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">{suggestion.entry_a_title}</p>
                            <p className="text-sm text-slate-600">↔ {suggestion.entry_b_title}</p>
                          </div>
                          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            {Math.round(suggestion.similarity * 100)}% match
                          </div>
                        </div>
                        <p className="text-slate-700 text-sm">
                          Reason: {suggestion.reason || 'Similar themes detected'}
                        </p>
                        <button
                          onClick={() => {
                            // TODO: Link entries based on suggestion
                            setShowAnalysisModal(false);
                          }}
                          className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Link these entries →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              {analyzeResult.stats && (
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Analysis Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-slate-600 text-sm">Total Entries Analyzed</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {analyzeResult.stats.total_entries}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-slate-600 text-sm">Links Suggested</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {analyzeResult.suggestions?.length || 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-slate-600 text-sm">Unique Tags Found</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {analyzeResult.stats.unique_tags || 0}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-slate-600 text-sm">Analysis Time</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {analyzeResult.stats.analysis_time_ms || '~1000'}ms
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-6 py-2 text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                className="px-6 py-2 text-white bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
                onClick={() => {
                  // TODO: Export analysis results
                  setShowAnalysisModal(false);
                }}
              >
                Export Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}