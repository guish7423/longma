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

    /// Create with an existing Database (used for testing with in-memory DB)
    #[allow(dead_code)]
    pub fn with_db(db: Database) -> Result<Self, String> {
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
        // Read reminder info before locking (avoid reentrant deadlock)
        let reminder_info: Option<(String, String, Option<i64>, Option<String>)> = {
            let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
            let mut stmt = conn
                .prepare("SELECT title, description, repeat_interval, action FROM reminders WHERE id = ?1")
                .map_err(|e| e.to_string())?;
            stmt.query_row(params![id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
            })
            .ok()
        };

        if let Some((title, description, repeat_interval, action)) = reminder_info {
            let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
            conn.execute("UPDATE reminders SET fired = 1 WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;

            // If repeating, create next instance
            if let Some(interval) = repeat_interval {
                let now = chrono::Utc::now().timestamp();
                let _ = conn.execute(
                    "INSERT INTO reminders (title, description, due_at, repeat_interval, action, fired)
                     VALUES (?1, ?2, ?3, ?4, ?5, 0)",
                    params![title, description, now + interval, repeat_interval, action],
                );
            }
        }

        Ok(())
    }

    #[allow(dead_code)]
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::store::Database;

    fn test_store() -> ReminderStore {
        let db = Database::new_in_memory().unwrap();
        ReminderStore::with_db(db).unwrap()
    }

    #[test]
    fn test_create_and_check_due() {
        let store = test_store();
        let now = chrono::Utc::now().timestamp();
        let id = store.create("Test Reminder", "Test description", now - 10, None).unwrap();
        assert!(id > 0);

        let due = store.check_due().unwrap();
        assert_eq!(due.len(), 1);
        assert_eq!(due[0].title, "Test Reminder");
    }

    #[test]
    fn test_create_future_reminder_not_due() {
        let store = test_store();
        let far_future = chrono::Utc::now().timestamp() + 99999;
        store.create("Future", "Not yet", far_future, None).unwrap();
        let due = store.check_due().unwrap();
        assert!(due.is_empty());
    }

    #[test]
    fn test_mark_fired() {
        let store = test_store();
        let now = chrono::Utc::now().timestamp();
        let id = store.create("Firable", "desc", now - 10, None).unwrap();
        store.mark_fired(id).unwrap();
        let due = store.check_due().unwrap();
        assert!(due.is_empty());
    }

    #[test]
    fn test_repeating_reminder() {
        let store = test_store();
        let now = chrono::Utc::now().timestamp();
        let id = store.create("Repeat", "desc", now - 10, Some(3600)).unwrap();
        store.mark_fired(id).unwrap();

        // Should have created a new instance
        let all = store.list().unwrap();
        let future_reminders: Vec<_> = all.iter().filter(|r| r.due_at > now).collect();
        assert_eq!(future_reminders.len(), 1);
    }

    #[test]
    fn test_get_nonexistent() {
        let store = test_store();
        let result = store.get(999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_list_order() {
        let store = test_store();
        store.create("A", "", 100, None).unwrap();
        store.create("B", "", 200, None).unwrap();
        let all = store.list().unwrap();
        assert!(all.len() >= 2);
    }

    #[test]
    fn test_cancel_reminder() {
        let store = test_store();
        let id = store.create("Cancel me", "", 100, None).unwrap();
        store.cancel(id).unwrap();
        let result = store.get(id).unwrap();
        assert!(result.is_none());
    }
}
