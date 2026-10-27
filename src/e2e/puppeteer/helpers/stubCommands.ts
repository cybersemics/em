import Command from '../../../@types/Command'
import useTestFlags from './useTestFlags'

/** Replaces the commands the app lists and matches against gestures and keyboard shortcuts with inert commands built from plain data, for every test in the calling describe block or file, so that a snapshot of a command list does not change whenever a command is added, removed, or renamed. The stubs are preloaded before the app starts, since it reads them once at startup. */
const stubCommands = (stubs: Pick<Command, 'label' | 'gesture' | 'keyboard' | 'description'>[]): void =>
  useTestFlags({ stubCommands: stubs })

export default stubCommands
