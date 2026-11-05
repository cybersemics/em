/** A top level menu of the desktop app's system menu bar. App is the menu named after the app on macOS, where Settings belongs by convention. Windows and Linux have no such menu, so its commands go in File there. */
type SystemMenu = 'App' | 'File' | 'Edit' | 'Cursor' | 'View' | 'Help'

export default SystemMenu
