use serde::Serialize;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use walkdir::WalkDir;

use crate::models::PhotoEntry;

const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "heic", "heif"];

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub images: Vec<PhotoEntry>,
    pub total: usize,
    pub elapsed_ms: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ScanProgress {
    scanned: usize,
}

#[tauri::command]
pub async fn scan_folder(
    app: AppHandle,
    folder_path: String,
    recursive: bool,
) -> Result<ScanResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let start = Instant::now();
        let max_depth = if recursive { usize::MAX } else { 1 };
        let mut images: Vec<PhotoEntry> = Vec::new();
        let mut scanned: usize = 0;

        for entry in WalkDir::new(&folder_path)
            .max_depth(max_depth)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let path = entry.path();
                if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
                    let ext_lower = ext.to_lowercase();
                    if SUPPORTED_EXTENSIONS.contains(&ext_lower.as_str()) {
                        if let Ok(metadata) = entry.metadata() {
                            let modified_at = metadata
                                .modified()
                                .ok()
                                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|d| d.as_millis() as i64)
                                .unwrap_or(0);
                            let file_name = entry.file_name().to_string_lossy().to_string();
                            images.push(PhotoEntry {
                                id: Uuid::new_v4().to_string(),
                                path: path.to_string_lossy().to_string(),
                                file_name,
                                extension: ext_lower,
                                size_bytes: metadata.len(),
                                modified_at,
                                sort_index: 0,
                            });
                        }
                    }
                }
            }

            scanned += 1;
            if scanned % 100 == 0 {
                let _ = app.emit("scan-progress", ScanProgress { scanned });
            }
        }

        // Deterministic ordering, then assign final sort_index.
        images.sort_by(|a, b| a.path.cmp(&b.path));
        for (i, img) in images.iter_mut().enumerate() {
            img.sort_index = i as i64;
        }

        let total = images.len();
        Ok(ScanResult {
            images,
            total,
            elapsed_ms: start.elapsed().as_millis() as u64,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
