# Troubleshooting Guide

## Authentication Issues

### Problem: User keeps getting logged out
**Solution**: 
- Check browser localStorage for 'accessToken'
- Verify JWT_SECRET_KEY environment variable is set
- Check that cookies are being sent (credentials: 'include')
- Verify CORS settings include your frontend URL

### Problem: 401 Unauthorized on every request
**Solution**:
- Ensure token is being stored in localStorage after login
- Check Authorization header format: `Bearer ${token}`
- Verify token hasn't expired (15-minute default)
- Check that refresh endpoint is working (/api/user/refresh)

### Problem: Refresh token not working
**Solution**:
- Check that refreshToken cookie is being set (httpOnly)
- Verify CORS includes Cookie header
- Ensure refresh_tokens table exists in database
- Check that refresh token hasn't expired (21-day default)

---

## Entries API Issues

### Problem: "Failed to create entry"
**Solution**:
- Ensure title field is provided
- Check entry_type is valid (report, insight, decision, etc.)
- Verify user is authenticated (Bearer token present)
- Check database has memory_entries table

### Problem: Search returns empty results
**Solution**:
- Verify entries exist in database
- Check that user's organization matches entry author's organization
- Try search without filters first
- Check query syntax - special characters may cause issues

### Problem: Cannot link entries (409 Conflict)
**Solution**:
- Link between these entries already exists
- Try different link_type
- Ensure both entry IDs are valid
- Verify both entries are in same organization

### Problem: Entry ownership errors (403 Forbidden)
**Solution**:
- Only entry author can update/delete
- Check you're logged in as the correct user
- Verify user ID in JWT token matches entry.author_id

---

## Dashboard Statistics Issues

### Problem: Stats showing 0 or incomplete data
**Solution**:
- Create some test entries first
- Check database queries are working
- Verify user's organization has entries
- Clear browser cache and reload

### Problem: Risk areas not appearing
**Solution**:
- Risk areas only appear when thresholds are met
- Create more entries to trigger alerts
- Check your knowledge health score (< 60%)
- Add more team members to increase contributor count

---

## Database Issues

### Problem: "table memory_entries does not exist"
**Solution**:
- Run schema.sql migration
- Ensure database file exists at configured path
- Check SQLite is installed and accessible
- Verify database connection string in server

### Problem: Foreign key constraint violations
**Solution**:
- Ensure profiles table is populated before creating entries
- Check author_id references valid profile
- Verify project_id (if provided) exists in projects table

### Problem: Tags or metadata not saving
**Solution**:
- Tags should be array: `["tag1", "tag2"]`
- Metadata should be object: `{ key: "value" }`
- They're stored as JSON strings in database
- Use JSON.parse() to retrieve them

---

## Frontend Component Issues

### Problem: EntryForm not showing
**Solution**:
- Check component is imported correctly
- Verify parent component passes required props (onClose, onSubmit)
- Check z-index (modal has z-50)
- Look for JavaScript errors in console

### Problem: SmartSearch not finding entries
**Solution**:
- Check API endpoint is correct
- Verify Bearer token is present
- Try removing all filters
- Check browser network tab for API response

### Problem: DashboardStats showing errors
**Solution**:
- Ensure /api/entries/stats/dashboard endpoint exists
- Verify user is authenticated
- Check backend server is running
- Look at browser console for error details

### Problem: EntryDetail modal stuck loading
**Solution**:
- Check network tab for hanging requests
- Verify entry ID is valid UUID
- Check /api/entries/:id endpoint is working
- Increase timeout if network is slow

---

## Performance Issues

### Problem: Search is slow
**Solution**:
- Check database indexes exist:
  - idx_memory_entries_project
  - idx_memory_entries_author
  - idx_memory_entries_created
  - idx_memory_entries_tags
- Limit search results (use pagination)
- Use specific filters instead of broad searches

### Problem: Dashboard takes long to load
**Solution**:
- Reduce number of entries in database
- Check stats endpoint query performance
- Implement caching for stats data
- Consider aggregating stats periodically

### Problem: Large file uploads fail
**Solution**:
- Current system doesn't support file uploads
- Store entry content as text instead
- For files: use separate file storage service
- Check max request size in Express (default: 100kb)

---

## CORS Issues

### Problem: "Access to XMLHttpRequest blocked by CORS"
**Solution**:
- Check CLIENT_URL environment variable
- Verify frontend URL matches CORS origin exactly
- Ensure credentials: 'include' in requests
- Check backend CORS middleware configuration

### Problem: Preflight requests failing
**Solution**:
- OPTIONS method should be allowed
- Check that headers include:
  - Content-Type
  - Authorization
  - Cookie
- Verify exposedHeaders includes what frontend needs

---

## Deployment Issues

### Problem: "Cannot find module" errors
**Solution**:
- Run `npm install` in backend directory
- Check all imports use correct paths
- Verify .env file is in root directory
- Check for circular dependencies

### Problem: Port already in use
**Solution**:
- Change PORT environment variable
- Kill process using port: `lsof -i :4000` (Mac/Linux)
- Or: `netstat -ano | findstr :4000` (Windows)

### Problem: Environment variables not loading
**Solution**:
- Check .env file exists in backend root
- Use `dotenv/config` import before other imports
- Restart server after changing .env
- Verify variable names match: NODE_ENV, JWT_SECRET_KEY, CLIENT_URL

---

## Quick Debugging Checklist

- [ ] Backend server running (`npm start` on port 4000)
- [ ] Frontend running (`npm run dev` on port 5173)
- [ ] Database file exists and is readable
- [ ] Environment variables set correctly
- [ ] Browser console shows no errors
- [ ] Network tab shows requests and responses
- [ ] Bearer token present in Authorization header
- [ ] CORS errors resolved
- [ ] Database schema migrated
- [ ] User profile exists for logged-in user

---

## Getting Logs

### Backend Logs
```bash
# Check server console output
# Look for [timestamp] METHOD PATH entries
# Errors printed to console with stack traces
```

### Frontend Logs
```javascript
// In browser console
console.log('Current user:', localStorage.getItem('accessToken'));
console.log('API URL:', import.meta.env.VITE_API_BACKEND);
```

### Database Logs
```javascript
// Enable debug mode in SQLite
db.configure('busyTimeout', 5000);
```

---

## Common Fix Commands

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules && npm install

# Kill process on port
lsof -ti:4000 | xargs kill -9

# Check if port is open
nc -zv localhost 4000

# Test API endpoint
curl -H "Authorization: Bearer TOKEN" http://localhost:4000/api/entries

# Check environment
echo $NODE_ENV
echo $JWT_SECRET_KEY
```
