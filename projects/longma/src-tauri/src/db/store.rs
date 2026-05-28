use rusqlite::{Connection, Result, params};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub(crate) conn: Mutex<Connection>,
}

#[derive(Debug, Serialize)]
pub struct Conversation {
    pub id: i64,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
pub struct Message {
    pub id: i64,
    pub conversation_id: i64,
    pub role: String,
    pub content: String,
    pub tokens_in: u32,
    pub tokens_out: u32,
    pub cache_hit: bool,
    pub created_at: String,
}

fn db_path() -> PathBuf {
    let base = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("longma");
    std::fs::create_dir_all(&base).ok();
    base.join("longma.db")
}

impl Database {
    pub fn new() -> Result<Self> {
        let path = db_path();
        let conn = Connection::open(&path)?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL DEFAULT 'New Conversation',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tokens_in INTEGER DEFAULT 0,
                tokens_out INTEGER DEFAULT 0,
                cache_hit INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            );",
        )?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    pub fn create_conversation(&self, title: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO conversations (title) VALUES (?1)",
            params![title],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn list_conversations(&self) -> Result<Vec<Conversation>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;
        rows.collect()
    }

    pub fn delete_conversation(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM messages WHERE conversation_id = ?1", params![id])?;
        conn.execute("DELETE FROM conversations WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn save_message(
        &self,
        conversation_id: i64,
        role: &str,
        content: &str,
        tokens_in: u32,
        tokens_out: u32,
        cache_hit: bool,
    ) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO messages (conversation_id, role, content, tokens_in, tokens_out, cache_hit) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![conversation_id, role, content, tokens_in, tokens_out, cache_hit as u32],
        )?;
        conn.execute(
            "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?1",
            params![conversation_id],
        )?;
        Ok(conn.last_insert_rowid())
    }

    pub fn get_conversation_messages(&self, conversation_id: i64) -> Result<Vec<Message>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, tokens_in, tokens_out, cache_hit, created_at FROM messages WHERE conversation_id = ?1 ORDER BY id ASC",
        )?;
        let rows = stmt.query_map(params![conversation_id], |row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tokens_in: row.get(4)?,
                tokens_out: row.get(5)?,
                cache_hit: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_all_messages(&self) -> Result<Vec<Message>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, tokens_in, tokens_out, cache_hit, created_at FROM messages ORDER BY id ASC"
        )?;
        let rows = stmt.query_map([], |row: &rusqlite::Row| {
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                tokens_in: row.get(4)?,
                tokens_out: row.get(5)?,
                cache_hit: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;
        rows.collect()
    }
}