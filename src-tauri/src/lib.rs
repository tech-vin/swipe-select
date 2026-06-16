mod commands;
mod db;
mod fsutil;
mod models;
mod thumbnails;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            let conn = db::init_db(&app_data_dir).expect("failed to initialize database");
            app.manage(db::AppState { db: Mutex::new(conn) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_folder,
            commands::create_session,
            commands::load_session,
            commands::update_photo_state,
            commands::update_current_index,
            commands::get_thumbnail,
            commands::generate_thumbnails_batch,
            commands::export_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
