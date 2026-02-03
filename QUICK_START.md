# Quick Start Guide

## Installation

### Prerequisites
- Node.js 16+
- SQLite3
- Git

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
NODE_ENV=development
PORT=4000
JWT_SECRET_KEY=dev-secret-key-change-in-production
CLIENT_URL=http://localhost:5173
EOF

# Initialize database (one time)
sqlite3 memory.db < ../frontend/supabase/migrations/schema.sql

# Start server
npm start
# Server runs on http://localhost:4000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
VITE_API_BACKEND=http://localhost:4000
EOF

# Start dev server
npm run dev
# App runs on http://localhost:5173
```

---

## First Steps

### 1. Register Account

1. Open http://localhost:5173
2. Click "Need an account? Sign up"
3. Fill in:
   - Email: test@example.com
   - Password: password123 (6+ chars)
   - Full Name: Test User
   - Organization: My Company
   - Department: Engineering
   - Role: employee
4. Click "Sign up"

### 2. Log In

1. Back on login page
2. Enter credentials
3. Click "Log in"
4. Should see Dashboard

### 3. Create Your First Entry

1. Click "Add Knowledge" button (dashboard)
2. Fill in:
   - Title: "My First Insight"
   - Type: "Insight"
   - Content: "This is my first knowledge entry"
   - Add a tag: "test"
3. Click "Create Entry"
4. Entry created successfully!

### 4. Search Entries

1. Click "Search" in navigation (or dashboard search)
2. Type your search query
3. See results with filters available
4. Click entry to view full context

### 5. Create AI-Assisted Entry

1. Click "Add Knowledge"
2. Enable "Use AI Assistance for suggestions"
3. Add title and content
4. Click "Get AI Suggestions"
5. Review suggested tags
6. Click "Create Entry"

### 6. Link Entries

1. Open entry detail (click search result)
2. Click "Add Related Entry"
3. Choose relationship type
4. Fill entry details
5. Click "Create Entry"
6. Entries are now linked!

### 7. Check Dashboard Stats

1. Go to Dashboard
2. See statistics:
   - Total entries
   - Contributors
   - Recent activity
   - Knowledge health
3. Check for risk areas
4. Create more entries to see stats change

---

## Common Tasks

### Creating Different Entry Types

```javascript
// Report
{
  title: "Q3 Performance Report",
  entry_type: "report",
  content: "Team achieved 95% uptime..."
}

// Meeting Note
{
  title: "Product Planning Meeting",
  entry_type: "meeting_note",
  content: "Discussed roadmap for Q4..."
}

// Decision
{
  title: "Switch to TypeScript",
  entry_type: "decision",
  content: "We decided to migrate codebase..."
}

// Lesson Learned
{
  title: "Database Scaling Lesson",
  entry_type: "outcome",
  status: "lesson_learned",
  content: "Scaling database taught us..."
}
```

### Searching with Filters

```
Simple: Type "database" and search

With Filters:
- Type: "insight"
- Status: "lesson_learned"
- Sort: "updated_at"
- Order: "newest first"

Result: Recent insights marked as important learnings
```

### Understanding Dashboard Metrics

```
Knowledge Health
- Green (>80%): Good - most entries are active
- Yellow (60-80%): OK - some archived content
- Red (<60%): Poor - too much archived content
→ Action: Activate or delete old entries

Team Engagement
- High (>50%): Great - team actively adding
- Medium (30-50%): Good - regular activity
- Low (<30%): Needs attention - encourage updates

Contributors
- 5+: Excellent knowledge sharing
- 3-4: Moderate participation
- <3: Low engagement - invite more team
```

---

## Troubleshooting Quick Fixes

### "Can't login"
```bash
# Backend running?
lsof -i :4000

# Database initialized?
sqlite3 memory.db ".tables"

# Env variables set?
echo $JWT_SECRET_KEY
```

### "Entries not saving"
```
✓ Title is required
✓ Entry type is valid
✓ You're authenticated (check localStorage)
✓ Backend is running
```

### "Search shows nothing"
```
✓ Create entries first
✓ Try without filters
✓ Check your organization
✓ Reload page
```

### "Dashboard shows zeros"
```
✓ Create multiple entries
✓ Refresh page
✓ Check browser console for errors
✓ Verify database is populated
```

---

## Database Management

### View Entries in Database

```bash
sqlite3 memory.db

