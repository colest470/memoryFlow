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

      setProject(projectData);
      setEntries(timelineData.entries);
    } catch (error) {
      console.error('Error loading project:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEntry(data) {
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

  console.log("From EntryModal", entry);

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

  // Check if AI suggestions exist and have the expected structure
  const hasAISuggestions = entry.metadata?.ai_suggestions;
  const aiSuggestions = entry.metadata?.ai_suggestions || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-black border border-orange-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-900 to-orange-950 p-6 border-b border-orange-700 flex items-start justify-between z-10">
          <div className="flex-1 pr-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-bold text-orange-100 line-clamp-2">{entry.title || 'Untitled Entry'}</h2>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-white">
              <span className="bg-orange-800 bg-opacity-60 px-3 py-1 rounded-full font-medium">
                {entry.entry_type?.replace('_', ' ') || 'entry'}
              </span>
              {entry.status && (
                <span className={`px-3 py-1 rounded-full font-medium ${
                  entry.status === 'active' ? 'bg-green-800 bg-opacity-60 text-green-100' :
                  entry.status === 'archived' ? 'bg-yellow-800 bg-opacity-60 text-yellow-100' :
                  'bg-purple-800 bg-opacity-60 text-purple-100'
                }`}>
                  {entry.status}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-orange-800 p-2 rounded-lg transition-colors flex-shrink-0"
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
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-5">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  Content
                </h3>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-200 bg-transparent p-0">
                    {entry.content || 'No content provided.'}
                  </pre>
                </div>
              </div>

              {/* AI Suggestions from Metadata */}
              {hasAISuggestions && (
                <div className="bg-gradient-to-r from-orange-950/30 to-amber-950/30 rounded-lg border border-orange-800 p-5">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-orange-400" />
                    AI Insights
                  </h3>
                  
                  {/* Summary */}
                  {aiSuggestions.summary && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
                      <p className="text-gray-200 bg-gray-800 p-3 rounded border border-gray-700">
                        {aiSuggestions.summary}
                      </p>
                    </div>
                  )}
                  
                  {/* Key Points */}
                  {aiSuggestions.key_points && 
                   Array.isArray(aiSuggestions.key_points) && aiSuggestions.key_points.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-white mb-2">Key Points</h4>
                      <ul className="space-y-2">
                        {aiSuggestions.key_points.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-200">
                            <span className="text-orange-500 mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Action Items */}
                  {aiSuggestions.action_items && 
                   Array.isArray(aiSuggestions.action_items) && aiSuggestions.action_items.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-white mb-2">Suggested Actions</h4>
                      <ul className="space-y-2">
                        {aiSuggestions.action_items.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-200">
                            <span className="text-green-500 mt-1">›</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Category */}
                  {aiSuggestions.category && (
                    <div className="mb-3">
                      <h4 className="text-sm font-semibold text-white mb-2">Category</h4>
                      <span className="px-3 py-1 bg-orange-900/40 text-orange-300 border border-orange-700 rounded-full text-sm">
                        {aiSuggestions.category}
                      </span>
                    </div>
                  )}
                  
                  {/* Tags from AI suggestions */}
                  {aiSuggestions.tags && 
                   Array.isArray(aiSuggestions.tags) && aiSuggestions.tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-white mb-2">AI Suggested Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestions.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-purple-900/40 text-purple-300 border border-purple-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Model Info */}
                  <div className="mt-4 pt-4 border-t border-orange-800 text-xs text-gray-400">
                    <div className="flex items-center gap-4">
                      {aiSuggestions.ai_model && (
                        <span>Generated by: {aiSuggestions.ai_model}</span>
                      )}
                      {aiSuggestions.confidence && (
                        <span>Confidence: {aiSuggestions.confidence}</span>
                      )}
                      {aiSuggestions.generated_at && (
                        <span>Generated: {new Date(aiSuggestions.generated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Attached Files */}
              {entry.metadata?.attached_files && Array.isArray(entry.metadata.attached_files) && entry.metadata.attached_files.length > 0 && (
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-5">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    Attached Files
                  </h3>
                  <div className="space-y-3">
                    {entry.metadata.attached_files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700 hover:bg-gray-750 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-900/30 rounded flex items-center justify-center">
                            <span className="text-orange-400 font-medium text-xs">
                              {file.name?.split('.').pop()?.toUpperCase() || 'FILE'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-200">{file.name || 'Unnamed File'}</p>
                            {file.size && (
                              <p className="text-xs text-gray-400">
                                {typeof file.size === 'number' 
                                  ? `${(file.size / 1024).toFixed(1)} KB`
                                  : file.size}
                              </p>
                            )}
                          </div>
                        </div>
                        <button className="text-orange-400 hover:text-white text-sm font-medium">
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
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Entry Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-white" />
                    <div>
                      <p className="text-sm text-gray-400">Created</p>
                      <p className="font-medium text-white">{formatDate(entry.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-white" />
                    <div>
                      <p className="text-sm text-gray-400">Author</p>
                      <p className="font-medium text-white">{entry.author_name || entry.author?.full_name || 'Unknown'}</p>
                      {entry.author_department && (
                        <p className="text-xs text-gray-500">{entry.author_department}</p>
                      )}
                    </div>
                  </div>
                  
                  {entry.project_title && (
                    <div className="pt-3 border-t border-gray-800">
                      <p className="text-sm text-gray-400">Project</p>
                      <p className="font-medium text-white">{entry.project_title}</p>
                    </div>
                  )}

                  {/* Children Count */}
                  {entry.childrenCount !== undefined && (
                    <div className="pt-3 border-t border-gray-800">
                      <p className="text-sm text-gray-400">Follow-ups</p>
                      <p className="font-medium text-white">{entry.childrenCount}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Section */}
              {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 && (
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-5">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-white" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-orange-900/40 text-white border border-orange-700 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-5 space-y-3">
                <h3 className="text-lg font-semibold text-white mb-3">Actions</h3>
                
                {onAddRelated && (
                  <button
                    onClick={() => {
                      onAddRelated(entry);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Add Follow-up Entry
                  </button>
                )}
                
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                
                <button
                  onClick={downloadAsText}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-800/30 text-green-300 rounded-lg hover:bg-green-800/40 transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download as Text
                </button>
              </div>

              {/* JSON View (Debug) */}
              <div className="bg-gray-900 rounded-lg border border-gray-700 p-5">
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-orange-400 hover:text-white">
                    View Raw JSON
                  </summary>
                  <pre className="mt-3 text-xs bg-gray-950 text-white p-3 rounded overflow-x-auto max-h-60 overflow-y-auto border border-gray-800">
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Entry ID: <span className="font-mono font-medium text-orange-300">{entry.id}</span>
            {entry.created_at && (
              <span className="ml-4">
                Created: {new Date(entry.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-white">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-orange-800 mx-auto mb-4" />
          <p className="text-white">Project not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-orange-400 hover:text-white font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-gradient-to-r from-gray-900 to-black border-b border-gray-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.history.back()}
                className="text-orange-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">{project.title}</h1>
                {project.description && (
                  <p className="text-sm text-orange-400 mt-1">{project.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 bg-opacity-60 rounded-lg p-3 border border-gray-900">
              <div className="flex items-center gap-2 text-white text-xs mb-1">
                <FileText className="w-4 h-4" />
                <span>Total Entries</span>
              </div>
              <p className="text-2xl font-bold text-white">{entries?.length || 0}</p>
            </div>
            <div className="bg-gray-800 bg-opacity-60 rounded-lg p-3 border border-gray-900">
              <div className="flex items-center gap-2 text-white text-xs mb-1">
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
            <div className="bg-gray-800 bg-opacity-60 rounded-lg p-3 border border-gray-900">
              <div className="flex items-center gap-2 text-white text-xs mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Status</span>
              </div>
              <p className="text-lg font-bold text-green-400 capitalize">{project.status}</p>
            </div>
            <div className="bg-gray-800 bg-opacity-60 rounded-lg p-3 border border-gray-900">
              <div className="flex items-center gap-2 text-white text-xs mb-1">
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
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors font-medium text-white"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors font-medium text-white"
            >
              <Plus className="w-4 h-4" />
              Entries
            </button>
            <button
              onClick={handleAnalyzeProject}
              className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={analyzeLoading}
            >
              <Zap className="w-4 h-4" />
              {analyzeLoading ? 'Analyzing...' : 'Analyze Project'}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                activeTab === 'analytics'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
              title="Project statistics and insights"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                activeTab === 'team'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
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
                <div className="bg-gray-900 rounded-xl shadow-md border border-gray-900 p-6">
                  {activeTab === 'timeline' && (
                    <>
                      <h2 className="text-xl font-semibold text-white mb-6">Memory Timeline</h2>
                      
                      {entries?.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="w-16 h-16 text-orange-800 mx-auto mb-4" />
                          <p className="text-orange-400 mb-4">No entries yet</p>
                          <button
                            onClick={() => setShowEntryForm(true)}
                            className="text-orange-400 hover:text-white font-medium transition duration-150 ease-in-out"
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
                      <h2 className="text-xl font-semibold text-white mb-6">Project Analytics</h2>
                      <p className="text-orange-400">Analytics view is under construction.</p>
                    </>
                  )} 
                  {(!['timeline', 'analytics'].includes(activeTab)) && (
                    <>
                      <h2 className="text-xl font-semibold text-white mb-6">Project Team</h2>
                      <ProjectMembers projectId={projectId} />
                    </>
                  )}
                </div>
              </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl shadow-md border border-gray-900 p-6 sticky top-32">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Project Details
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex items-start justify-between">
                  <span className="text-orange-400">Status</span>
                  <span className="font-semibold text-green-400 capitalize bg-green-900/30 text-green-300 px-2 py-1 rounded">
                    {project.status}
                  </span>
                </div>
                {project.department && (
                  <div className="flex items-start justify-between">
                    <span className="text-orange-400">Department</span>
                    <span className="font-medium text-white text-right">{project.department}</span>
                  </div>
                )}
                <div className="flex items-start justify-between pt-4 border-t border-orange-800">
                  <span className="text-orange-400">Owner</span>
                  <span className="font-medium text-white text-right flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {project.owner_name}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-orange-400">Total Entries</span>
                  <span className="font-bold text-white bg-orange-900/40 text-white px-2 py-1 rounded">
                    {entries.length}
                  </span>
                </div>
                <div className="flex items-start justify-between pb-4 border-b border-orange-800">
                  <span className="text-orange-400">Last Updated</span>
                  <span className="font-medium text-white">
                    {entries?.length > 0
                      ? new Date(entries[0].created_at).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Activity
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-orange-400">This Week</span>
                    <span className="font-bold text-white">
                      {(entries || []).filter(
                        (e) =>
                          new Date(e.created_at) >
                          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-400">This Month</span>
                    <span className="font-bold text-white">
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
                <div className="mt-6 pt-6 border-t border-orange-800">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    Selected Entry
                  </h4>
                  <div className="space-y-3 text-sm bg-orange-950/20 p-3 rounded-lg border border-orange-800">
                    <p className="font-semibold text-white line-clamp-2">{selectedEntry.title}</p>
                    <p className="text-white line-clamp-3">{selectedEntry.content}</p>
                    {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedEntry.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-orange-900/40 text-white border border-orange-700 rounded text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                      <button 
                        onClick={() => showSelectedEntry(selectedEntry)} 
                        className="mt-2 w-full text-xs text-orange-400 hover:text-white font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-black border border-orange-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-900 to-purple-950 p-6 border-b border-purple-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-purple-300" />
                <h2 className="text-2xl font-bold text-purple-200">Project Analysis Results</h2>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-purple-300 hover:bg-purple-800 p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-8">

              {analyzeResult && (
                <div className='bg-black color-white'>{analyzeResult}</div>
              )}
              {/* Insights Section */}
              {/* {analyzeResult.insights && analyzeResult.insights.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-purple-300">Key Insights</h3>
                  </div>
                  <div className="space-y-3">
                    {analyzeResult.insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-r from-purple-900/30 to-purple-950/30 border border-purple-800 rounded-lg"
                      >
                        <p className="text-purple-200">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}

              {/* Suggestions Section */}
              {/* {analyzeResult.suggestions && analyzeResult.suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                    <h3 className="text-lg font-semibold text-white">Timeline Suggestions</h3>
                  </div>
                  <div className="space-y-4">
                    {analyzeResult.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="border border-orange-800 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-white">{suggestion.entry_a_title}</p>
                            <p className="text-sm text-orange-400">↔ {suggestion.entry_b_title}</p>
                          </div>
                          <div className="bg-orange-900/40 text-white px-3 py-1 rounded-full text-sm font-medium">
                            {Math.round(suggestion.similarity * 100)}% match
                          </div>
                        </div>
                        <p className="text-white text-sm">
                          Reason: {suggestion.reason || 'Similar themes detected'}
                        </p>
                        <button
                          onClick={() => {
                            setShowAnalysisModal(false);
                          }}
                          className="mt-3 text-sm text-orange-400 hover:text-white font-medium"
                        >
                          Link these entries →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}

              {/* Summary Stats */}
              {/* analyzeResult.stats && (
                <div className="border-t border-orange-800 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Analysis Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-orange-400 text-sm">Total Entries Analyzed</p>
                      <p className="text-2xl font-bold text-white">
                        {analyzeResult.stats.total_entries}
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-orange-400 text-sm">Links Suggested</p>
                      <p className="text-2xl font-bold text-white">
                        {analyzeResult.suggestions?.length || 0}
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-orange-400 text-sm">Unique Tags Found</p>
                      <p className="text-2xl font-bold text-white">
                        {analyzeResult.stats.unique_tags || 0}
                      </p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4">
                      <p className="text-orange-400 text-sm">Analysis Time</p>
                      <p className="text-2xl font-bold text-white">
                        {analyzeResult.stats.analysis_time_ms || '~1000'}ms
                      </p>
                    </div>
                  </div>
                </div>
              )}*/}
            </div> 

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-6 py-2 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              <button
                className="px-6 py-2 text-white bg-purple-700 hover:bg-purple-800 rounded-lg font-medium transition-colors"
                onClick={() => {
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