import Command from '../../../@types/Command'

/** Mock commands for GestureMenu testing. These commands are stable and won't change when real commands change. */
const mockCommands: Command[] = [
  {
    id: 'testCommand1',
    label: 'Test Command 1',
    description: 'First test command',
    gesture: 'r',
    exec: () => {},
  },
  {
    id: 'testCommand2',
    label: 'Test Command 2',
    description: 'Second test command',
    gesture: 'rd',
    exec: () => {},
  },
  {
    id: 'testCommand3',
    label: 'Test Command 3',
    description: 'Third test command',
    gesture: 'rdr',
    exec: () => {},
  },
  {
    id: 'testCommand4',
    label: 'Test Command 4',
    description: 'Fourth test command',
    gesture: 'rdl',
    exec: () => {},
  },
  {
    id: 'testCommand5',
    label: 'Test Command 5',
    description: 'Fifth test command',
    gesture: 'rl',
    exec: () => {},
  },
  {
    id: 'openGestureCheatsheet',
    label: 'Gesture Cheatsheet',
    description: 'Open gesture cheatsheet',
    gesture: 'u',
    exec: () => {},
  },
  {
    id: 'cancel',
    label: 'Cancel',
    description: 'Cancel gesture',
    exec: () => {},
  },
]

export default mockCommands