# List all entries
SELECT title, entry_type, status FROM memory_entries;

# Count by type
SELECT entry_type, COUNT(*) FROM memory_entries GROUP BY entry_type;

# See timeline links
SELECT p.title, c.title, link_type 
FROM timeline_links tl
JOIN memory_entries p ON tl.parent_entry_id = p.id
JOIN memory_entries c ON tl.child_entry_id = c.id;

# Exit
.exit
```

### Reset Database

```bash
# Delete database
rm backend/memory.db

# Reinitialize
sqlite3 backend/memory.db < frontend/supabase/migrations/schema.sql

# Restart backend
```

### Backup Database

```bash
# Copy database file
cp backend/memory.db backend/memory.db.backup

# Or export to SQL
sqlite3 backend/memory.db .dump > backup.sql
```

---

## Development Tips

### Hot Reload
- Frontend automatically reloads on save
- Backend needs restart on JS changes (or use nodemon)

### Debug API
```javascript
// Browser console
const token = localStorage.getItem('accessToken');
console.log('Token:', token);

// Test API call
fetch('http://localhost:4000/api/entries', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log);
```

### View Network Requests
- Open DevTools (F12)
- Go to Network tab
- Make requests and see what's sent/received
- Check Response tab for API data

### Enable Verbose Logging
```javascript
// In backend server.js
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// In frontend (any component)
import { entriesAPI } from './lib/api/entries';
// Errors already logged to console
```

---

## Next Steps

1. **Explore Features**
   - Create various entry types
   - Link entries together
   - Use smart search
   - Monitor dashboard

2. **Team Setup**
   - Create accounts for team members
   - Same organization for visibility
   - Assign different departments
   - Start sharing knowledge

3. **Customize**
   - Add custom tags
   - Create entry workflows
   - Set up alerts
   - Configure display

4. **Integrate**
   - Connect to Slack
   - Export to docs
   - API integrations
   - Custom workflows

---

## Documentation Files

- **IMPLEMENTATION.md** - Complete technical overview
- **API_GUIDE.md** - Detailed API documentation
- **FEATURES.md** - Feature descriptions and architecture
- **TROUBLESHOOTING.md** - Problem solving guide
- **README.md** - Project overview (backend/frontend)

---

## Support

### Getting Help

1. Check **TROUBLESHOOTING.md**
2. Review **API_GUIDE.md** for endpoint details
3. Look at **FEATURES.md** for how features work
4. Check browser console for errors
5. Check backend console for logs

### Reporting Issues

Include:
- What you were trying to do
- What happened
- Error message/screenshot
- Steps to reproduce
- Browser/Node version
- .env configuration (sanitized)

---

## Performance Tips

### For Development
- Keep browser DevTools closed
- Use pagination (don't load all entries)
- Filter before searching
- Restart backend if slow

### For Production
- Use PostgreSQL instead of SQLite
- Add caching layer (Redis)
- Implement CDN for static files
- Monitor response times
- Use connection pooling

---

## Security Checklist

- [ ] Change JWT_SECRET_KEY in production
- [ ] Use HTTPS in production
- [ ] Set secure cookies (secure: true)
- [ ] Validate all inputs
- [ ] Sanitize database queries
- [ ] Use environment variables for secrets
- [ ] Rotate refresh tokens
- [ ] Log security events
- [ ] Rate limit API endpoints
- [ ] Monitor for unusual access patterns

---

## File Structure

```
memoryFlow/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js (login, register)
│   │   │   ├── user.js (profile, refresh)
│   │   │   └── entries.js (main feature)
│   │   ├── services/
│   │   │   └── db.js (database connection)
│   │   └── middleware/
│   │       └── tokens.js (JWT handling)
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── forms/
│   │   │   │   └── EntryForm.jsx
│   │   │   ├── entries/
│   │   │   │   ├── EntryDetail.jsx
│   │   │   │   └── SmartSearch.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardStats.jsx
│   │   │   └── auth/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   └── api/
│   │   │       └── entries.js
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── SearchPage.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── .env
│
└── Documentation/
    ├── IMPLEMENTATION.md
    ├── API_GUIDE.md
    ├── FEATURES.md
    ├── TROUBLESHOOTING.md
    └── QUICK_START.md (this file)
```

---
