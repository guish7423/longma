use serde::Serialize;
use std::collections::HashMap;

/// Flash pricing (default)
const FLASH_INPUT_CACHE_HIT: f64 = 0.007;    // $0.007/1M (cache hit = 10% of $0.07)
const FLASH_INPUT_CACHE_MISS: f64 = 0.07;    // $0.07/1M
const FLASH_OUTPUT: f64 = 0.28;               // $0.28/1M

/// Pro pricing (upgrade)
const PRO_INPUT_CACHE_HIT: f64 = 0.0435;      // $0.0435/1M (10% of $0.435)
const PRO_INPUT_CACHE_MISS: f64 = 0.435;      // $0.435/1M
const PRO_OUTPUT: f64 = 1.74;                  // $1.74/1M

/// Cost record for a single API call
#[derive(Debug, Clone, Serialize)]
pub struct CostRecord {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cache_hit_tokens: u32,
    pub cache_miss_tokens: u32,
    pub estimated_cost: f64,
    pub model: String,
    pub timestamp: String,
}

impl CostRecord {
    pub fn new(
        input_tokens: u32,
        output_tokens: u32,
        cache_hit_tokens: u32,
        model: &str,
    ) -> Self {
        let cache_miss_tokens = input_tokens.saturating_sub(cache_hit_tokens);
        let estimated_cost = calculate_cost(input_tokens, output_tokens, cache_hit_tokens, model);

        Self {
            input_tokens,
            output_tokens,
            cache_hit_tokens,
            cache_miss_tokens,
            estimated_cost,
            model: model.to_string(),
            timestamp: chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        }
    }
}

/// Calculate exact cost from token counts
fn calculate_cost(input_tokens: u32, output_tokens: u32, cache_hit_tokens: u32, model: &str) -> f64 {
    let cache_miss_tokens = input_tokens.saturating_sub(cache_hit_tokens);
    let (in_hit, in_miss, out) = if model.contains("pro") {
        (PRO_INPUT_CACHE_HIT, PRO_INPUT_CACHE_MISS, PRO_OUTPUT)
    } else {
        (FLASH_INPUT_CACHE_HIT, FLASH_INPUT_CACHE_MISS, FLASH_OUTPUT)
    };

    let cost = cache_hit_tokens as f64 * in_hit / 1_000_000.0
        + cache_miss_tokens as f64 * in_miss / 1_000_000.0
        + output_tokens as f64 * out / 1_000_000.0;

    // Round to 6 decimal places (fraction of a cent)
    (cost * 1_000_000.0).round() / 1_000_000.0
}

/// Aggregated cost summary
#[derive(Debug, Clone, Serialize)]
pub struct CostSummary {
    pub total_input_tokens: u64,
    pub total_output_tokens: u64,
    pub total_cache_hit_tokens: u64,
    pub total_cache_miss_tokens: u64,
    pub total_cost: f64,
    pub total_sessions: u32,
    pub cache_hit_rate: f64, // 0.0 – 1.0
    pub model_breakdown: HashMap<String, f64>,
}

impl CostSummary {
    pub fn new() -> Self {
        Self {
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_cache_hit_tokens: 0,
            total_cache_miss_tokens: 0,
            total_cost: 0.0,
            total_sessions: 0,
            cache_hit_rate: 0.0,
            model_breakdown: HashMap::new(),
        }
    }

    pub fn add_record(&mut self, record: &CostRecord) {
        self.total_input_tokens += record.input_tokens as u64;
        self.total_output_tokens += record.output_tokens as u64;
        self.total_cache_hit_tokens += record.cache_hit_tokens as u64;
        self.total_cache_miss_tokens += record.cache_miss_tokens as u64;
        self.total_cost += record.estimated_cost;
        self.total_sessions += 1;

        *self.model_breakdown
            .entry(record.model.clone())
            .or_insert(0.0) += record.estimated_cost;

        // Recalculate cache hit rate
        let total = self.total_cache_hit_tokens + self.total_cache_miss_tokens;
        self.cache_hit_rate = if total > 0 {
            self.total_cache_hit_tokens as f64 / total as f64
        } else {
            0.0
        };
    }

    #[allow(dead_code)]
    pub fn format_cost(&self) -> String {
        format!("${:.6}", self.total_cost)
    }

    #[allow(dead_code)]
    pub fn format_cache_rate(&self) -> String {
        format!("{:.1}%", self.cache_hit_rate * 100.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flash_cost() {
        let record = CostRecord::new(1000, 500, 900, "deepseek-v4-flash");
        // 900 cache hit * 0.007/1M + 100 cache miss * 0.07/1M + 500 output * 0.28/1M
        // Function rounds to 6 decimal places
        let expected = 900.0 * 0.007 / 1_000_000.0
            + 100.0 * 0.07 / 1_000_000.0
            + 500.0 * 0.28 / 1_000_000.0;
        assert!((record.estimated_cost - expected).abs() < 1e-6);
    }

    #[test]
    fn test_pro_cost() {
        let record = CostRecord::new(1000, 500, 900, "deepseek-v4-pro");
        let expected = 900.0 * 0.0435 / 1_000_000.0
            + 100.0 * 0.435 / 1_000_000.0
            + 500.0 * 1.74 / 1_000_000.0;
        assert!((record.estimated_cost - expected).abs() < 1e-6);

        assert!(!record.model.is_empty());
        assert!(!record.timestamp.is_empty());
    }

    #[test]
    fn test_cost_summary() {
        let mut summary = CostSummary::new();
        let record = CostRecord::new(1000, 500, 900, "deepseek-v4-flash");
        summary.add_record(&record);
        assert_eq!(summary.total_input_tokens, 1000);
        assert!(summary.cache_hit_rate > 0.89);
    }

    #[test]
    fn test_perfect_cache() {
        let record = CostRecord::new(1000, 500, 1000, "deepseek-v4-flash");
        assert_eq!(record.cache_miss_tokens, 0);
    }

    #[test]
    fn test_no_cache() {
        let record = CostRecord::new(1000, 500, 0, "deepseek-v4-flash");
        assert_eq!(record.cache_miss_tokens, 1000);
    }
}
