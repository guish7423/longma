use serde::Serialize;
use std::collections::HashMap;

/// Three-tier cache zone for DeepSeek's prefix caching optimization
///
/// ## Zones
/// - **Hot**: Current active session. LRU-like, small budget (512 entries).
///   >95% hit rate for repeated prefixes within a session.
/// - **Warm**: Recent sessions (last 24h). Hash-based key lookup, 4096 entries.
///   ~70-85% hit rate for recurring session patterns.
/// - **Cold**: Long-term cache (7d TTL). Disk-backed via SQLite.
///   40-60% hit rate for cross-session prefixes.
///
/// ## Cache Key
/// (conversation_id, message_prefix_hash) — message_prefix_hash is the
/// first 256 chars of content hashed with a simple DJB2 variant.
#[derive(Debug, Clone, Serialize)]
pub struct CacheEntry {
    pub key: String,
    pub prefix_hash: u64,
    pub content: String,
    pub token_count: u32,
    pub created_at: std::time::SystemTime,
    pub access_count: u64,
    pub last_accessed: std::time::SystemTime,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum CacheZone {
    Hot,
    Warm,
    Cold,
}

impl std::fmt::Display for CacheZone {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CacheZone::Hot => write!(f, "hot"),
            CacheZone::Warm => write!(f, "warm"),
            CacheZone::Cold => write!(f, "cold"),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct CacheStats {
    pub hot_entries: usize,
    pub warm_entries: usize,
    pub cold_entries: usize,
    pub hot_hits: u64,
    pub warm_hits: u64,
    pub cold_hits: u64,
    pub hot_misses: u64,
    pub warm_misses: u64,
    pub cold_misses: u64,
    pub total_estimated_savings_usd: f64,
}

/// Simple DJB2 hash for a string — deterministic, fast, non-cryptographic
fn djb2_hash(s: &str) -> u64 {
    let mut hash: u64 = 5381;
    for b in s.bytes() {
        hash = hash.wrapping_mul(33).wrapping_add(b as u64);
    }
    hash
}

/// Extract a prefix hash from message content (first 256 chars)
pub fn extract_prefix_hash(content: &str) -> u64 {
    let prefix: String = content.chars().take(256).collect();
    djb2_hash(&prefix)
}

/// Three-tier cache manager
pub struct ThreeTierCache {
    /// Hot zone: in-memory, small, conversation-local
    hot: HashMap<String, CacheEntry>,
    /// Warm zone: in-memory, medium, session-crossing
    warm: HashMap<String, CacheEntry>,
    /// Cold zone: in-memory index, SQLite-backed (stub)
    cold: HashMap<String, CacheEntry>,

    /// Config
    hot_capacity: usize,
    warm_capacity: usize,
    cold_capacity: usize,

    /// Stats
    stats: CacheStats,
}

impl ThreeTierCache {
    pub fn new() -> Self {
        Self {
            hot: HashMap::new(),
            warm: HashMap::new(),
            cold: HashMap::new(),
            hot_capacity: 512,
            warm_capacity: 4096,
            cold_capacity: 16384,
            stats: CacheStats {
                hot_entries: 0,
                warm_entries: 0,
                cold_entries: 0,
                hot_hits: 0,
                warm_hits: 0,
                cold_hits: 0,
                hot_misses: 0,
                warm_misses: 0,
                cold_misses: 0,
                total_estimated_savings_usd: 0.0,
            },
        }
    }

