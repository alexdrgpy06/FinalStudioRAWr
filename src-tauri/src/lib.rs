pub mod commands;
pub mod image_ops;

use tauri_plugin_log::Builder as LogBuilder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(LogBuilder::default().build())
    .invoke_handler(tauri::generate_handler![
        commands::process_image,
        commands::process_bulk,
        commands::decode_raw
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
