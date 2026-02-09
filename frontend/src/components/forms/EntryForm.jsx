import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Check, AlertCircle, Upload, FileText, Image, File, Trash2, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function EntryForm({ projectId, parentEntryId, onSubmit, onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [aiData, setAIData] = useState(null);
  const [aiDataFiles, setAiDataFiles] = useState([]);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    entry_type: 'insight',
    tags: [],
    status: 'active',
    department: '',
    metadata: {
      ai_suggestions: null,
      attached_files: [],
      file_analysis: null
    },
    parent_entry_id: parentEntryId || null,
    link_type: 'followed_from'
  });

  const entryTypeDescriptions = {
    report: 'Formal report with findings and analysis',
    meeting_note: 'Notes and decisions from a meeting',
    insight: 'Key learnings or realizations',
    decision: 'Important decisions made',
    experiment: 'Documentation of tests or experiments',
    outcome: 'Results and outcomes of work',
    proposal: 'Suggestions or proposals for action',
    result: 'Final results or deliverables'
  };

  // Helper function to format AI analysis for content
  const formatAIAnalysisForContent = (analysisData) => {
    if (!analysisData) return '';

    console.log("From formatAIAnalysisForContent: ", analysisData);
    
    let formattedContent = '';
    
    // Check if analysisData has the full response structure
    const analysis = analysisData.analysis || analysisData;
    
    Object.entries(analysis).forEach(([filename, fileAnalysis]) => {
      formattedContent += `Analysis: ${filename}\n`;
      
      // if (fileAnalysis?.summary) {
      //   formattedContent += `**Summary:** ${fileAnalysis.summary}\n`;
      // }
      
      if (fileAnalysis?.explanation) {
        formattedContent += `\n**Explanation:** ${fileAnalysis.explanation}\n`;
      }
      
      // Use key_points (from API) - NOT keyPoints
      if (fileAnalysis?.key_points && fileAnalysis.key_points.length > 0) {
        formattedContent += `\n**Key Points:**\n`;
        fileAnalysis.key_points.forEach(point => {
          formattedContent += `• ${point}\n`;
        });
      }
      
      // Use action_items (from API) - NOT actionItems
      // if (fileAnalysis?.action_items && fileAnalysis.action_items.length > 0) {
      //   formattedContent += `\n**Action Items:**\n`;
      //   fileAnalysis.action_items.forEach(item => {
      //     formattedContent += `✓ ${item}\n`;
      //   });
      // }
      
      // if (fileAnalysis?.category) {
      //   formattedContent += `\n**Category:** ${fileAnalysis.category}\n`;
      // }
      
      // if (fileAnalysis?.confidence) {
      //   formattedContent += `**Confidence:** ${fileAnalysis.confidence}\n`;
      // }
    });
    
    return formattedContent.trim();
  };

  useEffect(() => {
    if (user?.department) {
      setFormData(prev => ({
        ...prev,
        department: user.department
      }));
    }
  }, [user]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const handleFileInput = async (e) => {
    const files = Array.from(e.target.files);
    await handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    
    const tag = tagInput.trim().toLowerCase();
    
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFiles = async (files) => {
    if (files.length === 0) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown',
      'application/json',
      'application/javascript',
      'text/javascript',
      'application/go',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const nonAllowedTypes = [
      'mp4',
      'avi',
      'mov',
      'wmv',
      'flv',
      'mkv',
      'webm',
      'mp3',
      'wav',
      'ogg',
      'zip',
      'rar',
      '7z',
      'tar',
      'gz'
    ];

    const maxSize = 10 * 1024 * 1024;

    const validFiles = files.filter(file => {
      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (nonAllowedTypes.includes(fileExtension)) {
        setError(
          `File type not allowed: ${file.name}. Videos, audio, and archives are not supported.`
        );
        return false;
      }

      if (file.type.startsWith('image/')) {
        return file.size <= maxSize;
      }

      if (allowedTypes.includes(file.type)) {
        return file.size <= maxSize;
      }

      const textExtensions = ['txt', 'js', 'ts', 'json', 'md', 'csv'];
      if (!file.type && textExtensions.includes(fileExtension)) {
        return file.size <= maxSize;
      }

      setError(
        `File type not supported: ${file.name}. Please upload document or image files only.`
      );
      return false;
    });

    if (validFiles.length === 0) return;

    if (validFiles.length > 0) {
      setError('');
    }

    const newFiles = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    if (useAI) {
      setTimeout(() => {
        analyzeFiles(newFiles);
      }, 500);
    }
  };

  const addFileAnalysis = (analysisData) => {
    if (!analysisData) return;
    
    const formattedContent = formatAIAnalysisForContent(analysisData);

    console.log("Formatted Content: 265", formattedContent);
    
    if (formattedContent) {
      setFormData(prev => ({
        ...prev,
        content: prev.content + (prev.content ? '\n\n---\n\n' : '') + formattedContent,
        metadata: {
          ...prev.metadata,
          file_analysis: analysisData
        }
      }));
      
      setAIData(prev => ({
        ...prev,
        analysis: null
      }));
      
      setSuccessMessage('File analysis added to content!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleRemoveFile = (fileId) => {
    const fileToRemove = uploadedFiles.find(f => f.id === fileId);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        attached_files: prev.metadata.attached_files.filter(f => f.id !== fileId)
      }
    }));
  };

  const getFileIcon = (fileType, fileName) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-orange-500" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (fileType.includes('text/')) return <FileText className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5 text-orange-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const analyzeFiles = async (filesToAnalyze = uploadedFiles) => {
    if (filesToAnalyze.length === 0) return;
    
    setUploadingFiles(true);
    setError('');
    
    try {
      setUploadedFiles(prev => prev.map(file => 
        filesToAnalyze.find(f => f.id === file.id) 
          ? { ...file, status: 'uploading', progress: 0 }
          : file
      ));

      const formDataToSend = new FormData();
      filesToAnalyze.forEach(file => {
        formDataToSend.append('files', file.file);
      });

      const progressInterval = setInterval(() => {
        setUploadedFiles(prev => prev.map(file => {
          if (filesToAnalyze.find(f => f.id === file.id) && file.progress < 90) {
            return { ...file, progress: file.progress + 10 };
          }
          return file;
        }));
      }, 300);

      const response = await fetch(
        `${import.meta.env.VITE_API_BACKEND}/api/ai/analyze-files`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: formDataToSend
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to analyze files: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();


      setAIData(data);

      console.log('File analysis results:', data.analysis);

      setUploadedFiles(prev => prev.map(file => 
        filesToAnalyze.find(f => f.id === file.id) 
          ? { ...file, status: 'completed', progress: 100 }
          : file
      ));

      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          attached_files: [
            ...prev.metadata.attached_files,
            ...filesToAnalyze.map(file => ({
              id: file.id,
              name: file.name,
              type: file.type,
              size: file.size,
              analysis: data.analysis?.[file.name] || null
            }))
          ]
        }
      }));

      if (data.insights && data.insights.length > 0) {
        const insightsText = data.insights.join('\n• ');
        setFormData(prev => ({
          ...prev,
          content: prev.content + (prev.content ? '\n\n' : '') + `### File Analysis Insights\n• ${insightsText}`
        }));
        setSuccessMessage('Files analyzed and insights added to content');
        setTimeout(() => setSuccessMessage(''), 3000);
      }

    } catch (err) {
      console.error('File analysis error:', err);
      
      // Set fallback aiData for the suggestions display
      const fallbackAIData = {
        suggestions: {
          tags: generateFallbackTags(formData.content, formData.title, formData.entry_type),
          summary: generateFallbackSummary(formData.content, formData.title),
          key_points: extractKeyPoints(formData.content),
          confidence: 'low',
          generated_at: new Date().toISOString()
        }
      };
      
      setAIData(fallbackAIData);
      
      setUploadedFiles(prev => prev.map(file => 
        filesToAnalyze.find(f => f.id === file.id) 
          ? { ...file, status: 'error', progress: 0 }
          : file
      ));
      setError(`Failed to analyze some files: ${err.message || err.toString()}`);
      const fallbackInsights = filesToAnalyze.map(file => {
        const insights = [`File: ${file.name} (${formatFileSize(file.size)})`];
        if (file.type.includes('image/')) {
          insights.push('Image file detected');
        } else if (file.type.includes('pdf')) {
          insights.push('PDF document ');
        } else if (file.type.includes('text/')) {
          insights.push('Text file');
        }
        return insights.join(' - ');
      });

      if (fallbackInsights.length > 0) {
        setFormData(prev => ({
          ...prev,
          content: prev.content + (prev.content ? '\n\n' : '') + `### Files attached (${filesToAnalyze.length})\n• ${fallbackInsights.join('\n• ')}`
        }));
        setSuccessMessage('Files attached with basic metadata');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleAnalyzeFiles = async () => {
    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length > 0) {
      await analyzeFiles(pendingFiles);
    }
  };

  const handleAISuggestions = async () => {
    setGeneratingAI(true);
    setError('');
    
    try {
      const hasContent = formData.content.trim().length > 0 || 
                         formData.title.trim().length > 0 || 
                         uploadedFiles.length > 0;
      
      if (!hasContent) {
        throw new Error('Please add some content, title, or files to generate AI suggestions');
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BACKEND}/api/ai/suggestions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({
            title: formData.title,
            content: formData.content,
            entry_type: formData.entry_type,
            files: uploadedFiles.map(f => ({
              name: f.name,
              type: f.type,
              size: f.size
            }))
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to generate AI suggestions');
      }
      
      const data = await response.json();
      console.log('AI suggestions received:', data);
      
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          ai_suggestions: {
            ...data,
            generated_at: new Date().toISOString()
          }
        }
      }));

      setAIData(data);
      
      setSuccessMessage('AI suggestions generated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      console.error('AI suggestions error:', err);
      
      // Fallback suggestions based on content
      const fallbackSuggestions = {
        tags: generateFallbackTags(formData.content, formData.title, formData.entry_type),
        summary: generateFallbackSummary(formData.content, formData.title),
        key_points: extractKeyPoints(formData.content),
        confidence: 'medium',
        generated_at: new Date().toISOString()
      };
      
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          ai_suggestions: fallbackSuggestions
        }
      }));
      
      setSuccessMessage('Generated basic suggestions (AI service unavailable)');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } finally {
      setGeneratingAI(false);
    }
  };

  const generateFallbackTags = (content, title, entryType) => {
    const tags = new Set();
    
    if (entryType) {
      tags.add(entryType.replace('_', '-'));
    }
    
    const text = `${title} ${content}`.toLowerCase();
    const words = text.split(/\s+/).filter(word => word.length > 3);
    
    const commonKeywords = [
      'analysis', 'report', 'meeting', 'decision', 'experiment',
      'result', 'proposal', 'insight', 'data', 'research',
      'development', 'design', 'testing', 'review', 'update'
    ];
    
    commonKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.add(keyword);
      }
    });
    
    const wordFrequency = {};
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
    
    const sortedWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
    
    sortedWords.forEach(word => tags.add(word));
    
    return Array.from(tags).slice(0, 5);
  };

  const generateFallbackSummary = (content, title) => {
    if (content.length > 0) {
      return content.length > 150 
        ? content.substring(0, 150) + '...'
        : content;
    }
    return `Entry about "${title}" - add more details for better summary.`;
  };

  const extractKeyPoints = (content) => {
    if (!content.trim()) return [];
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 3).map(s => s.trim());
  };

  const applyAllSuggestions = () => {
    // Use aiData if available, otherwise fall back to formData.metadata.ai_suggestions
    const suggestions = aiData?.suggestions || formData.metadata.ai_suggestions;
    
    if (!suggestions) return;
    
    // Apply tags
    const newTags = [...new Set([...formData.tags, ...(suggestions.tags || [])])];
    
    // Apply summary to content if not already there
    let newContent = formData.content;
    if (suggestions.summary && !formData.content.includes(suggestions.summary.substring(0, 50))) {
      newContent = formData.content + (formData.content ? '\n\n' : '') + 
                   `AI Summary: ${suggestions.summary}`;
    }
    
    // Add key points if not already there
    if (suggestions.key_points && suggestions.key_points.length > 0) {
      const keyPointsText = suggestions.key_points.join('\n• ');
      if (!formData.content.includes(keyPointsText.substring(0, 50))) {
        newContent += (newContent ? '\n\n' : '') + `Key Points:\n• ${keyPointsText}`;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      tags: newTags,
      content: newContent
    }));
    
    setSuccessMessage('All AI suggestions applied!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      const validTypes = ['report', 'meeting_note', 'insight', 'decision', 
                         'experiment', 'outcome', 'proposal', 'result'];
      if (!validTypes.includes(formData.entry_type)) {
        throw new Error('Invalid entry type');
      }

      const fileData = uploadedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        analysis: formData.metadata.file_analysis?.[file.name] || // Check file_analysis first
                formData.metadata.attached_files.find(f => f.id === file.id)?.analysis || null
      }));

      const payload = {
        title: formData.title,
        content: formData.content,
        entry_type: formData.entry_type,
        project_id: projectId || null,
        status: formData.status,
        department: formData.department,
        tags: formData.tags,
        metadata: {
          ...formData.metadata, // This includes file_analysis
          attached_files: fileData
        },
        parent_entry_id: formData.parent_entry_id,
        link_type: formData.link_type
      };

      console.log('Creating entry with files:', payload);

      const response = await fetch(
        `${import.meta.env.VITE_API_BACKEND}/api/entries`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(payload),
          credentials: 'include'
        }
      );

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create entry');
      }

      console.log('Entry created successfully:', responseData);
      
      setSuccessMessage('Entry created successfully!');
      
      if (onSubmit) {
        await onSubmit(responseData.entry);
      }
      
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Submit error:', err);
      
      if (err.message.includes('401') || err.message.includes('token')) {
        setError('Session expired. Please log in again.');
      } else if (err.message.includes('403')) {
        setError('You do not have permission to create entries in this project.');
      } else if (err.message.includes('network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(err.message || 'Failed to create entry. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-orange-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-orange-300">
              {parentEntryId ? 'Add Related Entry' : 'Add Knowledge'}
            </h2>
            <p className="text-sm text-orange-400 mt-1">
              {parentEntryId ? 'Connect this to an existing entry' : 'Document new knowledge'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-orange-400 hover:text-orange-300 transition-colors p-1 hover:bg-gray-800 rounded-lg"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
              <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="bg-gradient-to-r from-orange-950/30 to-amber-950/30 border border-orange-800 rounded-lg p-4 hover:border-orange-700 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="pt-0.5">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-orange-300">
                      AI Assistance
                    </span>
                    
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useAI}
                      onClick={() => setUseAI(!useAI)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 focus:ring-offset-gray-900 ${useAI ? 'bg-orange-600' : 'bg-gray-700'}`}
                      disabled={uploadingFiles}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAI ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                  
                  <p className="text-sm text-orange-400 mb-3">
                    Get smart tag suggestions, analyze files, and generate insights powered by AI.
                  </p>
                  
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${useAI ? 'bg-orange-900/40 text-orange-300' : 'bg-gray-800 text-gray-400'}`}>
                    {useAI ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        AI assistance enabled
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        AI assistance disabled
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {useAI && ( 
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-orange-400">
                  Attach Files for AI Analysis
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-orange-400 hover:text-orange-300 font-medium flex items-center gap-1"
                  disabled={uploadingFiles}
                >
                  <Upload className="w-4 h-4" />
                  Browse Files
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInput}
                multiple
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                className="hidden"
                disabled={uploadingFiles || loading}
              />

              <div
                className={`border-2 border-dashed rounded-xl transition-all ${isDragging ? 'border-orange-500 bg-orange-950/20' : 'border-gray-700 hover:border-orange-600'} ${uploadingFiles ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !uploadingFiles && fileInputRef.current?.click()}
              >
                <div className="p-8 text-center">
                  <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-orange-500' : 'text-gray-600'}`} />
                  <p className="text-orange-300 font-medium mb-2">
                    {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-gray-400">
                    or click to browse. Supports PDF, DOC, TXT, Images (max 10MB each)
                  </p>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-400">
                      Files ({uploadedFiles.length})
                    </span>
                    {useAI && uploadedFiles.some(f => f.status === 'pending') && (
                      <button
                        type="button"
                        onClick={handleAnalyzeFiles}
                        disabled={uploadingFiles}
                        className="text-sm bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                      >
                        {uploadingFiles ? (
                          <>
                            <Loader className="w-3 h-3 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Analyze with AI
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {uploadedFiles.map(file => (
                      <div
                        key={file.id}
                        className={`flex items-center gap-4 p-3 rounded-lg border ${file.status === 'error' ? 'border-red-800 bg-red-900/30' : file.status === 'completed' ? 'border-green-800 bg-green-900/30' : 'border-gray-700'}`}
                      >
                        <div className={`p-2 rounded-lg ${file.status === 'error' ? 'bg-red-900/40 text-red-400' : file.status === 'completed' ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-orange-500'}`}>
                          {getFileIcon(file.type, file.name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-gray-200 text-sm truncate">
                              {file.name}
                            </p>
                            <span className="text-xs text-gray-400">
                              {formatFileSize(file.size)}
                            </span>
                          </div>

                          {(file.status === 'uploading' || file.status === 'analyzing') && (
                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-orange-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${file.progress}%` }}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs font-medium ${file.status === 'error' ? 'text-red-400' : file.status === 'completed' ? 'text-green-400' : 'text-orange-400'}`}>
                              {file.status === 'pending' && 'Ready to analyze'}
                              {file.status === 'uploading' && 'Uploading...'}
                              {file.status === 'analyzing' && 'Analyzing...'}
                              {file.status === 'completed' && 'Analysis complete'}
                              {file.status === 'error' && 'Analysis failed'}
                            </span>
                            {file.status === 'uploading' || file.status === 'analyzing' ? (
                              <span className="text-xs text-gray-400">{file.progress}%</span>
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          disabled={uploadingFiles}
                          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {useAI && aiData?.analysis && Object.keys(aiData.analysis).length > 0 && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-orange-300">AI File Analysis Results</h3>
                        <button
                          type="button"
                          onClick={() => addFileAnalysis(aiData.analysis)}
                          className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Add All to Content
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {Object.entries(aiData.analysis).map(([filename, analysisData]) => (
                          <div key={filename} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-200 text-sm">{filename}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400">
                                    {analysisData?.type || 'Unknown type'} • {analysisData?.size ? formatFileSize(analysisData.size) : 'Unknown size'}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                analysisData?.confidence === 'high'
                                  ? 'bg-green-900/40 text-green-300'
                                  : analysisData?.confidence === 'medium'
                                  ? 'bg-yellow-900/40 text-yellow-300'
                                  : 'bg-red-900/40 text-red-300'
                              }`}>
                                {analysisData?.confidence || 'medium'} confidence
                              </span>
                            </div>
                            
                            {/* Summary Section */}
                            {analysisData?.summary && (
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Summary:</label>
                                <div className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white min-h-[60px] whitespace-pre-wrap">
                                  {analysisData.summary}
                                </div>
                              </div>
                            )}
                            
                            {/* Key Points Section */}
                            {analysisData?.key_points && analysisData.key_points.length > 0 && (
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Key Points:</label>
                                <div className="space-y-2">
                                  {analysisData.key_points.map((point, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      {/* Custom Bullet Point */}
                                      <span className="text-orange-500 mt-1 flex-shrink-0">•</span>
                                      
                                      {/* Read-only Point Display */}
                                      <div className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white whitespace-pre-wrap">
                                        {point}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Action Items Section */}
                            {analysisData?.action_items && analysisData.action_items.length > 0 && (
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Suggested Actions:</label>
                                <div className="space-y-1">
                                  {analysisData.action_items.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                                      <span className="text-green-500 mt-0.5">✓</span>
                                      <span>{item}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Category and Explanation */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              {analysisData?.category && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-400 mb-1">Category:</label>
                                  <span className="text-sm text-gray-300">{analysisData.category}</span>
                                </div>
                              )}
                              {analysisData?.type && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-400 mb-1">File Type:</label>
                                  <span className="text-sm text-gray-300">{analysisData.type}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-3 border-t border-gray-700">
                              <button
                                type="button"
                                onClick={() => {
                                  const singleFileAnalysis = { [filename]: analysisData };
                                  
                                  setFormData(prev => ({
                                    ...prev,
                                    content: prev.content + (prev.content ? '\n\n' : '') + 
                                             `## 📄 Analysis: ${filename}\n` +
                                             `**Summary:** ${analysisData.summary || ''}\n` +
                                             (analysisData.explanation ? `\n**Explanation:** ${analysisData.explanation}\n` : '') +
                                             (analysisData.key_points?.length ? `\n**Key Points:**\n${analysisData.key_points.map(p => `• ${p}`).join('\n')}\n` : '') +
                                             (analysisData.action_items?.length ? `\n**Action Items:**\n${analysisData.action_items.map(a => `✓ ${a}`).join('\n')}\n` : '')
                                  }));
                                  
                                  setSuccessMessage(`Added ${filename} analysis to content!`);
                                  setTimeout(() => setSuccessMessage(''), 3000);
                                }}
                                className="flex-1 px-3 py-2 bg-gray-800 text-orange-400 text-sm rounded hover:bg-gray-700 transition-colors border border-gray-700"
                              >
                                Add This File Only
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  // Add just the summary and key points
                                  const briefContent = `**${filename}**: ${analysisData.summary}\n• ${analysisData.key_points?.join('\n• ') || ''}`;
                                  
                                  setFormData(prev => ({
                                    ...prev,
                                    content: prev.content + (prev.content ? '\n\n' : '') + briefContent
                                  }));
                                  
                                  setSuccessMessage(`Added brief analysis for ${filename}!`);
                                  setTimeout(() => setSuccessMessage(''), 3000);
                                }}
                                className="px-3 py-2 bg-gray-800 text-gray-400 text-sm rounded hover:bg-gray-700 transition-colors border border-gray-700"
                              >
                                Add Brief
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-orange-400 mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-colors text-white"
              placeholder="What is this knowledge about?"
              required
              disabled={loading || uploadingFiles}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="entry_type" className="block text-sm font-medium text-orange-400">
                Entry Type *
              </label>
              <span className="text-sm text-orange-300">
                {entryTypeDescriptions[formData.entry_type]}
              </span>
            </div>
            <select
              id="entry_type"
              value={formData.entry_type}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_type: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-colors appearance-none text-white"
              disabled={loading || uploadingFiles}
            >
              <option value="report" className="bg-gray-800">📊 Report</option>
              <option value="meeting_note" className="bg-gray-800">📝 Meeting Note</option>
              <option value="insight" className="bg-gray-800">💡 Insight</option>
              <option value="decision" className="bg-gray-800">✅ Decision</option>
              <option value="experiment" className="bg-gray-800">🔬 Experiment</option>
              <option value="outcome" className="bg-gray-800">🎯 Outcome</option>
              <option value="proposal" className="bg-gray-800">📋 Proposal</option>
              <option value="result" className="bg-gray-800">📈 Result</option>
            </select>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-orange-400 mb-2">
              Content
              <span className="text-gray-400 text-sm font-normal ml-1">
                (What is the content about?)
              </span>
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-colors text-white min-h-[200px] resize-y"
              placeholder="Describe the details, findings, insights, or results..."
              disabled={loading || uploadingFiles}
            />
            
            {useAI && !generatingAI && (formData.content.trim() || formData.title.trim() || uploadedFiles.length > 0) && (
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAISuggestions}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all font-medium text-sm"
                  disabled={loading || uploadingFiles}
                >
                  <Sparkles className="w-4 h-4" />
                  Get AI Suggestions
                </button>
                <span className="text-sm text-gray-400">
                  We'll analyze your content and suggest tags, summary, and more.
                </span>
              </div>
            )}
            
            {useAI && aiData?.analysis && Object.keys(aiData.analysis).length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => addFileAnalysis(aiData.analysis)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-900/40 text-orange-300 text-sm rounded-lg hover:bg-orange-900/60 transition-colors border border-orange-700"
                >
                  <Sparkles className="w-3 h-3" />
                  Integrate File Analysis
                </button>
              </div>
            )}
            
            {generatingAI && (
              <div className="mt-3 flex items-center gap-3 text-orange-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                <span className="text-sm font-medium">Analyzing content and generating suggestions...</span>
              </div>
            )}
          </div>

          {useAI && formData.metadata.ai_suggestions && (
            <div className="bg-gradient-to-br from-orange-950/20 via-gray-900 to-amber-950/20 border border-orange-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-900/40 rounded-lg">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-300">AI Suggestions</h3>
                    <p className="text-xs text-gray-400">
                      Generated {new Date(formData.metadata.ai_suggestions.generated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    (aiData?.suggestions?.confidence || formData.metadata.ai_suggestions.confidence) === 'high'
                      ? 'bg-green-900/40 text-green-300'
                      : (aiData?.suggestions?.confidence || formData.metadata.ai_suggestions.confidence) === 'medium'
                      ? 'bg-yellow-900/40 text-yellow-300'
                      : 'bg-red-900/40 text-red-300'
                  }`}>
                    {(aiData?.suggestions?.confidence || formData.metadata.ai_suggestions.confidence || 'medium')} confidence
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, ai_suggestions: null }
                      }));
                      setAIData(null);
                    }}
                    className="text-gray-400 hover:text-gray-300 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {(aiData?.suggestions?.tags || formData.metadata.ai_suggestions.tags)?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-orange-300 mb-2">Suggested Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {(aiData?.suggestions?.tags || formData.metadata.ai_suggestions.tags).map((tag, index) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (!formData.tags.includes(tag)) {
                            setFormData(prev => ({
                              ...prev,
                              tags: [...prev.tags, tag]
                            }));
                            setSuccessMessage(`Added tag: ${tag}`);
                            setTimeout(() => setSuccessMessage(''), 2000);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          formData.tags.includes(tag)
                            ? 'bg-green-900/40 text-green-300 border border-green-700'
                            : 'bg-gray-800 text-orange-400 border border-orange-700 hover:bg-gray-700 hover:border-orange-600'
                        }`}
                      >
                        {formData.tags.includes(tag) ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(aiData?.suggestions?.summary || formData.metadata.ai_suggestions.summary) && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-orange-300 mb-2">Summary:</p>
                  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {aiData?.suggestions?.summary || formData.metadata.ai_suggestions.summary}
                    </p>
                  </div>
                </div>
              )}

              {(aiData?.suggestions?.key_points || formData.metadata.ai_suggestions.key_points)?.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-orange-300 mb-2">Key Points:</p>
                  <ul className="space-y-2">
                    {(aiData?.suggestions?.key_points || formData.metadata.ai_suggestions.key_points).map((point, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-300">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={applyAllSuggestions}
                className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-orange-900/30 to-amber-900/30 text-orange-300 rounded-lg hover:from-orange-800/40 hover:to-amber-800/40 transition-all font-medium text-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Apply All Suggestions
              </button>
            </div>
          )}

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-orange-400 mb-2">
              Tags
              <span className="text-gray-400 text-sm font-normal ml-1">
                (Press Enter or click Add to add tags)
              </span>
            </label>
            <div className="flex gap-2 mb-3">
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-colors text-white"
                placeholder="Add tags like 'api', 'integration', 'bug-fix'..."
                disabled={loading || uploadingFiles}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-5 py-3 bg-gray-800 text-orange-400 rounded-lg hover:bg-gray-700 transition-colors font-medium border border-gray-700"
                disabled={loading || uploadingFiles}
              >
                Add
              </button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-orange-900/40 text-orange-300 rounded-lg text-sm font-medium flex items-center gap-2 group border border-orange-700"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-orange-400 hover:text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      disabled={loading || uploadingFiles}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {parentEntryId && (
            <div>
              <label htmlFor="link_type" className="block text-sm font-medium text-orange-400 mb-2">
                How is this related to the parent entry?
              </label>
              <select
                id="link_type"
                value={formData.link_type}
                onChange={(e) => setFormData(prev => ({ ...prev, link_type: e.target.value }))}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-colors text-white"
                disabled={loading || uploadingFiles}
              >
                <option value="followed_from" className="bg-gray-800">📖 Followed from (continuation)</option>
                <option value="revised_by" className="bg-gray-800">✏️ Revised by (update or correction)</option>
                <option value="related_to" className="bg-gray-800">🔗 Related to (connected topic)</option>
                <option value="built_upon" className="bg-gray-800">🏗️ Built upon (based on this work)</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-gray-800">
            <button
              type="submit"
              disabled={loading || uploadingFiles}
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3.5 rounded-lg font-semibold hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating Entry...
                </span>
              ) : uploadingFiles ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-5 h-5 animate-spin" />
                  Analyzing Files...
                </span>
              ) : (
                'Create Knowledge Entry'
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading || uploadingFiles}
              className="px-8 py-3.5 border border-gray-700 text-orange-300 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}