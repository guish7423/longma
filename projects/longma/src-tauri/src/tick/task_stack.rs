use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuspendedTask {
    pub id: String,
    pub description: String,
    pub progress: f32,
    pub created_at: i64,
    pub context: Option<String>,
}

pub struct TaskStack {
    tasks: Mutex<HashMap<String, SuspendedTask>>,
    order: Mutex<Vec<String>>,
}

impl TaskStack {
    pub fn new() -> Self {
        Self {
            tasks: Mutex::new(HashMap::new()),
            order: Mutex::new(Vec::new()),
        }
    }

    pub fn suspend(&self, description: &str, context: Option<String>) -> String {
        let id = format!("task_{}", chrono::Utc::now().timestamp());
        let task = SuspendedTask {
            id: id.clone(),
            description: description.to_string(),
            progress: 0.0,
            created_at: chrono::Utc::now().timestamp(),
            context,
        };
        let mut tasks = self.tasks.lock().unwrap();
        let mut order = self.order.lock().unwrap();
        tasks.insert(id.clone(), task);
        order.push(id.clone());
        id
    }

    pub fn update_progress(&self, id: &str, progress: f32) -> bool {
        let mut tasks = self.tasks.lock().unwrap();
        if let Some(task) = tasks.get_mut(id) {
            task.progress = progress.clamp(0.0, 1.0);
            true
        } else {
            false
        }
    }

    pub fn resume(&self, id: &str) -> Option<SuspendedTask> {
        let mut tasks = self.tasks.lock().unwrap();
        let task = tasks.remove(id)?;
        let mut order = self.order.lock().unwrap();
        order.retain(|o| o != id);
        Some(task)
    }

    pub fn cancel(&self, id: &str) -> bool {
        let mut tasks = self.tasks.lock().unwrap();
        let removed = tasks.remove(id).is_some();
        let mut order = self.order.lock().unwrap();
        order.retain(|o| o != id);
        removed
    }

    pub fn list(&self) -> Vec<SuspendedTask> {
        let tasks = self.tasks.lock().unwrap();
        let order = self.order.lock().unwrap();
        order
            .iter()
            .filter_map(|id| tasks.get(id).cloned())
            .collect()
    }

    pub fn pending_count(&self) -> usize {
        self.tasks.lock().unwrap().len()
    }
}
