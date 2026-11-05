//! The system menu: em's commands, read from the definition that `yarn tauri:menu` generates from the app's
//! commands (desktop/menu.json), alongside the native items that macOS apps are expected to have. Nothing here names
//! a command. Renaming one, rebinding its shortcut, or moving it to another menu only changes desktop/menu.json.

use std::collections::HashMap;

use serde::Deserialize;
use tauri::menu::{
    AboutMetadata, CheckMenuItem, IsMenuItem, Menu, MenuEvent, MenuItem, MenuItemKind,
    PredefinedMenuItem, Submenu, HELP_SUBMENU_ID, WINDOW_SUBMENU_ID,
};
use tauri::{AppHandle, Emitter, Manager, Runtime};

/// The event that tells the page which command's item was chosen. The page executes the command, so that it runs the
/// same way as from its keyboard shortcut or toolbar button.
const COMMAND_EVENT: &str = "system-menu";

/// The command items of each top level menu, as `src/util/systemMenuDefinition.ts` writes them. A menu that no command
/// names is left out of the file.
#[derive(Default, Deserialize)]
#[serde(rename_all = "PascalCase", default)]
struct Definition {
    app: Vec<CommandItem>,
    file: Vec<CommandItem>,
    edit: Vec<CommandItem>,
    cursor: Vec<CommandItem>,
    view: Vec<CommandItem>,
    help: Vec<CommandItem>,
}

/// A command's menu item.
#[derive(Deserialize)]
struct CommandItem {
    id: String,
    label: String,
    accelerator: Option<String>,
    /// Whether the item shows a check mark while the command is active.
    #[serde(default)]
    checkable: bool,
}

/// The state of a command's item, which the page sends whenever the command's canExecute, isActive, or label changes.
#[derive(Deserialize)]
pub struct CommandItemState {
    id: String,
    enabled: bool,
    text: String,
    checked: bool,
}

/// The command items by command id. `Menu::get` only finds top level items, so `update_system_menu` looks them up here.
struct CommandItems<R: Runtime>(HashMap<String, MenuItemKind<R>>);

/// Creates the items of the commands and records each one by command id.
fn command_items<R: Runtime>(
    app: &AppHandle<R>,
    commands: &[CommandItem],
    registry: &mut HashMap<String, MenuItemKind<R>>,
) -> tauri::Result<Vec<MenuItemKind<R>>> {
    commands
        .iter()
        .map(|command| {
            let accelerator = command.accelerator.as_deref();
            let item = if command.checkable {
                MenuItemKind::Check(CheckMenuItem::with_id(
                    app,
                    command.id.as_str(),
                    &command.label,
                    true,
                    false,
                    accelerator,
                )?)
            } else {
                MenuItemKind::MenuItem(MenuItem::with_id(
                    app,
                    command.id.as_str(),
                    &command.label,
                    true,
                    accelerator,
                )?)
            };
            registry.insert(command.id.clone(), item.clone());
            Ok(item)
        })
        .collect()
}

/// Creates a top level menu from sections of items, separating the sections that are not empty.
fn submenu<R: Runtime>(
    app: &AppHandle<R>,
    id: Option<&str>,
    title: &str,
    sections: Vec<Vec<MenuItemKind<R>>>,
) -> tauri::Result<Submenu<R>> {
    let mut items = Vec::new();
    for section in sections.into_iter().filter(|section| !section.is_empty()) {
        if !items.is_empty() {
            items.push(MenuItemKind::Predefined(PredefinedMenuItem::separator(
                app,
            )?));
        }
        items.extend(section);
    }
    let items: Vec<&dyn IsMenuItem<R>> = items
        .iter()
        .map(|item| item as &dyn IsMenuItem<R>)
        .collect();
    match id {
        Some(id) => Submenu::with_id_and_items(app, id, title, true, &items),
        None => Submenu::with_items(app, title, true, &items),
    }
}

