use serde::Serialize;
use std::fs::File;
use std::io::BufReader;
use std::sync::mpsc::{self, Sender};
use std::thread;
use std::time::Duration;

// We use a simple approach: spawn a separate thread for audio playback
// using a basic audio library. For Tauri compatibility, we use a
// thread-based player that communicates via channels.

#[derive(Debug, Clone, Serialize)]
pub struct TrackInfo {
    pub path: String,
    pub filename: String,
    pub duration_secs: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PlayerStatus {
    pub is_playing: bool,
    pub current_track: Option<TrackInfo>,
    pub volume: f32,
    pub position_secs: f64,
}

enum PlayerCommand {
    Load(String),
    Play,
    Pause,
    Stop,
    SetVolume(f32),
    Seek(f64),
    Quit,
}

pub struct AudioPlayer {
    cmd_tx: Sender<PlayerCommand>,
}

impl AudioPlayer {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::channel::<PlayerCommand>();

        thread::spawn(move || {
            let (_stream, stream_handle) = match rodio::OutputStream::try_default() {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("AudioPlayer: failed to get output stream: {e}");
                    return;
                }
            };

            let mut current_sink: Option<rodio::Sink> = None;
            let mut volume: f32 = 0.8;
            // Track the stream_handle so it stays alive
            let _stream_handle = stream_handle;

            loop {
                match rx.recv() {
                    Ok(PlayerCommand::Load(path)) => {
                        // Stop current playback
                        if let Some(sink) = current_sink.take() {
                            sink.stop();
                        }

                        // Try to load the file
                        match File::open(&path) {
                            Ok(file) => {
                                let reader = BufReader::new(file);
                                match rodio::Decoder::new(reader) {
                                    Ok(source) => {
                                        let sink = rodio::Sink::try_new(&_stream_handle)
                                            .expect("Failed to create audio sink");
                                        sink.set_volume(volume);
                                        sink.append(source);
                                        current_sink = Some(sink);
                                    }
                                    Err(e) => {
                                        eprintln!("AudioPlayer: decode error for {path}: {e}");
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("AudioPlayer: file not found {path}: {e}");
                            }
                        }
                    }
                    Ok(PlayerCommand::Play) => {
                        if let Some(sink) = &current_sink {
                            if sink.is_paused() {
                                sink.play();
                            }
                        }
                    }
                    Ok(PlayerCommand::Pause) => {
                        if let Some(sink) = &current_sink {
                            sink.pause();
                        }
                    }
                    Ok(PlayerCommand::Stop) => {
                        if let Some(sink) = current_sink.take() {
                            sink.stop();
                        }
                    }
                    Ok(PlayerCommand::SetVolume(v)) => {
                        volume = v.clamp(0.0, 1.0);
                        if let Some(sink) = &current_sink {
                            sink.set_volume(volume);
                        }
                    }
                    Ok(PlayerCommand::Seek(_pos)) => {
                        // rodio doesn't support seeking on decoders
                        // Skip support for now
                    }
                    Ok(PlayerCommand::Quit) | Err(_) => break,
                }

                // Keep the thread alive as long as the channel is open
                thread::sleep(Duration::from_millis(50));
            }
        });

        Self { cmd_tx: tx }
    }

    pub fn load(&mut self, path: &str) -> Result<(), String> {
        self.cmd_tx
            .send(PlayerCommand::Load(path.to_string()))
            .map_err(|e| format!("Audio player error: {e}"))
    }

    pub fn play(&mut self) -> Result<(), String> {
        self.cmd_tx
            .send(PlayerCommand::Play)
            .map_err(|e| format!("Audio player error: {e}"))
    }

    pub fn pause(&mut self) -> Result<(), String> {
        self.cmd_tx
            .send(PlayerCommand::Pause)
            .map_err(|e| format!("Audio player error: {e}"))
    }

    pub fn stop(&mut self) -> Result<(), String> {
        self.cmd_tx
            .send(PlayerCommand::Stop)
            .map_err(|e| format!("Audio player error: {e}"))
    }

    pub fn set_volume(&mut self, volume: f32) -> Result<(), String> {
        self.cmd_tx
            .send(PlayerCommand::SetVolume(volume))
            .map_err(|e| format!("Audio player error: {e}"))
    }
}

impl Default for AudioPlayer {
    fn default() -> Self {
        Self::new()
    }
}
