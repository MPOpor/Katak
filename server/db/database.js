import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/smart_expense.db');

// Ensure data folder exists
import fs from 'fs';
const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- 1. Users Table (Support LINE Login OAuth 2.0 & Admin)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      line_user_id TEXT UNIQUE,
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
      workspace_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL, -- 'create_transaction', 'edit_transaction', 'delete_transaction', 'join_group', 'update_budget'
      entity_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    -- 7. System Logs (For Admin monitoring)
    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL, -- 'INFO', 'WARN', 'ERROR'
      module TEXT NOT NULL, -- 'AUTH', 'OCR', 'VOICE', 'LINE_API', 'TRANSACTION'
      message TEXT NOT NULL,
      metadata TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. Invitation Tokens
    CREATE TABLE IF NOT EXISTS workspace_invites (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      expires_at DATETIME,
      used_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  console.log('✅ SQLite Database schema initialized successfully.');
}

export default db;