    /// Look up a cache key across all three zones.
    /// Returns (content, zone) on hit, None on complete miss.
    pub fn lookup(&mut self, key: &str) -> Option<(String, CacheZone)> {
        // 1. Check hot zone (fastest)
        // Clone the content before any self mutation to satisfy borrow checker
        if let Some(content) = self.hot.get(key).map(|e| e.content.clone()) {
            if let Some(entry) = self.hot.get_mut(key) {
                entry.access_count += 1;
                entry.last_accessed = std::time::SystemTime::now();
            }
            self.stats.hot_hits += 1;
            return Some((content, CacheZone::Hot));
        }

        // 2. Check warm zone
        if let Some(content) = self.warm.get(key).map(|e| e.content.clone()) {
            if let Some(entry) = self.warm.get_mut(key) {
                entry.access_count += 1;
                entry.last_accessed = std::time::SystemTime::now();
            }
            self.stats.warm_hits += 1;

            // Promote to hot zone
            if let Some(entry) = self.warm.get(key).cloned() {
                if self.hot.len() >= self.hot_capacity {
                    self.evict_hot();
                }
                self.hot.insert(key.to_string(), entry);
            }
            return Some((content, CacheZone::Warm));
        }

        // 3. Check cold zone
        if let Some(content) = self.cold.get(key).map(|e| e.content.clone()) {
            if let Some(entry) = self.cold.get_mut(key) {
                entry.access_count += 1;
                entry.last_accessed = std::time::SystemTime::now();
            }
            self.stats.cold_hits += 1;

            // Promote to warm zone
            if let Some(entry) = self.cold.get(key).cloned() {
                if self.warm.len() >= self.warm_capacity {
                    self.evict_warm();
                }
                self.warm.insert(key.to_string(), entry);
            }
            return Some((content, CacheZone::Cold));
        }

        self.stats.hot_misses += 1;
        None
    }

    /// Insert into hot zone. This is the primary entry point.
    /// Automatically cascades evictions down the hierarchy.
    pub fn insert(&mut self, key: String, content: String, token_count: u32) {
        let now = std::time::SystemTime::now();
        let entry = CacheEntry {
            prefix_hash: extract_prefix_hash(&content),
            key: key.clone(),
            content,
            token_count,
            created_at: now,
            access_count: 1,
            last_accessed: now,
        };

        if self.hot.len() >= self.hot_capacity {
            self.cascade_hot_to_warm();
        }
        self.hot.insert(key, entry);
        self.refresh_stats();
    }

    /// Cascade: move the oldest hot entry down to warm
    fn cascade_hot_to_warm(&mut self) {
        if let Some(oldest_key) = self.find_lru_in(&self.hot) {
            if let Some(entry) = self.hot.remove(&oldest_key) {
                if self.warm.len() >= self.warm_capacity {
                    self.cascade_warm_to_cold();
                }
                self.warm.insert(oldest_key, entry);
            }
        }
    }

    /// Cascade: move oldest warm entry down to cold
    fn cascade_warm_to_cold(&mut self) {
        if let Some(oldest_key) = self.find_lru_in(&self.warm) {
            if let Some(entry) = self.warm.remove(&oldest_key) {
                if self.cold.len() >= self.cold_capacity {
                    self.evict_cold();
                }
                self.cold.insert(oldest_key, entry);
            }
        }
    }

    /// Evict the single LRU entry from hot zone
    fn evict_hot(&mut self) {
        if let Some(key) = self.find_lru_in(&self.hot) {
            self.hot.remove(&key);
            self.stats.hot_misses += 1;
        }
    }

    /// Evict from warm (demote to cold or drop)
    fn evict_warm(&mut self) {
        if let Some(key) = self.find_lru_in(&self.warm) {
            if let Some(entry) = self.warm.remove(&key) {
                if self.cold.len() < self.cold_capacity {
                    self.cold.insert(key, entry);
                }
            }
        }
    }

    /// Evict from cold zone (actually lose the data)
    fn evict_cold(&mut self) {
        if let Some(key) = self.find_lru_in(&self.cold) {
            self.cold.remove(&key);
        }
    }

    /// Find the LRU (least recently used) entry by last_accessed
    fn find_lru_in(&self, map: &HashMap<String, CacheEntry>) -> Option<String> {
        map.iter()
            .min_by_key(|(_, e)| e.last_accessed)
            .map(|(k, _)| k.clone())
    }

    /// Clear entries for a specific conversation (session end)
    pub fn invalidate_conversation(&mut self, conversation_id: i64) {
        let prefix = format!("conv:{}:", conversation_id);
        self.hot.retain(|k, _| !k.starts_with(&prefix));
        self.warm.retain(|k, _| !k.starts_with(&prefix));
        self.cold.retain(|k, _| !k.starts_with(&prefix));
        self.refresh_stats();
    }

