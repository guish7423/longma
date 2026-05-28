use crate::db::store::Database;
use rusqlite::params;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub due_at: i64,
    pub repeat_interval: Option<i64>, // seconds, None = one-time
    pub action: Option<String>,
    pub fired: bool,
}

pub struct ReminderStore {
    db: Database,
}

impl ReminderStore {
    pub fn new() -> Result<Self, String> {
        let db = Database::new().map_err(|e| e.to_string())?;
        let store = Self { db };
        store.init()?;
        Ok(store)
    }

    fn init(&self) -> Result<(), String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                due_at INTEGER NOT NULL,
                repeat_interval INTEGER,
                action TEXT,
                fired INTEGER NOT NULL DEFAULT 0
            );",
        )
        .map_err(|e| format!("Failed to init reminders: {e}"))
    }

    pub fn create(&self, title: &str, description: &str, due_at: i64, repeat_interval: Option<i64>) -> Result<i64, String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO reminders (title, description, due_at, repeat_interval, fired)
             VALUES (?1, ?2, ?3, ?4, 0)",
            params![title, description, due_at, repeat_interval],
        )
        .map_err(|e| format!("Failed to create reminder: {e}"))?;
        Ok(conn.last_insert_rowid())
    }

    pub fn check_due(&self) -> Result<Vec<Reminder>, String> {
        let now = chrono::Utc::now().timestamp();
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, title, description, due_at, repeat_interval, action, fired FROM reminders WHERE due_at <= ?1 AND fired = 0")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![now], |row| {
                Ok(Reminder {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    due_at: row.get(3)?,
                    repeat_interval: row.get(4)?,
                    action: row.get(5)?,
                    fired: row.get::<_, i32>(6)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            if let Ok(r) = row {
                results.push(r);
            }
        }
        Ok(results)
    }

    pub fn mark_fired(&self, id: i64) -> Result<(), String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("UPDATE reminders SET fired = 1 WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;

        // If repeating, create next instance
        if let Ok(Some(reminder)) = self.get(id) {
            if let Some(interval) = reminder.repeat_interval {
                let next_due = reminder.due_at + interval;
                let _ = conn.execute(
                    "INSERT INTO reminders (title, description, due_at, repeat_interval, action, fired)
                     VALUES (?1, ?2, ?3, ?4, ?5, 0)",
                    params![reminder.title, reminder.description, next_due, reminder.repeat_interval, reminder.action],
                );
            }
        }

        Ok(())
    }

    pub fn get(&self, id: i64) -> Result<Option<Reminder>, String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, title, description, due_at, repeat_interval, action, fired FROM reminders WHERE id = ?1")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![id], |row| {
                Ok(Reminder {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    due_at: row.get(3)?,
                    repeat_interval: row.get(4)?,
                    action: row.get(5)?,
                    fired: row.get::<_, i32>(6)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;

        Ok(rows.next().and_then(|r| r.ok()))
    }

    pub fn list(&self) -> Result<Vec<Reminder>, String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, title, description, due_at, repeat_interval, action, fired FROM reminders ORDER BY due_at DESC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(Reminder {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    due_at: row.get(3)?,
                    repeat_interval: row.get(4)?,
                    action: row.get(5)?,
                    fired: row.get::<_, i32>(6)? != 0,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            if let Ok(r) = row {
                results.push(r);
            }
        }
        Ok(results)
    }

    pub fn cancel(&self, id: i64) -> Result<(), String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM reminders WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
