//! The system menu: em's commands, read from the definition that `yarn tauri:menu` generates from the app's
//! commands (desktop/menu.json), alongside the native items that macOS apps are expected to have. Nothing here names
//! a command. Renaming one, rebinding its shortcut, or moving it to another menu only changes desktop/menu.json.

use std::collections::HashMap;
#[cfg(target_os = "macos")]
use std::sync::Mutex;
#[cfg(any(target_os = "macos", test))]
use std::time::{Duration, Instant};

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

/// A command's item, and the accelerator it was given.
struct RegisteredItem<R: Runtime> {
    item: MenuItemKind<R>,
    accelerator: Option<String>,
}

/// The command items by command id. `Menu::get` only finds top level items, so `update_system_menu` looks them up here.
struct CommandItems<R: Runtime>(HashMap<String, RegisteredItem<R>>);

/// Creates the items of the commands and records each one by command id.
fn command_items<R: Runtime>(
    app: &AppHandle<R>,
    commands: &[CommandItem],
    registry: &mut HashMap<String, RegisteredItem<R>>,
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
            registry.insert(
                command.id.clone(),
                RegisteredItem {
                    item: item.clone(),
                    accelerator: command.accelerator.clone(),
                },
            );
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
    // on_event judges an item by the key press that chose it.
    #[cfg(target_os = "macos")]
    record_key_presses();
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

/// Whether a key press matched an accelerator only loosely: with Shift held although the accelerator has no Shift, on a
/// key that does not type the accelerator's key with Shift. AppKit matches a key equivalent on a punctuation key whether
/// or not Shift is held, so Command + Shift + - chooses the item of Command + -. Shift that types the key is not loose,
/// as on a layout where = needs Shift.
///
/// `typed` is the key event's `charactersIgnoringModifiers`, which includes the effect of Shift: `_` for Shift + -.
fn is_loose_key_match(accelerator: &str, shift: bool, typed: &str) -> bool {
    let Some((modifiers, key)) = accelerator.rsplit_once('+') else {
        return false;
    };
    shift
        && !modifiers.split('+').any(|modifier| modifier == "Shift")
        && !typed.eq_ignore_ascii_case(key)
}

/// A key press as the app dispatched it: whether Shift was held, what the key typed (`charactersIgnoringModifiers`), and
/// when.
#[cfg(any(target_os = "macos", test))]
struct KeyPress {
    shift: bool,
    typed: String,
    at: Instant,
}

/// How long after a key press the item it chose can be reported. The web view hands a key back to the menu only once the
/// page has left it unhandled, and Tauri reports the chosen item from its event loop after that. Choosing an item with
/// the pointer after a key press takes longer.
#[cfg(any(target_os = "macos", test))]
const KEY_PRESS_LIFETIME: Duration = Duration::from_secs(1);

#[cfg(any(target_os = "macos", test))]
impl KeyPress {
    /// Whether this key press chose an item with the accelerator only loosely (see `is_loose_key_match`). A key press
    /// older than `KEY_PRESS_LIFETIME` did not choose an item that is reported now.
    fn chose_loosely(&self, accelerator: &str, now: Instant) -> bool {
        now.duration_since(self.at) < KEY_PRESS_LIFETIME
            && is_loose_key_match(accelerator, self.shift, &self.typed)
    }
}

/// The last key press the app dispatched, unless a mouse button has been pressed since.
#[cfg(target_os = "macos")]
static LAST_KEY_PRESS: Mutex<Option<KeyPress>> = Mutex::new(None);

/// Records each key press as the app dispatches it, for `chosen_by_loose_key_match`. Tauri reports a chosen item from its
/// event loop, after AppKit has dispatched the key, by which time the app may already have taken the key's release or a
/// modifier's release off its queue, so the event current then is not always the key press that chose the item. A mouse
/// button press forgets the key press, so that an item chosen with the pointer is not judged by an earlier key.
#[cfg(target_os = "macos")]
fn record_key_presses() {
    use objc2_app_kit::{NSEvent, NSEventMask, NSEventModifierFlags, NSEventType};
    use std::ptr::NonNull;

    let handler = block2::RcBlock::new(|event: NonNull<NSEvent>| -> *mut NSEvent {
        // SAFETY: AppKit passes the event it is about to dispatch, which outlives the call.
        let dispatched = unsafe { event.as_ref() };
        let press = (dispatched.r#type() == NSEventType::KeyDown).then(|| KeyPress {
            shift: dispatched
                .modifierFlags()
                .contains(NSEventModifierFlags::Shift),
            typed: dispatched
                .charactersIgnoringModifiers()
                .map(|characters| characters.to_string())
                .unwrap_or_default(),
            at: Instant::now(),
        });
        if let Ok(mut last) = LAST_KEY_PRESS.lock() {
            *last = press;
        }
        event.as_ptr()
    });
    let mask = NSEventMask::KeyDown
        | NSEventMask::LeftMouseDown
        | NSEventMask::RightMouseDown
        | NSEventMask::OtherMouseDown;
    // SAFETY: the handler returns the event it was given, so every event is dispatched unchanged.
    let monitor = unsafe { NSEvent::addLocalMonitorForEventsMatchingMask_handler(mask, &handler) };
    // The monitor records for as long as the app runs.
    std::mem::forget(monitor);
}

