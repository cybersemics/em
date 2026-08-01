/// Builds and runs the em desktop application.
///
/// The webview loads the bundled web build (configured via `frontendDist` in
/// `tauri.conf.json`), so the entire em UI runs unchanged inside the native shell.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running em");
}
