import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/smart_expense.db');

// Ensure data folder exists
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

// Try native node:sqlite (Node 22.5+) first, with fallback to better-sqlite3
try {
  const { DatabaseSync } = await import('node:sqlite');
  db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  try {
    const { default: BetterSqlite3 } = await import('better-sqlite3');
    db = new BetterSqlite3(dbPath);
    db.pragma('foreign_keys = ON');
  } catch (err2) {
    throw new Error(`Failed to initialize SQLite database: ${e.message} / ${err2.message}`);
  }
}

// Add transaction polyfill if missing (e.g. for node:sqlite DatabaseSync)
if (!db.transaction) {
  db.transaction = function (fn) {
    return function (...args) {
      db.exec('BEGIN TRANSACTION;');
      try {
        const result = fn(...args);
        db.exec('COMMIT;');
        return result;
      } catch (err) {
        try {
          db.exec('ROLLBACK;');
        } catch (rbErr) {
          // ignore rollback error
        }
        throw err;
      }
    };
  };
}

export function initDatabase() {
  db.exec(`
    -- 1. Users Table (Support LINE Login & Google OAuth 2.0 & Admin)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      line_user_id TEXT UNIQUE,
      google_id TEXT UNIQUE,
      email TEXT,
      display_name TEXT NOT NULL,
      picture_url TEXT,
      role TEXT DEFAULT 'user', -- 'admin', 'user'
      status TEXT DEFAULT 'active', -- 'active', 'suspended'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Financial Workspaces (Personal, Group, Merchant)
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'personal', 'group', 'merchant'
      owner_id TEXT NOT NULL,
      description TEXT,
      budget_limit REAL DEFAULT 0,
      icon TEXT DEFAULT 'Store',
      color TEXT DEFAULT '#ED2E92',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- 3. Workspace Members (RBAC: Owner, Member)
    CREATE TABLE IF NOT EXISTS workspace_members (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'member'
      can_add INTEGER DEFAULT 1,
      can_edit INTEGER DEFAULT 1,
      can_delete INTEGER DEFAULT 0,
      can_view_reports INTEGER DEFAULT 1,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- 4. Categories (Per workspace / Merchant customized)
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      workspace_id TEXT, -- NULL for system defaults, or linked to specific workspace
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'income', 'expense'
      icon TEXT DEFAULT 'Tags',
      color TEXT DEFAULT '#3B82F6',
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
    );

    -- 5. Transactions Table
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'income', 'expense'
      amount REAL NOT NULL,
      note TEXT,
      slip_url TEXT,
      input_method TEXT DEFAULT 'manual', -- 'manual', 'ocr', 'voice'
      raw_ocr_text TEXT,
      ocr_verified INTEGER DEFAULT 0,
      ocr_metadata TEXT, -- JSON metadata (bank, time, sender, receiver)
      transaction_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT
    );

    -- 6. Audit Trail (Log all additions, edits, deletions by member)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL, -- 'create_transaction', 'edit_transaction', 'delete_transaction', 'update_role', 'google_sync'
      entity_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- 7. System Logs (Admin Portal, OCR & Voice Engine Status)
    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL, -- 'INFO', 'WARN', 'ERROR'
      module TEXT NOT NULL, -- 'OCR', 'VOICE', 'AUTH', 'LINE', 'INTEGRATIONS'
      message TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Workspace Invites (QR / Share Links)
    CREATE TABLE IF NOT EXISTS workspace_invites (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      role TEXT DEFAULT 'member',
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
    );
  `);

  // Migrate columns for existing databases
  try { db.exec("ALTER TABLE users ADD COLUMN google_id TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN email TEXT;"); } catch (e) {}

  console.log('✅ SQLite Database & Tables Initialized successfully.');

  // Auto-seed if workspaces table is empty
  try {
    const row = db.prepare('SELECT count(*) as count FROM workspaces').get();
    if (!row || row.count === 0) {
      console.log('🌱 Workspaces table is empty. Auto-seeding initial database...');
      import('./seed.js').then(m => {
        if (typeof m.seedData === 'function') {
          m.seedData();
        }
      }).catch(err => {
        console.warn('⚠️ Auto-seeding warning:', err.message);
      });
    }
  } catch (err) {
    console.warn('⚠️ Could not check workspace count:', err.message);
  }
}

// Ensure database tables and columns are ready
initDatabase();

export default db;
