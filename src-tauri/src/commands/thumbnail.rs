use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};

use crate::thumbnails;

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ThumbnailReady {
    photo_id: String,
    thumb_path: String,
}

#[tauri::command]
pub async fn get_thumbnail(
    app: AppHandle,
    _photo_id: String,
    path: String,
    mtime: u64,
    size_bytes: u64,
) -> Result<String, String> {
    let cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("photo-swipe-selector")
        .join("thumbnails");

    let source_buf = std::path::PathBuf::from(path);
    let dest = thumbnails::thumb_path(&cache_dir, &source_buf, mtime, size_bytes);

    tokio::task::spawn_blocking(move || {
        thumbnails::generate_thumbnail(&source_buf, &dest, mtime, size_bytes)?;
        dest.to_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "Invalid thumb path".to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn generate_thumbnails_batch(
    app: AppHandle,
    photos: Vec<crate::models::photo::PhotoEntry>,
) -> Result<(), String> {
    let cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("photo-swipe-selector")
        .join("thumbnails");

    let app_clone = app.clone();
    tokio::task::spawn_blocking(move || {
        use rayon::prelude::*;

        photos.par_iter().for_each(|photo| {
            let source = Path::new(&photo.path);
            let mtime = photo.modified_at as u64;
            let dest = thumbnails::thumb_path(&cache_dir, source, mtime, photo.size_bytes);

            if thumbnails::generate_thumbnail(source, &dest, mtime, photo.size_bytes).is_ok()
            {
                if let Some(thumb_path_str) = dest.to_str() {
                    let _ = app_clone.emit(
                        "thumbnail-ready",
                        ThumbnailReady {
                            photo_id: photo.id.clone(),
                            thumb_path: thumb_path_str.to_string(),
                        },
                    );
                }
            }
        });
    })
    .await
    .map_err(|e| e.to_string())
}
