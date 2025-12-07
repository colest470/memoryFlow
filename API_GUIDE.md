# MemoryFlow API Usage Guide

## Authentication Setup

All API requests require a Bearer token in the Authorization header:

```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
};
```

---

## Entries API

### 1. Create Entry

**Endpoint**: `POST /api/entries`

**Simple Upload**:
```javascript
const response = await fetch(`${API_URL}/api/entries`, {
  method: 'POST',
  headers: getAuthHeader(),
  body: JSON.stringify({
    title: 'Q3 Planning Meeting Insights',
    content: 'Discussed roadmap priorities and timeline',
    entry_type: 'meeting_note',
    tags: ['planning', 'q3', 'strategy'],
    status: 'active'
  })
});

const { entry } = await response.json();
```

**AI-Assisted**:
```javascript
const response = await fetch(`${API_URL}/api/entries`, {
  method: 'POST',
  headers: getAuthHeader(),
  body: JSON.stringify({
    title: 'Database Performance Issue Resolution',
    content: 'Found N+1 query problem in user profile service...',
    entry_type: 'insight',
    tags: [],
    metadata: {
      ai_generated_tags: ['performance', 'database', 'optimization'],
      ai_summary: 'Identified and fixed N+1 query issue in user service',
      ai_category: 'technical'
    }
  })
});
```

**With Timeline Link**:
```javascript
const response = await fetch(`${API_URL}/api/entries`, {
  method: 'POST',
  headers: getAuthHeader(),
  body: JSON.stringify({
    title: 'Implementation of Performance Fix',
    content: 'Successfully deployed optimization fix...',
    entry_type: 'outcome',
    parent_entry_id: 'previous-entry-uuid',
    link_type: 'followed_from'
  })
});
```

---

### 2. Search Entries

**Endpoint**: `GET /api/entries`

**Simple Search**:
```javascript
const response = await fetch(
  `${API_URL}/api/entries?q=database+performance&limit=20`,
  { headers: getAuthHeader() }
);

const { entries, pagination } = await response.json();
console.log(`Found ${pagination.total} results, showing ${entries.length}`);
```

**Advanced Filters**:
```javascript
const params = new URLSearchParams({
  q: 'optimization',
  entry_type: 'insight',
  status: 'active',
  department: 'Engineering',
  sort: 'created_at',
  order: 'desc',
  limit: 20,
  offset: 0
});

const response = await fetch(
  `${API_URL}/api/entries?${params}`,
  { headers: getAuthHeader() }
);
```

**Filter by Tags**:
```javascript
const params = new URLSearchParams({
  tags: 'database,performance,optimization'
});

const response = await fetch(
  `${API_URL}/api/entries?${params}`,
  { headers: getAuthHeader() }
);
```

---

### 3. Get Entry with Connections

**Endpoint**: `GET /api/entries/:id`

```javascript
const response = await fetch(
  `${API_URL}/api/entries/${entryId}`,
  { headers: getAuthHeader() }
);

const { entry, connections } = await response.json();

console.log(entry.title);
console.log(`${connections.length} related entries`);

connections.forEach(conn => {
  console.log(`- ${conn.title} (${conn.link_type})`);
});
```

---

### 4. Update Entry

**Endpoint**: `PUT /api/entries/:id`

```javascript
const response = await fetch(
  `${API_URL}/api/entries/${entryId}`,
  {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify({
      title: 'Updated Title',
      status: 'lesson_learned',
      tags: ['important', 'reviewed']
    })
  }
);

const { entry } = await response.json();
```

---

### 5. Delete Entry

**Endpoint**: `DELETE /api/entries/:id`

```javascript
const response = await fetch(
  `${API_URL}/api/entries/${entryId}`,
  {
    method: 'DELETE',
    headers: getAuthHeader()
  }
);

const { message } = await response.json();
```

---

### 6. Link Entries

**Endpoint**: `POST /api/entries/:id/links`

```javascript
const response = await fetch(
  `${API_URL}/api/entries/${parentEntryId}/links`,
  {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      related_entry_id: childEntryId,
      link_type: 'built_upon'  // or 'followed_from', 'revised_by', 'related_to'
    })
  }
);

const { link } = await response.json();
```

---

### 7. Get Project Timeline

**Endpoint**: `GET /api/entries/timeline/:projectId`

