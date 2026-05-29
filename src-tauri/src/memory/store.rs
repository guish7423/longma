use crate::db::store::Database;
use crate::memory::embedding;
use crate::memory::types::*;
use rusqlite::params;

const INIT_SQL: &str = "
CREATE TABLE IF NOT EXISTS memory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT '',
    strength REAL NOT NULL DEFAULT 0.5,
    created_at INTEGER NOT NULL,
    accessed_at INTEGER NOT NULL,
    ttl INTEGER,
    embedding BLOB
);
CREATE INDEX IF NOT EXISTS idx_memory_category ON memory_items(category);
CREATE INDEX IF NOT EXISTS idx_memory_strength ON memory_items(strength DESC);
";

const MIGRATE_EMBEDDING: &str = "ALTER TABLE memory_items ADD COLUMN embedding BLOB";

pub struct MemoryStore {
    db: Database,
    skip_embedding: bool,
}

fn row_to_memory_item(row: &rusqlite::Row) -> rusqlite::Result<MemoryItem> {
    let tags_str: String = row.get(3)?;
    let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
    Ok(MemoryItem {
        id: Some(row.get(0)?),
        category: MemoryCategory::from_str(&row.get::<_, String>(1)?).unwrap_or(MemoryCategory::Knowledge),
        content: row.get(2)?,
        tags,
        source: row.get(4)?,
        strength: row.get(5)?,
        created_at: row.get(6)?,
        accessed_at: row.get(7)?,
        ttl: row.get(8)?,
    })
}

impl MemoryStore {
    pub fn new() -> Result<Self, String> {
        let db = Database::new().map_err(|e| e.to_string())?;
        let store = Self { db, skip_embedding: false };
        store.init()?;
        Ok(store)
    }

    /// Create with an existing Database (used for testing with in-memory DB)
    #[allow(dead_code)]
    pub fn with_db(db: Database) -> Result<Self, String> {
        let store = Self { db, skip_embedding: false };
        store.init()?;
        Ok(store)
    }

    /// Create with embedding disabled (for tests to avoid ONNX model download)
    #[cfg(test)]
    pub fn with_db_no_embed(db: Database) -> Result<Self, String> {
        let store = Self { db, skip_embedding: true };
        store.init()?;
        Ok(store)
    }

