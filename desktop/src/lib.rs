mod menu;

/// Builds and runs the em desktop application.
///
/// The webview loads the bundled web build (configured via `frontendDist` in
/// `tauri.conf.json`), so the entire em UI runs unchanged inside the native shell.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![menu::update_system_menu])
        .on_menu_event(menu::on_event);

    // The system menu is macOS only for now (#5219). On Windows and Linux the window keeps no menu bar.
    let builder = if cfg!(target_os = "macos") {
        builder.menu(menu::build)
    } else {
        builder
    };

    builder
        .run(tauri::generate_context!())
        .expect("error while running em");
}