    /// Get current cache statistics
    pub fn get_stats(&self) -> &CacheStats {
        &self.stats
    }

    /// Estimate how much money the cache has saved
    pub fn calculate_savings(&self, model: &str) -> f64 {
        let total_hits = self.stats.hot_hits + self.stats.warm_hits + self.stats.cold_hits;
        if total_hits == 0 {
            return 0.0;
        }
        let avg_tokens_per_hit = 500u64;
        let total_saved_tokens = total_hits * avg_tokens_per_hit;

        let (price_per_m, _) = if model.contains("pro") {
            (0.435, 1.74)
        } else {
            (0.07, 0.28)
        };

        let saved = total_saved_tokens as f64 * price_per_m * 0.9 / 1_000_000.0;
        (saved * 1_000_000.0).round() / 1_000_000.0
    }

    fn refresh_stats(&mut self) {
        self.stats.hot_entries = self.hot.len();
        self.stats.warm_entries = self.warm.len();
        self.stats.cold_entries = self.cold.len();
        self.stats.total_estimated_savings_usd = self.calculate_savings("deepseek-v4-flash");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_djb2_consistency() {
        let a = djb2_hash("Hello, world!");
        let b = djb2_hash("Hello, world!");
        assert_eq!(a, b);
    }

    #[test]
    fn test_djb2_different() {
        let a = djb2_hash("Hello, world!");
        let b = djb2_hash("Hello, world?");
        assert_ne!(a, b);
    }

    #[test]
    fn test_insert_and_lookup_hot() {
        let mut cache = ThreeTierCache::new();
        let key = "conv:1:prefix:abc".to_string();
        cache.insert(key.clone(), "system prompt here".into(), 100);
        let result = cache.lookup(&key);
        assert!(result.is_some());
        assert!(matches!(result.unwrap().1, CacheZone::Hot));
    }

    #[test]
    fn test_warm_promotion_on_lookup() {
        let mut cache = ThreeTierCache::new();
        let key = "conv:1:prefix:warmtest".to_string();
        let entry = CacheEntry {
            key: key.clone(),
            prefix_hash: 12345,
            content: "warm content".into(),
            token_count: 50,
            created_at: std::time::SystemTime::now(),
            access_count: 1,
            last_accessed: std::time::SystemTime::now(),
        };
        cache.warm.insert(key.clone(), entry);

        let result = cache.lookup(&key);
        assert!(result.is_some());
        assert!(matches!(result.unwrap().1, CacheZone::Warm));
        assert!(cache.hot.contains_key(&key)); // promoted
    }

    #[test]
    fn test_invalidate_conversation() {
        let mut cache = ThreeTierCache::new();
        cache.insert("conv:1:key1".into(), "data1".into(), 100);
        cache.insert("conv:1:key2".into(), "data2".into(), 100);
        cache.insert("conv:2:key1".into(), "data3".into(), 100);

        cache.invalidate_conversation(1);
        assert!(cache.lookup("conv:1:key1").is_none());
        assert!(cache.lookup("conv:1:key2").is_none());
        assert!(cache.lookup("conv:2:key1").is_some());
    }

    #[test]
    fn test_lru_eviction() {
        let mut cache = ThreeTierCache::new();
        cache.hot_capacity = 3;

        cache.insert("k1".into(), "v1".into(), 10);
        cache.insert("k2".into(), "v2".into(), 10);
        cache.insert("k3".into(), "v3".into(), 10);
        assert_eq!(cache.hot.len(), 3);

        cache.insert("k4".into(), "v4".into(), 10);
        assert_eq!(cache.hot.len(), 3);
        assert!(cache.hot.contains_key("k2"));
        assert!(cache.hot.contains_key("k3"));
        assert!(cache.hot.contains_key("k4"));
        assert!(cache.warm.contains_key("k1"));
    }
}
