import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database("./database.sqlite");

db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));
db.runAsync = promisify(db.run.bind(db));

const initDatabase = async () => {
    try {
        await db.runAsync("PRAGMA foreign_keys = ON");

        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_by INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                settings JSON DEFAULT '{}',
                FOREIGN KEY (created_by) REFERENCES profiles (id) ON DELETE CASCADE
            )
        `);

        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                organization TEXT,
                department TEXT,
                role TEXT,
                is_verified BOOL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.runAsync(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
        )
        `);

        // User-Organization Relationship (Many-to-Many with role)
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS user_organizations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
                department TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, organization_id)
            )
        `);

        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                created_by INTEGER NOT NULL REFERENCES profiles(id),
                department TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT DEFAULT '{}'
            )
        `);

        // Project members (who can access the project)
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS project_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, user_id)
            )
        `);

        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS memory_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                entry_type TEXT NOT NULL CHECK (entry_type IN ('report', 'meeting_note', 'insight', 'decision', 'experiment', 'outcome', 'proposal', 'result')),
                project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                author_id INTEGER NOT NULL REFERENCES profiles(id),
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'lesson_learned')),
                department TEXT,
                tags TEXT, -- Store as comma-separated or JSON
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT DEFAULT '{}'
            )
        `);

        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS entry_links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_entry_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
                child_entry_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
                link_type TEXT NOT NULL CHECK (link_type IN ('followed_from', 'revised_by', 'related_to', 'built_upon')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(parent_entry_id, child_entry_id)
            )
        `);

        // Invitations for organization/project access
        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS invitations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_by INTEGER NOT NULL REFERENCES profiles(id),
                status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.runAsync(`
            CREATE TABLE IF NOT EXISTS embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                memory_entry_id INTEGER NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
                vector BLOB NOT NULL, -- store serialized embedding
                model TEXT DEFAULT 'text-embedding-3-large',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.runAsync(`    
        CREATE TABLE IF NOT EXISTS user_memory_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES profiles(id),
            memory_entry_id INTEGER NOT NULL REFERENCES memory_entries(id),
            action_type TEXT CHECK(action_type IN ('view', 'edit', 'reuse', 'share', 'feedback')),
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `);

        console.log("Database initialized successfully");
    } catch (error) {
        console.error("Database initialization error!", error);
    } 
}

initDatabase();

export default db;