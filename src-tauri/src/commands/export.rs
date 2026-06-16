use std::path::Path;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

use crate::db::AppState;
use crate::fsutil;
use crate::models::export::{ExportFailure, ExportReport, ExportRequest};

#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ExportProgress {
    done: usize,
    total: usize,
    current_file: String,
}

#[tauri::command]
pub async fn export_files(
    app: AppHandle,
    state: State<'_, AppState>,
    request: ExportRequest,
) -> Result<ExportReport, String> {
    let start = Instant::now();

    // Collect matching photo rows from DB
    let rows = {
        let conn = state.db.lock().map_err(|e| e.to_string())?;

        // Build query: selection_state IN (...) plus favorite filter
        let want_favorite = request.categories.contains(&"favorite".to_string());
        let state_cats: Vec<&str> = request
            .categories
            .iter()
            .filter(|c| c.as_str() != "favorite")
            .map(|s| s.as_str())
            .collect();

        let mut stmt = conn
            .prepare(
                "SELECT photo_id, path, file_name, selection_state, is_favorite
                 FROM photo_states WHERE session_id = ?1",
            )
            .map_err(|e| e.to_string())?;

        let all: Vec<(String, String, String, String, bool)> = stmt
            .query_map([&request.session_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, i64>(4)? != 0,
                ))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        // Filter by categories
        all.into_iter()
            .filter(|(_, _, _, sel, fav)| {
                let cat_match = state_cats.contains(&sel.as_str());
                let fav_match = want_favorite && *fav;
                cat_match || fav_match
            })
            .collect::<Vec<_>>()
    };

    let total_requested = rows.len();
    let dest_root = Path::new(&request.destination_root);
    let mut succeeded = 0usize;
    let mut failed: Vec<ExportFailure> = Vec::new();
    let mut missing_sources: Vec<String> = Vec::new();
    let mut skipped_existing: Vec<String> = Vec::new();
    let mut verified_hashes = 0usize;

    for (idx, (_photo_id, path, file_name, selection_state, is_favorite)) in rows.iter().enumerate() {
        let src = Path::new(path);

        if !src.exists() {
            missing_sources.push(path.clone());
            continue;
        }

        // Determine destination subdirectory
        let sub = if request.organize_by_category {
            if *is_favorite {
                "favorites"
            } else {
                match selection_state.as_str() {
                    "selected" => "selected",
                    "rejected" => "rejected",
                    "skipped" => "skipped",
                    _ => "other",
                }
            }
        } else {
            ""
        };

        let dest_dir = if sub.is_empty() { dest_root.to_path_buf() } else { dest_root.join(sub) };
        let raw_dest = dest_dir.join(file_name);
        let dest = fsutil::resolve_dest_path(&raw_dest);

        if dest != raw_dest {
            skipped_existing.push(raw_dest.to_string_lossy().to_string());
        }

        let _ = app.emit(
            "export-progress",
            ExportProgress {
                done: idx,
                total: total_requested,
                current_file: file_name.clone(),
            },
        );

        let result = tokio::task::block_in_place(|| {
            if request.mode == "move" {
                fsutil::move_file(src, &dest).map(|_| ())
            } else {
                fsutil::copy_preserving_mtime(src, &dest).map(|_| ())
            }
        });

        match result {
            Err(e) => {
                failed.push(ExportFailure { path: path.clone(), reason: e });
            }
            Ok(_) => {
                if request.verify_hashes {
                    let src_hash = tokio::task::block_in_place(|| fsutil::sha256_file(src));
                    let dst_hash = tokio::task::block_in_place(|| fsutil::sha256_file(&dest));
                    match (src_hash, dst_hash) {
                        (Ok(sh), Ok(dh)) if sh == dh => {
                            verified_hashes += 1;
                        }
                        (Ok(sh), Ok(dh)) => {
                            failed.push(ExportFailure {
                                path: path.clone(),
                                reason: format!("hash mismatch: src={sh} dst={dh}"),
                            });
                            continue;
                        }
                        (Err(e), _) | (_, Err(e)) => {
                            failed.push(ExportFailure { path: path.clone(), reason: e });
                            continue;
                        }
                    }
                }
                succeeded += 1;
            }
        }
    }

    Ok(ExportReport {
        total_requested,
        succeeded,
        failed,
        missing_sources,
        skipped_existing,
        verified_hashes,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}
