import Command from '../@types/Command'

/** Reloads the app, as Command/Ctrl + R reloads a browser tab, which the desktop app otherwise has no way to do short of quitting it. Like a browser reload, it warns first while thoughts are still being saved (see onBeforeUnload in initEvents). */
const reloadCommand = {
  id: 'reload',
  label: 'Reload' as const,
  systemMenu: 'View',
  description: 'Reload the app.',
  keyboard: { key: 'r', meta: true },
  multicursor: false,
  // A browser reloads with a dialog open, too.
  allowExecuteFromModal: true,
  // Reloading belongs to the app shell rather than to em's commands, so neither Help nor the Command Universe lists it.
  hideFromHelp: true,
  exec: () => window.location.reload(),
} satisfies Command

export default reloadCommand
