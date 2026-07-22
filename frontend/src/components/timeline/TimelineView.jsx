import { useState, useMemo } from 'react';
import { Clock, User, Tag, Link as LinkIcon, FolderOpen, AlertCircle, ChevronRight, CornerDownRight, Search, X } from 'lucide-react';

export default function TimelineView({ entries, onSelectEntry, onAddRelated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentId, setSelectedParentId] = useState(null);
  
  const entryTypeColors = {
    proposal: 'bg-orange-900/40 text-white border-orange-700',
    report: 'bg-green-900/40 text-green-300 border-green-700',
    meeting_note: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    insight: 'bg-purple-900/40 text-purple-300 border-purple-700',
    decision: 'bg-red-900/40 text-red-300 border-red-700',
    experiment: 'bg-orange-900/40 text-white border-orange-700',
    outcome: 'bg-teal-900/40 text-teal-300 border-teal-700',
    result: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
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
  
  const { rootEntries, entryMap } = organizeEntries(safeEntries);

  // Filter entries based on search
  const filterEntries = (entriesArray) => {
    if (!searchQuery && !selectedParentId) {
      return entriesArray;
    }
    
    const searchLower = searchQuery.toLowerCase();
    
    const filterTree = (entry) => {
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
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          Invalid Data Format
        </h3>
        <p className="text-white max-w-md mb-2">
          Expected an array of entries but received an object.
        </p>
      </div>
    );
  }

  if (!safeEntries || safeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FolderOpen className="w-16 h-16 text-white mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">
          No Entries Yet
        </h3>
        <p className="text-white max-w-md mb-6">
          Start by creating the first entry for this project timeline.
        </p>
        {onAddRelated && (
          <button
            onClick={() => onAddRelated(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
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
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              isChild 
                ? 'bg-green-600 text-white border border-green-400' 
                : 'bg-orange-600 text-white border border-orange-400'
            } ${entry._highlight ? 'ring-2 ring-orange-400' : ''}`}>
              {isChild ? (
                <CornerDownRight className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
          </div>

          {/* Entry Content */}
          <div className={`flex-1 bg-gray-900 rounded-lg border border-gray-700 p-5 ${
            isChild 
              ? 'border-l-4 border-l-green-500 shadow-sm' 
              : 'shadow-md hover:border-orange-700 transition-colors duration-200'
          }`}>
            {/* Parent reference for children - now clickable */}
            {isChild && entry.parent && (
              <div className="mb-2 text-sm text-white">
                <button
                  onClick={() => {
                    setSelectedParentId(entry.parent.id);
                    setSearchQuery('');
                  }}
                  className="text-white hover:text-orange-200 hover:underline font-medium transition-colors"
                >
                  {entry.parentLinkType === "followed_from" ? "Followed from: " : 
                   entry.parentLinkType === "related_to" ? "Related to: " : 
                   entry.parentLinkType === "built_upon" ? "Built upon: " : 
                   "Revised by: "}
                </button>
                <span className="font-medium text-white"> {entry.parent.title}</span>
              </div>
            )}
            
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3
                  className="text-lg font-semibold text-white mb-2 cursor-pointer hover:text-orange-100 transition-colors"
                  onClick={() => onSelectEntry && onSelectEntry(entry)}
                >
                  {entry.title || 'Untitled Entry'}
                  {entry._highlight && (
                    <span className="ml-2 inline-block w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                  )}
                </h3>

                <div className="flex flex-wrap gap-3 text-sm text-white">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {entry.created_at ? formatDate(entry.created_at) : 'No date'}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {entry.author?.full_name || entry.author_name || 'Unknown Author'}
                    {(entry.author?.department || entry.author_department) && (
                      <span className="text-gray-400">
                        {` · ${entry.author?.department || entry.author_department}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {entry.entry_type && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  entryTypeColors[entry.entry_type] || 'bg-gray-800 text-gray-300 border-gray-700'
                }`}>
                  {entry.entry_type.replace('_', ' ')}
                </span>
              )}
            </div>

            {entry.content && (
              <p className="text-gray-300 mb-4">
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
                <Tag className="w-4 h-4 text-white" />
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(entry.tags) ? (
                    entry.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-orange-900/30 text-white border border-orange-800 rounded text-xs">
                        {tag}
                      </span>
                    ))
                  ) : typeof entry.tags === 'string' ? (
                    JSON.parse(entry.tags).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-orange-900/30 text-white border border-orange-800 rounded text-xs">
                        {tag}
                      </span>
                    ))
                  ) : null}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              {onAddRelated && (
                <button
                  onClick={() => onAddRelated(entry)}
                  className="flex items-center gap-2 text-white hover:text-white font-medium text-sm transition-colors"
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
                      ? 'text-white bg-orange-900/30 px-3 py-1 rounded border border-orange-800' 
                      : 'text-white hover:text-white hover:bg-orange-900/20 px-3 py-1 rounded'
                  }`}
                >
                  {entry.children.length} {entry.children.length === 1 ? 'follow-up' : 'follow-ups'}
                  {selectedParentId === entry.id && (
                    <span className="ml-1 text-white">(selected)</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Render Children */}
        {entry.children && entry.children.length > 0 && (
          <div className="ml-4 sm:ml-8 mt-2">
            {entry.children.map((child, childIndex) => renderEntry(child, true, childIndex))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white" />
          <input
            type="text"
            placeholder="Search entries by title, content, tags, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-600 focus:border-orange-600 outline-none transition-all text-white placeholder-gray-500"
          />
          {(searchQuery || selectedParentId) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedParentId(null);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Active filters info */}
        {(searchQuery || selectedParentId) && (
          <div className="mt-3 pt-3 border-t border-gray-800 text-sm text-white">
            {searchQuery && (
              <div>Searching for: <span className="font-medium text-white">"{searchQuery}"</span></div>
            )}
            {selectedParentId && (
              <div>
                Showing: <span className="font-medium text-white">{entryMap.get(selectedParentId)?.title || 'selected parent'}</span> and follow-ups
                <button
                  onClick={() => setSelectedParentId(null)}
                  className="ml-2 text-white hover:text-white text-xs"
                >
                  (clear)
                </button>
              </div>
            )}
            <div className="mt-1 text-gray-300">
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
          <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-900 rounded-lg border border-gray-800">
            <Search className="w-16 h-16 text-white mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No matching entries found
            </h3>
            <p className="text-white max-w-md mb-4">
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
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