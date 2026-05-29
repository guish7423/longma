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
        let mut tasks = self.tasks.lock().expect("task_stack mutex poisoned");
        let mut order = self.order.lock().expect("order mutex poisoned");
        tasks.insert(id.clone(), task);
        order.push(id.clone());
        id
    }

    #[allow(dead_code)]
    pub fn update_progress(&self, id: &str, progress: f32) -> bool {
        let mut tasks = self.tasks.lock().expect("task_stack mutex poisoned");
        if let Some(task) = tasks.get_mut(id) {
            task.progress = progress.clamp(0.0, 1.0);
            true
        } else {
            false
        }
    }

    pub fn resume(&self, id: &str) -> Option<SuspendedTask> {
        let mut tasks = self.tasks.lock().expect("task_stack mutex poisoned");
        let task = tasks.remove(id)?;
        let mut order = self.order.lock().expect("order mutex poisoned");
        order.retain(|o| o != id);
        Some(task)
    }

    pub fn cancel(&self, id: &str) -> bool {
        let mut tasks = self.tasks.lock().expect("task_stack mutex poisoned");
        let removed = tasks.remove(id).is_some();
        let mut order = self.order.lock().expect("order mutex poisoned");
        order.retain(|o| o != id);
        removed
    }

    pub fn list(&self) -> Vec<SuspendedTask> {
        let tasks = self.tasks.lock().expect("task_stack mutex poisoned");
        let order = self.order.lock().expect("order mutex poisoned");
        order
            .iter()
            .filter_map(|id| tasks.get(id).cloned())
            .collect()
    }

    #[allow(dead_code)]
    pub fn pending_count(&self) -> usize {
        self.tasks.lock().expect("task_stack mutex poisoned").len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stack() -> TaskStack {
        TaskStack::new()
    }

    #[test]
    fn test_suspend_and_list() {
        let s = stack();
        let id = s.suspend("Test task", None);
        assert!(!id.is_empty());
        assert_eq!(s.pending_count(), 1);

        let tasks = s.list();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].description, "Test task");
    }

    #[test]
    fn test_resume() {
        let s = stack();
        let id = s.suspend("Resumable", Some("ctx".into()));
        let task = s.resume(&id).unwrap();
        assert_eq!(task.description, "Resumable");
        assert_eq!(task.context.unwrap(), "ctx");
        assert_eq!(s.pending_count(), 0); // Removed after resume
    }

    #[test]
    fn test_cancel() {
        let s = stack();
        let id = s.suspend("Cancelable", None);
        assert!(s.cancel(&id));
        assert_eq!(s.pending_count(), 0);
    }

    #[test]
    fn test_cancel_nonexistent() {
        let s = stack();
        assert!(!s.cancel("nonexistent"));
    }

    #[test]
    fn test_resume_nonexistent() {
        let s = stack();
        assert!(s.resume("nonexistent").is_none());
    }

    #[test]
    fn test_update_progress() {
        let s = stack();
        let id = s.suspend("Progress", None);
        assert!(s.update_progress(&id, 0.5));
        let tasks = s.list();
        assert!((tasks[0].progress - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_update_progress_clamped() {
        let s = stack();
        let id = s.suspend("Clamp", None);
        assert!(s.update_progress(&id, 1.5));
        let tasks = s.list();
        assert!((tasks[0].progress - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_update_progress_nonexistent() {
        let s = stack();
        assert!(!s.update_progress("ghost", 0.5));
    }

    #[test]
    fn test_suspend_with_context() {
        let s = stack();
        let id = s.suspend("Contextual", Some("{\"key\": \"val\"}".into()));
        let tasks = s.list();
        assert_eq!(tasks[0].context.as_ref().unwrap(), "{\"key\": \"val\"}");
        let _ = id;
    }
}
