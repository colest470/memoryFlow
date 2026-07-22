import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, Zap, BarChart3, Users, Clock, TrendingUp } from 'lucide-react';
import { getProject } from '../lib/api/projects';
import { entriesAPI } from '../lib/api/entries';
import TimelineView from '../components/timeline/TimelineView';
import EntryForm from '../components/forms/EntryForm';
import ProjectMembers from '../components/projects/ProjectMembers';
import Analysis from '../components/dashboard/Analysis';
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
  const [activeTab, setActiveTab] = useState('timeline');
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
      console.log(result);
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

    const hasAISuggestions = entry.metadata?.ai_suggestions;
    const aiSuggestions = entry.metadata?.ai_suggestions || {};

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-black border border-orange-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="sticky top-0 bg-gradient-to-r from-orange-900 to-orange-950 p-4 sm:p-6 border-b border-orange-700 flex items-start justify-between z-10">
            <div className="flex-1 pr-4 sm:pr-8">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                <h2 className="text-xl sm:text-2xl font-bold text-orange-100 line-clamp-2">{entry.title || 'Untitled Entry'}</h2>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-white">
                <span className="bg-orange-800 bg-opacity-60 px-2 sm:px-3 py-1 rounded-full font-medium">
                  {entry.entry_type?.replace('_', ' ') || 'entry'}
                </span>
                {entry.status && (
                  <span className={`px-2 sm:px-3 py-1 rounded-full font-medium ${
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
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Main Content Column */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {/* Content Section */}
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                    Content
                  </h3>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-gray-200 bg-transparent p-0 text-sm sm:text-base">
                      {entry.content || 'No content provided.'}
                    </pre>
                  </div>
                </div>

                {/* AI Suggestions from Metadata */}
                {hasAISuggestions && (
                  <div className="bg-gradient-to-r from-orange-950/30 to-amber-950/30 rounded-lg border border-orange-800 p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                      AI Insights
                    </h3>
                    
                    {aiSuggestions.summary && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
                        <p className="text-gray-200 bg-gray-800 p-3 rounded border border-gray-700 text-sm">
                          {aiSuggestions.summary}
                        </p>
                      </div>
                    )}
                    
                    {aiSuggestions.key_points && 
                     Array.isArray(aiSuggestions.key_points) && aiSuggestions.key_points.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-white mb-2">Key Points</h4>
                        <ul className="space-y-2">
                          {aiSuggestions.key_points.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-200 text-sm">
                              <span className="text-orange-500 mt-1">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {aiSuggestions.action_items && 
                     Array.isArray(aiSuggestions.action_items) && aiSuggestions.action_items.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-white mb-2">Suggested Actions</h4>
                        <ul className="space-y-2">
                          {aiSuggestions.action_items.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-gray-200 text-sm">
                              <span className="text-green-500 mt-1">›</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {aiSuggestions.category && (
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-white mb-2">Category</h4>
                        <span className="px-3 py-1 bg-orange-900/40 text-orange-300 border border-orange-700 rounded-full text-sm">
                          {aiSuggestions.category}
                        </span>
                      </div>
                    )}
                    
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
                    
                    <div className="mt-4 pt-4 border-t border-orange-800 text-xs text-gray-400">
                      <div className="flex flex-wrap items-center gap-4">
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
                  <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                      Attached Files
                    </h3>
                    <div className="space-y-3">
                      {entry.metadata.attached_files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700 hover:bg-gray-750 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-900/30 rounded flex items-center justify-center">
                              <span className="text-orange-400 font-medium text-xs">
                                {file.name?.split('.').pop()?.toUpperCase() || 'FILE'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-200 text-sm sm:text-base">{file.name || 'Unnamed File'}</p>
                              {file.size && (
                                <p className="text-xs text-gray-400">
                                  {typeof file.size === 'number' 
                                    ? `${(file.size / 1024).toFixed(1)} KB`
                                    : file.size}
                                </p>
                              )}
                            </div>
                          </div>
                          <button className="text-orange-400 hover:text-white text-xs sm:text-sm font-medium">
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Column */}
              <div className="space-y-4 sm:space-y-6">
                {/* Entry Info Card */}
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Entry Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400">Created</p>
                        <p className="font-medium text-white text-sm sm:text-base">{formatDate(entry.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400">Author</p>
                        <p className="font-medium text-white text-sm sm:text-base">{entry.author_name || entry.author?.full_name || 'Unknown'}</p>
                        {entry.author_department && (
                          <p className="text-xs text-gray-500">{entry.author_department}</p>
                        )}
                      </div>
                    </div>
                    
                    {entry.project_title && (
                      <div className="pt-3 border-t border-gray-800">
                        <p className="text-xs sm:text-sm text-gray-400">Project</p>
                        <p className="font-medium text-white text-sm sm:text-base">{entry.project_title}</p>
                      </div>
                    )}

                    {entry.childrenCount !== undefined && (
                      <div className="pt-3 border-t border-gray-800">
                        <p className="text-xs sm:text-sm text-gray-400">Follow-ups</p>
                        <p className="font-medium text-white text-sm sm:text-base">{entry.childrenCount}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags Section */}
                {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 && (
                  <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 sm:px-3 py-1 bg-orange-900/40 text-white border border-orange-700 rounded-full text-xs sm:text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-5 space-y-3">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Actions</h3>
                  
                  {onAddRelated && (
                    <button
                      onClick={() => {
                        onAddRelated(entry);
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Add Follow-up Entry
                    </button>
                  )}
                  
                  <button
                    onClick={copyToClipboard}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                  
                  <button
                    onClick={downloadAsText}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-800/30 text-green-300 rounded-lg hover:bg-green-800/40 transition-colors font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download as Text
                  </button>
                </div>

                {/* JSON View (Debug) */}
                <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 sm:p-5">
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
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex flex-wrap justify-between items-center gap-2">
            <div className="text-xs sm:text-sm text-gray-400">
              Entry ID: <span className="font-mono font-medium text-orange-300">{entry.id}</span>
              {entry.created_at && (
                <span className="ml-4">
                  Created: {new Date(entry.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white font-medium text-sm"
            >
              Close
            </button>
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
        {/* Header Section - Sticky on scroll */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-gray-900 to-black border-b border-gray-900 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          {/* Back Button & Title */}
          <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => window.history.back()}
                className="text-orange-400 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">{project.title}</h1>
                {project.description && (
                  <p className="text-xs sm:text-sm text-orange-400 mt-0.5 sm:mt-1 truncate">{project.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Row - Responsive */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 md:gap-3 mb-4 sm:mb-6">
            <div className="bg-gray-800 bg-opacity-60 rounded-lg p-2 sm:p-3 border border-gray-900">
              <div className="flex items-center gap-1 sm:gap-2 text-white text-[8px] sm:text-xs mb-0.5 sm:mb-1">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Total Entries</span>
                <span className="xs:hidden">Entries</span>
              </div>
              <p className="text-base sm:text-xl md:text-2xl font-bold text-white">{entries?.length || 0}</p>
            </div>
            <div className="bg-gray-800 bg-opacity-60 rounded-lg p-2 sm:p-3 border border-gray-900">
              <div className="flex items-center gap-1 sm:gap-2 text-white text-[8px] sm:text-xs mb-0.5 sm:mb-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Last Entry</span>
                <span className="xs:hidden">Last</span>
              </div>
              <p className="text-xs sm:text-base md:text-lg font-bold text-white truncate">
                {entries?.length > 0
                  ? new Date(entries[0].created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'None'}
              </p>
            </div>
            <div className="bg-gray-800 bg-opacity-60 rounded-lg p-2 sm:p-3 border border-gray-900">
              <div className="flex items-center gap-1 sm:gap-2 text-white text-[8px] sm:text-xs mb-0.5 sm:mb-1">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Status</span>
                <span className="xs:hidden">Stat</span>
              </div>
              <p className="text-xs sm:text-base md:text-lg font-bold text-green-400 capitalize truncate">{project.status}</p>
            </div>
            <div className="bg-gray-800 bg-opacity-60 rounded-lg p-2 sm:p-3 border border-gray-900">
              <div className="flex items-center gap-1 sm:gap-2 text-white text-[8px] sm:text-xs mb-0.5 sm:mb-1">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Owner</span>
                <span className="xs:hidden">By</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white truncate">{project.owner_name}</p>
            </div>
          </div>

          {/* Action Buttons - Scrollable horizontally on mobile */}
          <div className="flex gap-1.5 sm:gap-2 md:gap-3 overflow-x-auto pb-2 sm:pb-0 -mx-1 sm:mx-0 px-1 sm:px-0 scrollbar-hide">
            <button
              onClick={() => {
                setParentEntryId(undefined);
                setShowEntryForm(true);
              }}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors text-white text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Add Entry</span>
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                activeTab === 'timeline'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Entries</span>
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                activeTab === 'analysis'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Analysis</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                activeTab === 'analytics'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${
                activeTab === 'team'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              }`}
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Team</span>
            </button>
          </div>
        </div>

        {/* Main Content - Single scrollable area */}
        <div className="mt-4 sm:mt-6 md:mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-xl shadow-md border border-gray-900 p-4 sm:p-6">
                {activeTab === 'timeline' && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Memory Timeline</h2>
                    
                    {entries?.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-orange-800 mx-auto mb-4" />
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

                {activeTab === 'analysis' && (
                  <>
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl font-semibold text-white">Project Analysis</h2>
                      <button
                        onClick={handleAnalyzeProject}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors font-medium text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={analyzeLoading}
                      >
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                        {analyzeLoading ? 'Analyzing...' : 'Run Analysis'}
                      </button>
                    </div>
                    <Analysis projectId={projectId} />
                  </>
                )}

                {activeTab === 'analytics' && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Project Analytics</h2>
                    <p className="text-orange-400">Analytics view is under construction.</p>
                  </>
                )}

                {activeTab === 'team' && (
                  <>
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Project Team</h2>
                    <ProjectMembers projectId={projectId} />
                  </>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900 rounded-xl shadow-md border border-gray-900 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                  Project Details
                </h3>
                <div className="space-y-3 sm:space-y-4 text-sm">
                  <div className="flex items-start justify-between">
                    <span className="text-orange-400">Status</span>
                    <span className="font-semibold text-green-400 capitalize bg-green-900/30 text-green-300 px-2 py-1 rounded text-xs sm:text-sm">
                      {project.status}
                    </span>
                  </div>
                  {project.department && (
                    <div className="flex items-start justify-between">
                      <span className="text-orange-400">Department</span>
                      <span className="font-medium text-white text-right text-sm">{project.department}</span>
                    </div>
                  )}
                  <div className="flex items-start justify-between pt-3 sm:pt-4 border-t border-orange-800">
                    <span className="text-orange-400">Owner</span>
                    <span className="font-medium text-white text-right flex items-center gap-1 text-sm">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      {project.owner_name}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-orange-400">Total Entries</span>
                    <span className="font-bold text-white bg-orange-900/40 text-white px-2 py-1 rounded text-sm">
                      {entries.length}
                    </span>
                  </div>
                  <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-orange-800">
                    <span className="text-orange-400">Last Updated</span>
                    <span className="font-medium text-white text-sm">
                      {entries?.length > 0
                        ? new Date(entries[0].created_at).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="mt-4 sm:mt-6">
                  <h4 className="text-sm sm:text-md font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
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
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-orange-800">
                    <h4 className="text-xs sm:text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                      Selected Entry
                    </h4>
                    <div className="space-y-3 text-xs sm:text-sm bg-orange-950/20 p-3 rounded-lg border border-orange-800">
                      <p className="font-semibold text-white line-clamp-2">{selectedEntry.title}</p>
                      <p className="text-white line-clamp-3">{selectedEntry.content}</p>
                      {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedEntry.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-orange-900/40 text-white border border-orange-700 rounded text-[10px] sm:text-xs font-medium"
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
        </div>
      </div>

      {/* Modals remain the same */}
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

      {showAnalysisModal && analyzeResult && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-black border border-orange-900/50 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-orange-900/30 flex items-center justify-between bg-gradient-to-r from-orange-950/20 to-black">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-orange-50">Project Analysis Results</h2>
                  <p className="text-xs sm:text-sm text-orange-500/70 mt-1">
                    {analyzeResult.entry_count || entries.length} entries analyzed • {analyzeResult.model || 'AI Model'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-gray-500 hover:text-orange-500 p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto">
              {analyzeResult.analysis?.executive_summary && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-orange-500/80">Executive Summary</h3>
                  </div>
                  <div className="p-3 sm:p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                    <p className="text-sm sm:text-base text-gray-200 leading-relaxed">{analyzeResult.analysis.executive_summary}</p>
                  </div>
                </div>
              )}

              {analyzeResult.analysis?.key_findings && analyzeResult.analysis.key_findings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-orange-500/80">Key Findings</h3>
                  </div>
                  <div className="space-y-2">
                    {analyzeResult.analysis.key_findings.map((finding, idx) => (
                      <div key={idx} className="flex gap-3 p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
                        <span className="text-orange-500 font-bold">•</span>
                        <p className="text-gray-300 text-sm">{finding}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analyzeResult.analysis?.recommendations && analyzeResult.analysis.recommendations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-orange-500/80">Recommendations</h3>
                  </div>
                  <div className="space-y-2">
                    {analyzeResult.analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-3 bg-orange-950/10 border border-orange-900/20 rounded-lg">
                        <p className="text-sm text-orange-100/90">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-zinc-800 bg-zinc-950/50 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => {
                  const content = `PROJECT ANALYSIS RESULTS\n\n` +
                    `Executive Summary:\n${analyzeResult.analysis?.executive_summary || 'N/A'}\n\n` +
                    `Key Findings:\n${analyzeResult.analysis?.key_findings?.join('\n') || 'N/A'}\n\n` +
                    `Recommendations:\n${analyzeResult.analysis?.recommendations?.join('\n') || 'N/A'}`;
                  
                  const element = document.createElement("a");
                  const file = new Blob([content], {type: 'text/plain'});
                  element.href = URL.createObjectURL(file);
                  element.download = "analysis-report.txt";
                  document.body.appendChild(element);
                  element.click();
                }}
                className="px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-all flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                Download .txt
              </button>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-3 sm:px-4 py-2 text-gray-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}