```javascript
const response = await fetch(
  `${API_URL}/api/entries/timeline/${projectId}`,
  { headers: getAuthHeader() }
);

const { timeline } = await response.json();

// Timeline is a tree structure showing knowledge flow
timeline.forEach(rootEntry => {
  console.log(`- ${rootEntry.title}`);
  rootEntry.children.forEach(child => {
    console.log(`  └─ ${child.title} (${child.link_type})`);
  });
});
```

---

### 8. Get Dashboard Statistics

**Endpoint**: `GET /api/entries/stats/dashboard`

```javascript
const response = await fetch(
  `${API_URL}/api/entries/stats/dashboard`,
  { headers: getAuthHeader() }
);

const { stats } = await response.json();

console.log(`Total Entries: ${stats.totalEntries}`);
console.log(`Active Contributors: ${stats.activeContributors}`);
console.log(`Recent Entries (7 days): ${stats.recentEntries}`);
console.log(`Status Breakdown:`, stats.byStatus);
console.log(`Type Distribution:`, stats.byType);
```

---

## Frontend Integration Examples

### Using the API Helper

```javascript
import { entriesAPI } from './lib/api/entries';

// Create
const created = await entriesAPI.createEntry({
  title: 'My Entry',
  content: 'Content here',
  entry_type: 'insight'
});

// Search
const { entries, pagination } = await entriesAPI.searchEntries(
  'search query',
  { status: 'active', limit: 20 }
);

// Get with connections
const { entry, connections } = await entriesAPI.getEntry(entryId);

// Update
const updated = await entriesAPI.updateEntry(entryId, {
  status: 'lesson_learned'
});

// Link
const link = await entriesAPI.linkEntries(parentId, childId, 'built_upon');

// Stats
const { stats } = await entriesAPI.getStats();
```

### In React Component

```jsx
import { useState, useEffect } from 'react';
import { entriesAPI } from './lib/api/entries';

export function EntriesList() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { entries } = await entriesAPI.searchEntries('', {
          limit: 20
        });
        setEntries(entries);
      } catch (error) {
        console.error('Failed to load entries:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {entries.map(entry => (
        <div key={entry.id}>
          <h3>{entry.title}</h3>
          <p>{entry.content}</p>
          <span className="badge">{entry.entry_type}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Query Parameters Reference

### Search (`GET /api/entries`)

| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Full-text search in title and content |
| entry_type | string | Filter by type (report, meeting_note, insight, decision, etc.) |
| status | string | Filter by status (active, archived, lesson_learned) |
| department | string | Filter by department |
| project_id | string | Filter by project |
| tags | string | Comma-separated tags to filter |
| author_id | string | Filter by specific author |
| sort | string | Sort field (created_at, updated_at, title) |
| order | string | Sort order (asc, desc) |
| limit | number | Results per page (1-100, default: 20) |
| offset | number | Pagination offset (default: 0) |

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (permission denied) |
| 404 | Not Found |
| 409 | Conflict (e.g., duplicate link) |
| 500 | Server Error |

---

## Error Handling

```javascript
try {
  const response = await entriesAPI.searchEntries('query');
} catch (error) {
  if (error.message.includes('401')) {
    // Token expired - refresh and retry
    // (AuthContext handles this automatically)
  } else if (error.message.includes('403')) {
    // Permission denied
    console.error('You do not have permission to access this entry');
  } else {
    console.error('Failed to search entries:', error.message);
  }
}
```

---

## Pagination Example

```javascript
let allEntries = [];
let hasMore = true;
let offset = 0;

while (hasMore) {
  const { entries, pagination } = await entriesAPI.searchEntries(
    'query',
    { limit: 50, offset }
  );

  allEntries.push(...entries);
  hasMore = pagination.returned === pagination.limit;
  offset += pagination.limit;
}

console.log(`Total entries: ${allEntries.length}`);
```

---

## Best Practices

1. **Always include error handling** - Network requests can fail
2. **Use pagination** - Don't fetch all entries at once
3. **Cache responses** - Reduce API calls for frequently accessed data
4. **Debounce search** - Wait for user to stop typing before searching
5. **Show loading states** - Users should know when data is loading
6. **Handle token refresh** - AuthContext does this automatically
7. **Validate input** - Check required fields before API calls