/// Builds the system menu and registers its command items for `update_system_menu`.
///
/// The Edit menu keeps the native Undo, Redo, Cut, Copy, Paste, and Select All. The webview does not perform these
/// shortcuts itself: Command + C only copies because a menu item has it as its key equivalent. em's own Undo and Redo
/// are bound to the same shortcuts and take them first, since the page sees a key before the menu does, as does its
/// Select All while thoughts are selected. The native items still serve the text fields where em leaves the key to the
/// browser, such as the search box of the Command Universe.
///
/// `NATIVE_ACCELERATORS` in `src/util/systemMenuDefinition.ts` lists the shortcuts of the native items, so that no
/// command item is given one of them. Update it along with the native items.
pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let definition: Definition = serde_json::from_str(include_str!("../menu.json"))?;
    let mut registry = HashMap::new();
    let package = app.package_info();
    let about = AboutMetadata {
        name: Some(package.name.clone()),
        version: Some(package.version.to_string()),
        copyright: app.config().bundle.copyright.clone(),
        ..Default::default()
    };

    let app_menu = submenu(
        app,
        None,
        &package.name,
        vec![
            vec![MenuItemKind::Predefined(PredefinedMenuItem::about(
                app,
                None,
                Some(about),
            )?)],
            command_items(app, &definition.app, &mut registry)?,
            vec![MenuItemKind::Predefined(PredefinedMenuItem::services(
                app, None,
            )?)],
            vec![
                MenuItemKind::Predefined(PredefinedMenuItem::hide(app, None)?),
                MenuItemKind::Predefined(PredefinedMenuItem::hide_others(app, None)?),
                MenuItemKind::Predefined(PredefinedMenuItem::show_all(app, None)?),
            ],
            vec![MenuItemKind::Predefined(PredefinedMenuItem::quit(
                app, None,
            )?)],
        ],
    )?;
    let file_menu = submenu(
        app,
        None,
        "File",
        vec![
            command_items(app, &definition.file, &mut registry)?,
            vec![MenuItemKind::Predefined(PredefinedMenuItem::close_window(
                app, None,
            )?)],
        ],
    )?;
    let edit_menu = submenu(
        app,
        None,
        "Edit",
        vec![
            vec![
                MenuItemKind::Predefined(PredefinedMenuItem::undo(app, None)?),
                MenuItemKind::Predefined(PredefinedMenuItem::redo(app, None)?),
            ],
            vec![
                MenuItemKind::Predefined(PredefinedMenuItem::cut(app, None)?),
                MenuItemKind::Predefined(PredefinedMenuItem::copy(app, None)?),
                MenuItemKind::Predefined(PredefinedMenuItem::paste(app, None)?),
                MenuItemKind::Predefined(PredefinedMenuItem::select_all(app, None)?),
            ],
            command_items(app, &definition.edit, &mut registry)?,
        ],
    )?;
    let cursor_menu = submenu(
        app,
        None,
        "Cursor",
        vec![command_items(app, &definition.cursor, &mut registry)?],
    )?;
    let view_menu = submenu(
        app,
        None,
        "View",
        vec![
            command_items(app, &definition.view, &mut registry)?,
            vec![MenuItemKind::Predefined(PredefinedMenuItem::fullscreen(
                app, None,
            )?)],
        ],
    )?;
    // The Window and Help ids make Tauri register these menus with macOS, which then lists the open windows in one and
    // adds a search field to the other.
    let window_menu = submenu(
        app,
        Some(WINDOW_SUBMENU_ID),
        "Window",
        vec![
            vec![
                MenuItemKind::Predefined(PredefinedMenuItem::minimize(app, None)?),
                MenuItemKind::Predefined(PredefinedMenuItem::maximize(app, None)?),
            ],
            vec![MenuItemKind::Predefined(
                PredefinedMenuItem::bring_all_to_front(app, None)?,
            )],
        ],
    )?;
    let help_menu = submenu(
        app,
        Some(HELP_SUBMENU_ID),
        "Help",
        vec![command_items(app, &definition.help, &mut registry)?],
    )?;

    app.manage(CommandItems(registry));

    Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &cursor_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )
}

/// Tells the page which command's item was chosen. Native items such as Copy and Quit act on their own.
pub fn on_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    let id = event.id().as_ref();
    let is_command = app
        .try_state::<CommandItems<R>>()
        .is_some_and(|registry| registry.0.contains_key(id));
    if is_command {
        if let Err(error) = app.emit(COMMAND_EVENT, id) {
            eprintln!("Failed to report the system menu item {id} to the page: {error}");
        }
    }
}

/// Applies the states of the command items that the page reports.
#[tauri::command]
pub fn update_system_menu<R: Runtime>(
    app: AppHandle<R>,
    items: Vec<CommandItemState>,
) -> Result<(), String> {
    let Some(registry) = app.try_state::<CommandItems<R>>() else {
        return Ok(());
    };
    items
        .iter()
        .try_for_each(|state| match registry.0.get(&state.id) {
            Some(MenuItemKind::MenuItem(item)) => item
                .set_enabled(state.enabled)
                .and_then(|()| item.set_text(&state.text)),
            Some(MenuItemKind::Check(item)) => item
                .set_enabled(state.enabled)
                .and_then(|()| item.set_text(&state.text))
                .and_then(|()| item.set_checked(state.checked)),
            _ => Ok(()),
        })
        .map_err(|error| error.to_string())
}
