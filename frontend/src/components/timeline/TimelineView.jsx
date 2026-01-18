import { useState, useMemo } from 'react';
import { Clock, User, Tag, Link as LinkIcon, FolderOpen, AlertCircle, ChevronRight, CornerDownRight, Search, X } from 'lucide-react';

export default function TimelineView({ entries, onSelectEntry, onAddRelated }) {
  console.log('TimelineView received entries:', entries);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(null);
  
  const entryTypeColors = {
    proposal: 'bg-blue-100 text-blue-800 border-blue-200',
    report: 'bg-green-100 text-green-800 border-green-200',
    meeting_note: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    insight: 'bg-purple-100 text-purple-800 border-purple-200',
    decision: 'bg-red-100 text-red-800 border-red-200',
    experiment: 'bg-orange-100 text-orange-800 border-orange-200',
    outcome: 'bg-teal-100 text-teal-800 border-teal-200',
    result: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Build hierarchical structure
  const organizeEntries = (entriesArray) => {
    const entryMap = new Map();
    const rootEntries = [];
    
    // Create map and basic structure
    entriesArray.forEach(entry => {
      entryMap.set(entry.id, {
        ...entry,
        children: [],
        isRoot: true
      });
    });
    
    // Build parent-child relationships
    entriesArray.forEach(entry => {
      const parentId = entry.parent_id || entry.related_to || entry.parent_entry_id;
      
      if (parentId && entryMap.has(parentId)) {
        const parentEntry = entryMap.get(parentId);
        const childEntry = entryMap.get(entry.id);
        
        parentEntry.children.push(childEntry);
        childEntry.isRoot = false;
        childEntry.parent = parentEntry;
      }
    });
    
    // Collect root entries
    entryMap.forEach(entry => {
      if (entry.isRoot) {
        rootEntries.push(entry);
      }
    });
    
    // Sort by date
    const sortByDate = (a, b) => new Date(a.created_at) - new Date(b.created_at);
    rootEntries.sort(sortByDate);
    entryMap.forEach(entry => {
      if (entry.children.length > 0) {
        entry.children.sort(sortByDate);
      }
    });
    
    return { rootEntries, entryMap };
  };

  const getEntriesArray = () => {
    if (Array.isArray(entries)) {
      return entries;
    }
    
    if (entries && entries.entries && Array.isArray(entries.entries)) {
      return entries.entries;
    }
    
    if (!entries) {
      return [];
    }
    
    if (entries.data && Array.isArray(entries.data)) {
      return entries.data;
    }
    
    if (entries.items && Array.isArray(entries.items)) {
      return entries.items;
    }
    
    if (entries.results && Array.isArray(entries.results)) {
      return entries.results;
    }
    
    if (typeof entries === 'object' && entries !== null) {
      if (entries.length !== undefined) {
        try {
          return Array.from(entries);
        } catch (error) {
          console.error('Failed to convert to array:', error);
        }
      }
      return [entries];
    }
    
    if (typeof entries === 'string') {
      try {
        const parsed = JSON.parse(entries);
        return getEntriesArray(parsed);
      } catch (error) {
        return [];
      }
    }
    
    return [];
  };

  const safeEntries = getEntriesArray();
  console.log('Safe entries array:', safeEntries);
  
  // Organize entries hierarchically
  const { rootEntries, entryMap } = organizeEntries(safeEntries);

  // Filter entries based on search
  const filterEntries = (entriesArray) => {
    if (!searchQuery && !selectedParentId) {
      return entriesArray;
    }
    
    const searchLower = searchQuery.toLowerCase();
    
    const filterTree = (entry) => {
      // Check if entry matches search
      const matchesSearch = !searchQuery || 
        entry.title?.toLowerCase().includes(searchLower) ||
        entry.content?.toLowerCase().includes(searchLower) ||
        entry.entry_type?.toLowerCase().includes(searchLower) ||
        (Array.isArray(entry.tags) && entry.tags.some(tag => 
          tag.toLowerCase().includes(searchLower)
        ));
      
      // Check if entry matches parent filter
      const matchesParent = !selectedParentId || 
        entry.id === selectedParentId ||
        (entry.parent && entry.parent.id === selectedParentId);
      
      // Filter children
      const filteredChildren = entry.children ? 
        entry.children.map(filterTree).filter(child => child !== null) : [];
      
      // Keep entry if it matches or has matching children
      if ((matchesSearch && matchesParent) || filteredChildren.length > 0) {
        return {
          ...entry,
          children: filteredChildren,
          _highlight: matchesSearch && searchQuery !== ''
        };
      }
      
      return null;
    };
    
    return entriesArray.map(filterTree).filter(entry => entry !== null);
  };

  // Filter the root entries
  const filteredRootEntries = filterEntries(rootEntries);

  if (entries && typeof entries === 'object' && !Array.isArray(entries) && safeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Invalid Data Format
        </h3>
        <p className="text-slate-500 max-w-md mb-2">
          Expected an array of entries but received an object.
        </p>
      </div>
    );
  }

  if (!safeEntries || safeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          No Entries Yet
        </h3>
        <p className="text-slate-500 max-w-md mb-6">
          Start by creating the first entry for this project timeline.
        </p>
        {onAddRelated && (
          <button
            onClick={() => onAddRelated(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <LinkIcon className="w-4 h-4" />
            Create First Entry
          </button>
        )}
      </div>
    );
  }

  // Render entry recursively
  const renderEntry = (entry, isChild = false, index = 0) => {
    if (entry.isChild) {
      isChild = true;
    }
    return (
      <div key={entry.id} className={`${isChild ? 'mt-4' : 'mb-8'}`}>
        {/* Parent Entry */}
        <div className={`flex gap-4 ${isChild ? 'ml-8' : ''}`}>
          {/* Number/Icon */}
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
              isChild ? 'bg-green-600' : 'bg-blue-600'
            } ${entry._highlight ? 'ring-2 ring-yellow-400' : ''}`}>
              {isChild ? (
                <CornerDownRight className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
          </div>

          {/* Entry Content */}
          <div className={`flex-1 bg-white rounded-lg border p-5 ${isChild ? 'border-l-4 border-l-green-400' : 'shadow-sm'}`}>
            {/* Parent reference for children - now clickable */}
            {isChild && entry.parent && (
              <div className="mb-2 text-sm text-slate-500">
                <button
                  onClick={() => {
                    setSelectedParentId(entry.parent.id);
                    setSearchQuery('');
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
                >
                  {entry.parentLinkType === "followed_from" ? "Followed from: " : 
                   entry.parentLinkType === "related_to" ? "Related to: " : 
                   entry.parentLinkType === "built_upon" ? "Built upon: " : 
                   "Revised by: "}
                </button>
                <span className="font-medium"> {entry.parent.title}</span>
              </div>
            )}
            
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3
                  className="text-lg font-semibold text-slate-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => onSelectEntry && onSelectEntry(entry)}
                >
                  {entry.title || 'Untitled Entry'}
                  {entry._highlight && (
                    <span className="ml-2 inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                  )}
                </h3>

                <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {entry.created_at ? formatDate(entry.created_at) : 'No date'}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {entry.author?.full_name || entry.author_name || 'Unknown Author'}
                    {(entry.author?.department || entry.author_department) && (
                      ` · ${entry.author?.department || entry.author_department}`
                    )}
                  </div>
                </div>
              </div>

              {entry.entry_type && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  entryTypeColors[entry.entry_type] || 'bg-slate-100 text-slate-800 border-slate-200'
                }`}>
                  {entry.entry_type.replace('_', ' ')}
                </span>
              )}
            </div>

            {entry.content && (
              <p className="text-slate-700 mb-4">
                {(() => {
                  if (typeof entry.content === 'string') {
                    if (entry.content.split(" ").length > 50) {
                      return entry.content.slice(0, 200) + "...";
                    }
                    return entry.content;
                  }
                  return JSON.stringify(entry.content);
                })()}
              </p>
            )}

            {entry.tags && (
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-slate-400" />
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(entry.tags) ? (
                    entry.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                        {tag}
                      </span>
                    ))
                  ) : typeof entry.tags === 'string' ? (
                    JSON.parse(entry.tags).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                        {tag}
                      </span>
                    ))
                  ) : null}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              {onAddRelated && (
                <button
                  onClick={() => onAddRelated(entry)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                >
                  <LinkIcon className="w-4 h-4" />
                  Add Follow-up
                </button>
              )}
              
              {entry.children && entry.children.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedParentId === entry.id) {
                      setSelectedParentId(null);
                    } else {
                      setSelectedParentId(entry.id);
                      setSearchQuery('');
                    }
                  }}
                  className={`text-sm font-medium transition-colors ${
                    selectedParentId === entry.id 
                      ? 'text-blue-700 bg-blue-50 px-3 py-1 rounded' 
                      : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1 rounded'
                  }`}
                >
                  {entry.children.length} {entry.children.length === 1 ? 'follow-up' : 'follow-ups'}
                  {selectedParentId === entry.id && (
                    <span className="ml-1 text-blue-700">(selected)</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Render Children */}
        {entry.children && entry.children.length > 0 && (
          <div className="ml-8 mt-2">
            {entry.children.map((child, childIndex) => renderEntry(child, true, childIndex))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search entries by title, content, tags, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
          {(searchQuery || selectedParentId) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedParentId(null);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Active filters info */}
        {(searchQuery || selectedParentId) && (
          <div className="mt-3 pt-3 border-t text-sm text-slate-600">
            {searchQuery && (
              <div>Searching for: <span className="font-medium">"{searchQuery}"</span></div>
            )}
            {selectedParentId && (
              <div>
                Showing: <span className="font-medium">{entryMap.get(selectedParentId)?.title || 'selected parent'}</span> and follow-ups
                <button
                  onClick={() => setSelectedParentId(null)}
                  className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                >
                  (clear)
                </button>
              </div>
            )}
            <div className="mt-1">
              Found {filteredRootEntries.length} {filteredRootEntries.length === 1 ? 'entry' : 'entries'}
            </div>
          </div>
        )}
      </div>

      {/* Entries List */}
      <div className="space-y-4">
        {filteredRootEntries.length > 0 ? (
          filteredRootEntries.map((entry, index) => renderEntry(entry, false, index))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg border">
            <Search className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No matching entries found
            </h3>
            <p className="text-slate-500 max-w-md mb-4">
              {searchQuery 
                ? `No entries found matching "${searchQuery}". Try different keywords.`
                : 'No entries available with the current filters.'}
            </p>
            {(searchQuery || selectedParentId) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedParentId(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}