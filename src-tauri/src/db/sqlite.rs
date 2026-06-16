use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<Connection>,
}

pub fn init_db(app_data_dir: &Path) -> rusqlite::Result<Connection> {
    std::fs::create_dir_all(app_data_dir).ok();
    let db_path = app_data_dir.join("sessions.db");
    let conn = Connection::open(db_path)?;
    conn.execute_batch(
        "
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            folder_path TEXT UNIQUE NOT NULL,
            recursive INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            current_index INTEGER NOT NULL DEFAULT 0,
            total_images INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS photo_states (
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            photo_id TEXT NOT NULL,
            path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            modified_at INTEGER NOT NULL,
            sort_index INTEGER NOT NULL,
            selection_state TEXT NOT NULL DEFAULT 'pending',
            is_favorite INTEGER NOT NULL DEFAULT 0,
            decided_at INTEGER,
            PRIMARY KEY (session_id, photo_id)
        );

        CREATE INDEX IF NOT EXISTS idx_photo_states_session ON photo_states(session_id, sort_index);
        ",
    )?;
    Ok(conn)
}
