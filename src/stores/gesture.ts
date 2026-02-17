import Command from '../@types/Command'
import GestureString from '../@types/GestureString'
import cancelShortcut from '../commands/cancel'
import openHelpCommand from '../commands/help'
import reactMinistore from './react-ministore'

// a ministore that tracks the current gesture sequence and possible commands
const gestureStore = reactMinistore({
  /** The current gesture in progress. */
  gesture: '' as GestureString,
  /** The possible commands that can be executed from the current gesture as a starting sequence. Always includes cancel and help. */
  possibleCommands: [cancelShortcut, openHelpCommand] as Command[],
})

export default gestureStore
