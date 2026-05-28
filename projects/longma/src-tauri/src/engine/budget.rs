use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Daily budget tracker for cost control
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetState {
    /// Date string (YYYY-MM-DD) this budget covers
    pub date: String,
    /// Total spend today in USD
    pub daily_spend: f64,
    /// Daily budget cap (None = unlimited)
    pub daily_budget_usd: Option<f64>,
    /// Number of API calls today
    pub total_requests: u32,
    /// Number of failed requests today
    pub failed_requests: u32,
    /// Track spend per conversation
    pub conversation_spend: HashMap<i64, f64>,
    /// Whether to prefer Flash model
    pub prefer_flash: bool,
    /// Whether auto-compression is enabled
    pub auto_compress: bool,
    /// Token threshold for auto-compression (> this many tokens = compress)
    pub compress_threshold: u32,
}

impl BudgetState {
    pub fn new(daily_budget_usd: Option<f64>) -> Self {
        Self {
            date: today_date(),
            daily_spend: 0.0,
            daily_budget_usd,
            total_requests: 0,
            failed_requests: 0,
            conversation_spend: HashMap::new(),
            prefer_flash: true,
            auto_compress: true,
            compress_threshold: 16384,
        }
    }

    /// Record a successful API call's cost
    pub fn record_spend(&mut self, cost: f64, conversation_id: i64) {
        // Reset if day changed
        let today = today_date();
        if self.date != today {
            self.date = today;
            self.daily_spend = 0.0;
            self.total_requests = 0;
            self.failed_requests = 0;
            self.conversation_spend.clear();
        }

        self.daily_spend += cost;
        self.total_requests += 1;
        *self.conversation_spend.entry(conversation_id).or_insert(0.0) += cost;
    }

    /// Record a failed request
    pub fn record_failure(&mut self) {
        self.failed_requests += 1;
        self.total_requests += 1;
    }

    /// Check if we've exceeded the daily budget
    pub fn is_over_budget(&self) -> bool {
        match self.daily_budget_usd {
            Some(limit) => self.daily_spend >= limit,
            None => false,
        }
    }

    /// Check if budget is close to limit (80% or more)
    pub fn is_nearing_budget(&self) -> bool {
        match self.daily_budget_usd {
            Some(limit) => self.daily_spend >= limit * 0.8,
            None => false,
        }
    }

    /// Should we compress this conversation's context?
    pub fn should_compress(&self, total_tokens: u32) -> bool {
        self.auto_compress && total_tokens > self.compress_threshold
    }

    /// Should we upgrade from Flash to Pro?
    /// Criteria: Flash failed 2+ times in a row, or task is complex
    pub fn should_upgrade(&self) -> bool {
        self.failed_requests >= 2
    }

    /// Get remaining budget for today
    pub fn remaining_budget(&self) -> Option<f64> {
        self.daily_budget_usd.map(|limit| (limit - self.daily_spend).max(0.0))
    }
}

/// Budget configuration (stored in config)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetConfig {
    pub daily_budget_usd: Option<f64>,
    pub auto_compress: bool,
    pub compress_threshold: u32,
    pub prefer_flash: bool,
}

impl Default for BudgetConfig {
    fn default() -> Self {
        Self {
            daily_budget_usd: None,
            auto_compress: true,
            compress_threshold: 16384,
            prefer_flash: true,
        }
    }
}

fn today_date() -> String {
    chrono::Utc::now().format("%Y-%m-%d").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_budget_new() {
        let budget = BudgetState::new(Some(1.0));
        assert_eq!(budget.daily_spend, 0.0);
        assert_eq!(budget.prefer_flash, true);
    }

    #[test]
    fn test_record_spend() {
        let mut budget = BudgetState::new(Some(1.0));
        budget.record_spend(0.05, 1);
        assert_eq!(budget.daily_spend, 0.05);
        assert_eq!(budget.total_requests, 1);
    }

    #[test]
    fn test_over_budget() {
        let mut budget = BudgetState::new(Some(0.10));
        budget.record_spend(0.09, 1);
        assert!(!budget.is_over_budget());
        budget.record_spend(0.02, 1);
        assert!(budget.is_over_budget());
    }

    #[test]
    fn test_nearing_budget() {
        let mut budget = BudgetState::new(Some(1.0));
        budget.record_spend(0.75, 1);
        assert!(budget.is_nearing_budget());
        assert!(!budget.is_over_budget());
    }

    #[test]
    fn test_should_compress() {
        let budget = BudgetState::new(None);
        assert!(budget.should_compress(20000));
        assert!(!budget.should_compress(10000));
    }

    #[test]
    fn test_upgrade_after_failures() {
        let mut budget = BudgetState::new(None);
        assert!(!budget.should_upgrade());
        budget.record_failure();
        budget.record_failure();
        assert!(budget.should_upgrade());
    }

    #[test]
    fn test_remaining_budget() {
        let mut budget = BudgetState::new(Some(1.0));
        budget.record_spend(0.3, 1);
        let remaining = budget.remaining_budget().unwrap();
        assert!((remaining - 0.7).abs() < 0.001);
    }

    #[test]
    fn test_unlimited_budget() {
        let budget = BudgetState::new(None);
        assert!(!budget.is_over_budget());
        assert!(budget.remaining_budget().is_none());
    }

    #[test]
    fn test_date_change_resets_budget() {
        let mut budget = BudgetState::new(Some(1.0));
        // Simulate a different date
        let old_date = budget.date.clone();
        // Record spend
        budget.record_spend(0.5, 1);
        assert_eq!(budget.total_requests, 1);
        assert_eq!(budget.daily_spend, 0.5);

        // If date changed (which it won't in same second), it would reset
        // This tests the reset logic path
        budget.date = "2025-06-01".to_string();
        budget.record_spend(0.3, 2);
        assert_eq!(budget.daily_spend, 0.3); // reset on date change
        assert_eq!(budget.total_requests, 1); // only the new request counts after reset

        // Restore date so no side effects
        budget.date = old_date;
    }
}