/// Whether the item was chosen by a key press that matched its accelerator only loosely. The key press is taken, so
/// that it decides only the item it chose.
#[cfg(target_os = "macos")]
fn chosen_by_loose_key_match(accelerator: &str) -> bool {
    let press = LAST_KEY_PRESS.lock().ok().and_then(|mut last| last.take());
    press.is_some_and(|press| press.chose_loosely(accelerator, Instant::now()))
}

/// The system menu is macOS only (see `run` in lib.rs), so no other platform chooses an item by a key equivalent.
#[cfg(not(target_os = "macos"))]
fn chosen_by_loose_key_match(_accelerator: &str) -> bool {
    false
}

/// Tells the page which command's item was chosen. Native items such as Copy and Quit act on their own.
///
/// An item that a key chose through AppKit's looser matching is ignored, so that its command runs only from its own
/// shortcut: Command + Shift + - does not decrease the font size.
pub fn on_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    let id = event.id().as_ref();
    let Some(registry) = app.try_state::<CommandItems<R>>() else {
        return;
    };
    let Some(registered) = registry.0.get(id) else {
        return;
    };
    if registered
        .accelerator
        .as_deref()
        .is_some_and(chosen_by_loose_key_match)
    {
        return;
    }
    if let Err(error) = app.emit(COMMAND_EVENT, id) {
        eprintln!("Failed to report the system menu item {id} to the page: {error}");
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
        .try_for_each(
            |state| match registry.0.get(&state.id).map(|registered| &registered.item) {
                Some(MenuItemKind::MenuItem(item)) => item
                    .set_enabled(state.enabled)
                    .and_then(|()| item.set_text(&state.text)),
                Some(MenuItemKind::Check(item)) => item
                    .set_enabled(state.enabled)
                    .and_then(|()| item.set_text(&state.text))
                    .and_then(|()| item.set_checked(state.checked)),
                _ => Ok(()),
            },
        )
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{is_loose_key_match, KeyPress, KEY_PRESS_LIFETIME};
    use std::time::Instant;

    #[test]
    fn shift_on_a_key_that_types_the_accelerator_without_it_is_loose() {
        // Command + Shift + - and Command + Shift + = on a US layout.
        assert!(is_loose_key_match("Cmd+-", true, "_"));
        assert!(is_loose_key_match("Cmd+=", true, "+"));
    }

    #[test]
    fn the_accelerator_itself_is_not_loose() {
        assert!(!is_loose_key_match("Cmd+-", false, "-"));
        assert!(!is_loose_key_match("Cmd+=", false, "="));
        assert!(!is_loose_key_match("Cmd+B", false, "b"));
        assert!(!is_loose_key_match("Cmd+Shift+D", true, "D"));
        assert!(!is_loose_key_match("Cmd+Alt+Shift+C", true, "C"));
    }

    #[test]
    fn shift_that_types_the_accelerator_key_is_not_loose() {
        // A layout where = is Shift + 0.
        assert!(!is_loose_key_match("Cmd+=", true, "="));
    }

    #[test]
    fn a_key_press_chooses_loosely_only_until_its_item_could_have_been_reported() {
        let now = Instant::now();
        let press = |at| KeyPress {
            shift: true,
            typed: "_".into(),
            at,
        };
        assert!(press(now).chose_loosely("Cmd+-", now));
        assert!(!press(now).chose_loosely("Cmd+-", now + KEY_PRESS_LIFETIME));
    }
}
