import type { PreloadedEmWindow } from '../../../@types'
import Command from '../../../@types/Command'
import { page } from '../session'
import refresh from './refresh'

/** Replaces the commands the app lists and matches against gestures and keyboard shortcuts with inert commands built from plain data, so that a snapshot of a command list does not change whenever a command is added, removed, or renamed. The app reads the stubs once at startup, so this preloads them into testFlags and reloads the page; call it before arranging anything else. Per-test page isolation restores the registered commands. */
const stubCommands = async (
  stubs: Pick<Command, 'label' | 'gesture' | 'keyboard' | 'description'>[],
): Promise<void> => {
  await page.evaluateOnNewDocument(stubs => {
    const preloadedWindow: PreloadedEmWindow = window
    preloadedWindow.em = {
      ...preloadedWindow.em,
      testFlags: {
        ...preloadedWindow.em?.testFlags,
        stubCommands: stubs,
      },
    }
  }, stubs)
  await refresh()
}

export default stubCommands
