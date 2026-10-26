import type { PreloadedEmWindow } from '../../../@types'
import Gesture from '../../../@types/Gesture'
import Key from '../../../@types/Key'
import { page } from '../session'
import refresh from './refresh'

/** The plain data a stub command is built from. Everything passed to stubCommands is serialized into the page, so it cannot hold functions. */
interface StubCommand {
  label: string
  gesture?: Gesture | Gesture[]
  keyboard?: Key | Key[] | string
  description?: string
}

/** Replaces the commands the app lists and matches against gestures and keyboard shortcuts with a fixed list, so that a snapshot of a command list does not change whenever a command is added, removed, or renamed. The app reads testFlags.commands only when it loads, so this preloads it and reloads the page: call it before arranging anything else. The registered commands keep working when run by id, and per-test page isolation restores them. */
const stubCommands = async (stubs: StubCommand[]): Promise<void> => {
  await page.evaluateOnNewDocument(stubs => {
    const preloadedWindow: PreloadedEmWindow = window
    preloadedWindow.em = {
      ...preloadedWindow.em,
      testFlags: {
        ...preloadedWindow.em?.testFlags,
        commands: stubs,
      },
    }
  }, stubs)
  await refresh()
}

export default stubCommands