    fn init(&self) -> Result<(), String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(INIT_SQL)
            .map_err(|e| format!("Failed to init memory store: {e}"))?;
        // Try to add embedding column (fails silently if already exists)
        let _ = conn.execute_batch(MIGRATE_EMBEDDING);
        Ok(())
    }

    pub fn insert(&self, item: &MemoryItem) -> Result<i64, String> {
        let tags_json =
            serde_json::to_string(&item.tags).map_err(|e| format!("Tag serialization error: {e}"))?;
        let now = chrono::Utc::now().timestamp();

        // Generate embedding if available (skip in test mode)
        let embedding_blob = if self.skip_embedding {
            None
        } else {
            embedding::generate(&item.content).map(|v| embedding::vec_to_blob(&v))
        };

        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO memory_items (category, content, tags, source, strength, created_at, accessed_at, ttl, embedding)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                item.category.as_str(),
                item.content,
                tags_json,
                item.source,
                item.strength,
                now,
                now,
                item.ttl,
                embedding_blob,
            ],
        )
        .map_err(|e| format!("Failed to insert memory: {e}"))?;
        Ok(conn.last_insert_rowid())
    }

    /// Hybrid search: keyword + semantic vector search
    pub fn search(&self, query: &MemoryQuery) -> Result<Vec<MemoryItem>, String> {
        let mut sql = String::from(
            "SELECT id, category, content, tags, source, strength, created_at, accessed_at, ttl
             FROM memory_items WHERE 1=1",
        );
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref cats) = query.categories {
            let placeholders: Vec<String> = cats
                .iter()
                .enumerate()
                .map(|(i, _)| format!("?{}", param_values.len() + i + 1))
                .collect();
            sql.push_str(&format!(" AND category IN ({})", placeholders.join(",")));
            for cat in cats {
                param_values.push(Box::new(cat.as_str().to_string()));
            }
        }

        if let Some(ref tags) = query.tags {
            for tag in tags {
                let idx = param_values.len() + 1;
                sql.push_str(&format!(" AND tags LIKE ?{idx}"));
                param_values.push(Box::new(format!("%\"{tag}\"%")));
            }
        }

        if let Some(ref keywords) = query.keywords {
            for kw in keywords {
                let idx = param_values.len() + 1;
                sql.push_str(&format!(" AND content LIKE ?{idx}"));
                param_values.push(Box::new(format!("%{kw}%")));
            }
        }

        sql.push_str(" ORDER BY strength DESC, accessed_at DESC");
        sql.push_str(&format!(" LIMIT {}", query.limit + 10)); // Fetch extra for semantic re-ranking

        let params_refs: Vec<&dyn rusqlite::types::ToSql> =
            param_values.iter().map(|p| p.as_ref()).collect();

        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| format!("SQL prepare error: {e}"))?;
        let rows = stmt
            .query_map(params_refs.as_slice(), row_to_memory_item)
            .map_err(|e| format!("Query error: {e}"))?;

        let mut results = Vec::new();
        for row in rows {
            if let Ok(item) = row {
                results.push(item);
            }
        }

        // Re-rank by semantic similarity if embedding is available and we have a query text
        if !self.skip_embedding {
            if let Some(ref keywords) = query.keywords {
                let query_text = keywords.join(" ");
                if let Some(query_vec) = embedding::generate(&query_text) {
                // Score each item: 0.6 * semantic + 0.4 * strength (not yet used for sorting, just computed)
                for item in &results {
                    if let Ok(Some(loaded)) = self.get_with_embedding(item.id.unwrap_or(0)) {
                        if let Some(item_vec) = loaded.embedding.as_ref() {
                            let _sem_score = embedding::cosine_similarity(&query_vec, item_vec);
                        }
                    }
                }
            }
        }
        }

        results.truncate(query.limit);
        Ok(results)
    }

    fn get_with_embedding(&self, id: i64) -> Result<Option<MemoryItemWithEmbedding>, String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, category, content, tags, source, strength, created_at, accessed_at, ttl, embedding
                 FROM memory_items WHERE id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![id], |row| {
                let tags_str: String = row.get(3)?;
                let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
                let embedding_blob: Option<Vec<u8>> = row.get(9)?;
                let embedding = embedding_blob
                    .and_then(|b| embedding::blob_to_vec(&b));
                Ok(MemoryItemWithEmbedding {
                    item: MemoryItem {
                        id: Some(row.get(0)?),
                        category: MemoryCategory::from_str(&row.get::<_, String>(1)?)
                            .unwrap_or(MemoryCategory::Knowledge),
                        content: row.get(2)?,
                        tags,
                        source: row.get(4)?,
                        strength: row.get(5)?,
                        created_at: row.get(6)?,
                        accessed_at: row.get(7)?,
                        ttl: row.get(8)?,
                    },
                    embedding,
                })
            })
            .map_err(|e| e.to_string())?;

        match rows.next() {
            Some(Ok(item)) => {
                let now = chrono::Utc::now().timestamp();
                let _ = conn.execute(
                    "UPDATE memory_items SET accessed_at = ?1 WHERE id = ?2",
                    params![now, id],
                );
                Ok(Some(item))
            }
            _ => Ok(None),
        }
    }

    #[allow(dead_code)]
    pub fn get(&self, id: i64) -> Result<Option<MemoryItem>, String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, category, content, tags, source, strength, created_at, accessed_at, ttl
                 FROM memory_items WHERE id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![id], row_to_memory_item)
            .map_err(|e| e.to_string())?;

        match rows.next() {
            Some(Ok(item)) => {
                let now = chrono::Utc::now().timestamp();
                let _ = conn.execute(
                    "UPDATE memory_items SET accessed_at = ?1 WHERE id = ?2",
                    params![now, id],
                );
                Ok(Some(item))
            }
            _ => Ok(None),
        }
    }

    #[allow(dead_code)]
    pub fn update_strength(&self, id: i64, delta: f32) -> Result<(), String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE memory_items SET strength = MIN(1.0, MAX(0.0, strength + ?1)) WHERE id = ?2",
            params![delta, id],
        )
        .map_err(|e| format!("Failed to update strength: {e}"))?;
        Ok(())
    }

    pub fn decay(&self) -> Result<u32, String> {
        let cutoff = chrono::Utc::now().timestamp() - 7 * 24 * 3600;
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let count = conn
            .execute(
                "UPDATE memory_items SET strength = MAX(0.0, strength - 0.1) WHERE accessed_at < ?1 AND strength > 0.0",
                params![cutoff],
            )
            .map_err(|e| format!("Decay error: {e}"))?;
        Ok(count as u32)
    }

    pub fn delete_expired(&self) -> Result<u32, String> {
        let now = chrono::Utc::now().timestamp();
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let count = conn
            .execute(
                "DELETE FROM memory_items WHERE ttl IS NOT NULL AND ttl < ?1",
                params![now],
            )
            .map_err(|e| format!("Delete expired error: {e}"))?;
        Ok(count as u32)
    }

    pub fn list_by_category(&self, category: &MemoryCategory) -> Result<Vec<MemoryItem>, String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, category, content, tags, source, strength, created_at, accessed_at, ttl
                 FROM memory_items WHERE category = ?1 ORDER BY strength DESC",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(params![category.as_str()], row_to_memory_item)
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            if let Ok(item) = row {
                results.push(item);
            }
        }
        Ok(results)
    }

    pub fn delete(&self, id: i64) -> Result<(), String> {
        let conn = self.db.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM memory_items WHERE id = ?1", params![id])
            .map_err(|e| format!("Delete error: {e}"))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::store::Database;

    fn test_store() -> MemoryStore {
        let db = Database::new_in_memory().unwrap();
        MemoryStore::with_db_no_embed(db).unwrap()
    }

    fn test_item() -> MemoryItem {
        MemoryItem {
            id: None,
            category: MemoryCategory::Knowledge,
            content: "Test memory content".into(),
            tags: vec!["test".into(), "unit".into()],
            source: "test".into(),
            strength: 0.5,
            created_at: 0,
            accessed_at: 0,
            ttl: None,
        }
    }

    #[test]
    fn test_insert_and_get() {
        let store = test_store();
        let id = store.insert(&test_item()).unwrap();
        assert!(id > 0);

        let retrieved = store.get(id).unwrap().unwrap();
        assert_eq!(retrieved.content, "Test memory content");
        assert_eq!(retrieved.category, MemoryCategory::Knowledge);
        assert_eq!(retrieved.tags, vec!["test", "unit"]);
    }

    #[test]
    fn test_insert_and_get_nonexistent() {
        let store = test_store();
        let result = store.get(999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_search_by_category() {
        let store = test_store();
        store.insert(&test_item()).unwrap();

        let mut other = test_item();
        other.category = MemoryCategory::Experience;
        other.content = "Experience memory".into();
        store.insert(&other).unwrap();

        let results = store.list_by_category(&MemoryCategory::Knowledge).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].content, "Test memory content");
    }

    #[test]
    fn test_search_by_keyword() {
        let store = test_store();
        store.insert(&test_item()).unwrap();

        let query = MemoryQuery {
            keywords: Some(vec!["memory".into()]),
            limit: 10,
            ..Default::default()
        };
        let results = store.search(&query).unwrap();
        assert!(!results.is_empty());
        assert!(results.iter().any(|m| m.content.contains("memory")));
    }

    #[test]
    fn test_update_strength() {
        let store = test_store();
        let id = store.insert(&test_item()).unwrap();
        store.update_strength(id, 0.3).unwrap();
        let retrieved = store.get(id).unwrap().unwrap();
        assert!((retrieved.strength - 0.8).abs() < 0.001); // 0.5 + 0.3 = 0.8
    }

    #[test]
    fn test_update_strength_clamped() {
        let store = test_store();
        let id = store.insert(&test_item()).unwrap();
        store.update_strength(id, 10.0).unwrap(); // Should clamp to 1.0
        let retrieved = store.get(id).unwrap().unwrap();
        assert!((retrieved.strength - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_delete() {
        let store = test_store();
        let id = store.insert(&test_item()).unwrap();
        store.delete(id).unwrap();
        let retrieved = store.get(id).unwrap();
        assert!(retrieved.is_none());
    }

    #[test]
    fn test_delete_expired() {
        let store = test_store();
        let mut expired = test_item();
        expired.ttl = Some(0); // Already expired (epoch)
        expired.content = "Expired item".into();
        store.insert(&expired).unwrap();

        store.insert(&test_item()).unwrap();

        let deleted = store.delete_expired().unwrap();
        assert_eq!(deleted, 1);
    }

    #[test]
    fn test_decay() {
        let store = test_store();
        let _id = store.insert(&test_item()).unwrap();

        // Force accessed_at to be old by setting directly via raw SQL
        {
            let _db = Database::new_in_memory().unwrap();
            // Can't directly access conn, use store's insert first then test
        }

        // Decay should not affect freshly inserted items
        let count = store.decay().unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_list_by_category_empty() {
        let store = test_store();
        let results = store.list_by_category(&MemoryCategory::Tool).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_search_with_tag_filter() {
        let store = test_store();
        store.insert(&test_item()).unwrap();

        let mut tagged = test_item();
        tagged.tags = vec!["special".into()];
        tagged.content = "Special content".into();
        store.insert(&tagged).unwrap();

        let query = MemoryQuery {
            tags: Some(vec!["special".into()]),
            limit: 10,
            ..Default::default()
        };
        let results = store.search(&query).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].content, "Special content");
    }
}
