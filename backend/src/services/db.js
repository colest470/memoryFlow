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
            CREATE TABLE IF NOT EXIIST profiles (
                id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                full_name text NOT NULL,
                department text,
                organization text NOT NULL,
                role text NOT NULL CHECK (role IN ('student', 'researcher', 'faculty', 'employee', 'manager', 'admin')),
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now()
            )
        `);

        await db.runAsync(`
            CREATE TABLE IF NOT EXIIST projects (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title text NOT NULL,
            description text,
            department text,
            organization text NOT NULL,
            status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
            owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now(),
            metadata jsonb DEFAULT '{}'::jsonb
            )
        `);

        await db.runAsync(`
            CREATE TABLE IF NOT EXIIST memory_entries (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                title text NOT NULL,
                content text,
                entry_type text NOT NULL CHECK (entry_type IN ('report', 'meeting_note', 'insight', 'decision', 'experiment', 'outcome', 'proposal', 'result')),
                project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
                author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'lesson_learned')),
                department text,
                tags text[] DEFAULT '{}',
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now(),
                metadata jsonb DEFAULT '{}'::jsonb
            )
        `);

        await db.runAsync(`
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            parent_entry_id uuid NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
            child_entry_id uuid NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
            link_type text NOT NULL CHECK (link_type IN ('followed_from', 'revised_by', 'related_to', 'built_upon')),
            created_at timestamptz DEFAULT now(),
            UNIQUE(parent_entry_id, child_entry_id)
        `);

        console.log("Database initialized successfully");
    } catch (error) {
        console.error("Database initialization error!", error);
    } 
}

initDatabase();

export default db;