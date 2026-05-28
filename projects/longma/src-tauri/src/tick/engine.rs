use crate::tick::types::*;
use chrono::Utc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::Emitter;

pub struct TickEngine {
    config: TickConfig,
    mode: Arc<Mutex<TickMode>>,
    tick_count: Arc<AtomicU64>,
    start_time: Instant,
    running: Arc<AtomicBool>,
    action_log: Arc<Mutex<Vec<ActionLogEntry>>>,
}

impl TickEngine {
    pub fn new() -> Self {
        Self {
            config: TickConfig::default(),
            mode: Arc::new(Mutex::new(TickMode::Idle)),
            tick_count: Arc::new(AtomicU64::new(0)),
            start_time: Instant::now(),
            running: Arc::new(AtomicBool::new(false)),
            action_log: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn start(&self, app: tauri::AppHandle) {
        self.running.store(true, Ordering::SeqCst);
        let mode = self.mode.clone();
        let config = self.config.clone();
        let tick_count = self.tick_count.clone();
        let start_time = self.start_time;
        let running = self.running.clone();
        let action_log = self.action_log.clone();

        tauri::async_runtime::spawn(async move {
            while running.load(Ordering::SeqCst) {
                let interval = {
                    let m = mode.lock().unwrap();
                    match *m {
                        TickMode::Idle => config.idle_interval,
                        TickMode::Active => config.active_interval,
                        TickMode::Task => config.task_interval,
                    }
                };

                tokio::time::sleep(interval).await;

                if !running.load(Ordering::SeqCst) {
                    break;
                }

                let count = tick_count.fetch_add(1, Ordering::SeqCst) + 1;
                let uptime = start_time.elapsed().as_secs();

                // Log this tick's action
                let log_entry = ActionLogEntry {
                    timestamp: Utc::now().timestamp(),
                    action: format!("tick_{count}"),
                    tick_id: count,
                };
                {
                    let mut log = action_log.lock().unwrap();
                    log.push(log_entry);
                    // Keep only last 100 entries
                    if log.len() > 100 {
                        log.remove(0);
                    }
                }

                let current_mode = { mode.lock().unwrap().clone() };

                let last_action = {
                    let log = action_log.lock().unwrap();
                    log.last()
                        .map(|e| e.action.clone())
                        .unwrap_or_default()
                };

                let heartbeat = TickHeartbeat {
                    mode: current_mode,
                    tick_count: count,
                    uptime_secs: uptime,
                    last_action,
                };

                // Emit heartbeat event to frontend
                if let Err(e) = app.emit("tick-heartbeat", &heartbeat) {
                    eprintln!("TICK: Failed to emit heartbeat: {e}");
                }

                // Check due reminders every tick
                if let Ok(store) = crate::tick::reminder::ReminderStore::new() {
                    if let Ok(due_reminders) = store.check_due() {
                        for reminder in due_reminders {
                            // Send system notification
                            let _ = notify_rust::Notification::new()
                                .summary(&reminder.title)
                                .body(&reminder.description)
                                .appname("LongMa")
                                .timeout(notify_rust::Timeout::Milliseconds(10000))
                                .show();
                            // Emit reminder event to frontend
                            let _ = app.emit("reminder-due", &reminder);
                            // Mark as fired
                            let _ = store.mark_fired(reminder.id);
                        }
                    }
                }

                // Check for expired memories (daily approximately)
                if count % 2880 == 0 { // ~once per day at Idle 20min ticks
                    if let Ok(store) = crate::memory::store::MemoryStore::new() {
                        let _ = store.decay();
                        let _ = store.delete_expired();
                    }
                }
            }
        });
    }

    #[allow(dead_code)]
    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }

    pub fn notify_activity(&self) {
        let mut mode = self.mode.lock().unwrap();
        *mode = TickMode::Active;

        // Set a timer to go back to idle after 5 minutes of inactivity
        let mode_clone = self.mode.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(Duration::from_secs(5 * 60)).await;
            let mut m = mode_clone.lock().unwrap();
            if *m == TickMode::Active {
                *m = TickMode::Idle;
            }
        });
    }

    #[allow(dead_code)]
    pub fn set_task_mode(&self) {
        let mut mode = self.mode.lock().unwrap();
        *mode = TickMode::Task;
    }

    #[allow(dead_code)]
    pub fn set_idle_mode(&self) {
        let mut mode = self.mode.lock().unwrap();
        *mode = TickMode::Idle;
    }

    pub fn get_heartbeat(&self) -> TickHeartbeat {
        let current_mode = { self.mode.lock().unwrap().clone() };
        let count = self.tick_count.load(Ordering::SeqCst);
        let uptime = self.start_time.elapsed().as_secs();
        let last_action = {
            let log = self.action_log.lock().unwrap();
            log.last()
                .map(|e| e.action.clone())
                .unwrap_or_default()
        };

        TickHeartbeat {
            mode: current_mode,
            tick_count: count,
            uptime_secs: uptime,
            last_action,
        }
    }
}
