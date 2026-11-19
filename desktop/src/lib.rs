mod menu;

/// Builds and runs the em desktop application.
///
/// The webview loads the bundled web build (configured via `frontendDist` in
/// `tauri.conf.json`), so the entire em UI runs unchanged inside the native shell.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![menu::update_system_menu])
        .menu(menu::build)
        .on_menu_event(menu::on_event)
        .setup(|_app| {
            #[cfg(target_os = "linux")]
            menu::show_accelerators_only(_app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running em");
}
