use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct TtsCapability {
    pub available: bool,
    pub engines: Vec<String>,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TtsResult {
    pub success: bool,
    pub engine: String,
    pub error: Option<String>,
}

pub fn detect_tts() -> TtsCapability {
    let platform = std::env::consts::OS.to_string();
    let mut engines = Vec::new();

    // Check availability of common TTS engines
    if cfg!(target_os = "linux") {
        if Command::new("which").arg("espeak").output().is_ok()
            && Command::new("espeak").arg("--version").output().is_ok()
        {
            engines.push("espeak".into());
        }
        if Command::new("which").arg("spd-say").output().is_ok() {
            engines.push("spd-say".into());
        }
    }
    if cfg!(target_os = "macos") {
        engines.push("say".into()); // Always available on macOS
    }
    if cfg!(target_os = "windows") {
        engines.push("powershell".into()); // Always available on Windows
    }

    TtsCapability {
        available: !engines.is_empty(),
        engines,
        platform,
    }
}

pub fn speak(text: &str, engine: Option<&str>) -> TtsResult {
    let selected = engine.unwrap_or("");
    let text_safe = text.to_string();

    if cfg!(target_os = "linux") {
        // Try espeak first
        if selected.is_empty() || selected == "espeak" {
            match Command::new("espeak")
                .arg(&text_safe)
                .output()
            {
                Ok(_) => return TtsResult { success: true, engine: "espeak".into(), error: None },
                Err(e) => {
                    // Fall back to spd-say
                    if let Ok(_) = Command::new("spd-say").arg(&text_safe).output() {
                        return TtsResult { success: true, engine: "spd-say".into(), error: None };
                    }
                    return TtsResult { success: false, engine: "espeak".into(), error: Some(e.to_string()) };
                }
            }
        }
        if selected == "spd-say" {
            match Command::new("spd-say").arg(&text_safe).output() {
                Ok(_) => TtsResult { success: true, engine: "spd-say".into(), error: None },
                Err(e) => TtsResult { success: false, engine: "spd-say".into(), error: Some(e.to_string()) },
            }
        } else {
            TtsResult { success: false, engine: "none".into(), error: Some("No suitable TTS engine found on Linux. Install espeak: sudo apt install espeak".into()) }
        }
    } else if cfg!(target_os = "macos") {
        match Command::new("say").arg(&text_safe).output() {
            Ok(_) => TtsResult { success: true, engine: "say".into(), error: None },
            Err(e) => TtsResult { success: false, engine: "say".into(), error: Some(e.to_string()) },
        }
    } else if cfg!(target_os = "windows") {
        let ps_script = format!("Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('{}')", text_safe.replace('\'', "''"));
        match Command::new("powershell")
            .args(["-Command", &ps_script])
            .output()
        {
            Ok(_) => TtsResult { success: true, engine: "powershell".into(), error: None },
            Err(e) => TtsResult { success: false, engine: "powershell".into(), error: Some(e.to_string()) },
        }
    } else {
        TtsResult { success: false, engine: "none".into(), error: Some("Unsupported platform".into()) }
    }
}
