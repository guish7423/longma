use serde::Serialize;
use std::sync::Mutex;
use std::sync::OnceLock;
use sysinfo::{CpuRefreshKind, Disks, System};

static SYSINFO: OnceLock<Mutex<System>> = OnceLock::new();

fn get_sys() -> &'static Mutex<System> {
    SYSINFO.get_or_init(|| Mutex::new(System::new_all()))
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemResources {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_percent: f32,
    pub disk_used: u64,
    pub disk_total: u64,
    pub disk_percent: f32,
    pub process_count: u32,
    pub uptime_secs: u64,
}

pub fn collect_resources() -> SystemResources {
    let sys = get_sys();
    let mut sys = sys.lock().unwrap();

    // Refresh all system info
    sys.refresh_cpu_specifics(CpuRefreshKind::everything());
    sys.refresh_memory();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All);

    let cpu_usage = sys.global_cpu_usage();
    let memory_used = sys.used_memory();
    let memory_total = sys.total_memory();
    let memory_percent = if memory_total > 0 {
        memory_used as f32 / memory_total as f32 * 100.0
    } else {
        0.0
    };

    // Collect disk info (first physical disk)
    let disks = Disks::new_with_refreshed_list();
    let (disk_used, disk_total) = disks.iter().find(|d| {
        !d.mount_point().to_string_lossy().contains("/dev")
            && !d.mount_point().to_string_lossy().contains("/sys")
            && !d.mount_point().to_string_lossy().contains("/proc")
    }).map(|d| {
        (d.total_space() - d.available_space(), d.total_space())
    }).unwrap_or((0, 0));

    let disk_percent = if disk_total > 0 {
        disk_used as f32 / disk_total as f32 * 100.0
    } else {
        0.0
    };

    let process_count = sys.processes().len() as u32;
    let uptime_secs = System::uptime();

    SystemResources {
        cpu_usage,
        memory_used,
        memory_total,
        memory_percent,
        disk_used,
        disk_total,
        disk_percent,
        process_count,
        uptime_secs,
    }
}
