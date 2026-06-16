use rusqlite::{params, OptionalExtension};
use std::collections::HashMap;
use tauri::State;

use crate::db::AppState;
use crate::models::{PhotoEntry, PhotoState, SelectionState, SessionFile};

/// Creates or fully replaces a session (called after a folder scan).
/// Inserts the session row and all per-photo rows in a single transaction.
#[tauri::command]
pub fn create_session(state: State<AppState>, session: SessionFile) -> Result<(), String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO sessions (id, folder_path, recursive, created_at, updated_at, current_index, total_images)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(folder_path) DO UPDATE SET
            recursive = excluded.recursive,
            updated_at = excluded.updated_at,
            current_index = excluded.current_index,
            total_images = excluded.total_images",
        params![
            session.id,
            session.folder_path,
            session.recursive as i64,
            session.created_at,
            session.updated_at,
            session.current_index,
            session.images.len() as i64,
        ],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        "DELETE FROM photo_states WHERE session_id = ?1",
        params![session.id],
    )
    .map_err(|e| e.to_string())?;

    for img in &session.images {
        let photo_state = session.states.get(&img.id).cloned().unwrap_or(PhotoState {
            photo_id: img.id.clone(),
            selection_state: SelectionState::Pending,
            is_favorite: false,
            decided_at: None,
        });

        tx.execute(
            "INSERT INTO photo_states
                (session_id, photo_id, path, file_name, size_bytes, modified_at, sort_index, selection_state, is_favorite, decided_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                session.id,
                img.id,
                img.path,
                img.file_name,
                img.size_bytes as i64,
                img.modified_at,
                img.sort_index,
                photo_state.selection_state.as_str(),
                photo_state.is_favorite as i64,
                photo_state.decided_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

/// Loads a previously saved session for the given folder, if one exists.
#[tauri::command]
pub fn load_session(state: State<AppState>, folder_path: String) -> Result<Option<SessionFile>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let session_row = conn
        .query_row(
            "SELECT id, folder_path, recursive, created_at, updated_at, current_index
             FROM sessions WHERE folder_path = ?1",
            params![folder_path],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let Some((id, folder_path, recursive, created_at, updated_at, current_index)) = session_row else {
        return Ok(None);
    };

    let mut images = Vec::new();
    let mut states = HashMap::new();

    let mut stmt = conn
        .prepare(
            "SELECT photo_id, path, file_name, size_bytes, modified_at, sort_index, selection_state, is_favorite, decided_at
             FROM photo_states WHERE session_id = ?1 ORDER BY sort_index ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, Option<i64>>(8)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let (photo_id, path, file_name, size_bytes, modified_at, sort_index, selection_state, is_favorite, decided_at) =
            row.map_err(|e| e.to_string())?;

        let extension = file_name
            .rsplit('.')
            .next()
            .unwrap_or("")
            .to_lowercase();

        images.push(PhotoEntry {
            id: photo_id.clone(),
            path,
            file_name,
            extension,
            size_bytes: size_bytes as u64,
            modified_at,
            sort_index,
        });

        states.insert(
            photo_id.clone(),
            PhotoState {
                photo_id,
                selection_state: SelectionState::from_str(&selection_state),
                is_favorite: is_favorite != 0,
                decided_at,
            },
        );
    }

    Ok(Some(SessionFile {
        id,
        folder_path,
        recursive: recursive != 0,
        created_at,
        updated_at,
        current_index,
        images,
        states,
    }))
}

/// Updates a single photo's decision state plus the session's current index. Called on every review action.
#[tauri::command]
pub fn update_photo_state(
    state: State<AppState>,
    session_id: String,
    photo_state: PhotoState,
    current_index: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "UPDATE photo_states SET selection_state = ?1, is_favorite = ?2, decided_at = ?3
         WHERE session_id = ?4 AND photo_id = ?5",
        params![
            photo_state.selection_state.as_str(),
            photo_state.is_favorite as i64,
            photo_state.decided_at,
            session_id,
            photo_state.photo_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE sessions SET current_index = ?1, updated_at = ?2 WHERE id = ?3",
        params![current_index, now, session_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Updates only the session's current index (e.g. navigation without a decision change).
#[tauri::command]
pub fn update_current_index(
    state: State<AppState>,
    session_id: String,
    current_index: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "UPDATE sessions SET current_index = ?1, updated_at = ?2 WHERE id = ?3",
        params![current_index, now, session_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
