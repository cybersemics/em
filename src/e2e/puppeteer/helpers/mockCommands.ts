import Command from '../../../@types/Command'

/** Mock commands for GestureMenu testing. These commands are stable and won't change when real commands change. */
const mockCommands: Command[] = [
  {
    id: 'testCommand1',
    label: 'Test Command 1',
    description: 'First test command',
    gesture: 'r',
    multicursor: false,
    exec: () => {},
  },
  {
    id: 'testCommand2',
    label: 'Test Command 2',
    description: 'Second test command',
    gesture: 'rd',
    multicursor: false,
    exec: () => {},
  },
  {
    id: 'testCommand3',
    label: 'Test Command 3',
    description: 'Third test command',
    gesture: 'rdr',
    multicursor: false,
    exec: () => {},
  },
  {
    id: 'testCommand4',
    label: 'Test Command 4',
    description: 'Fourth test command',
    gesture: 'rdl',
    multicursor: false,
    exec: () => {},
  },
  {
    id: 'testCommand5',
    label: 'Test Command 5',
    description: 'Fifth test command',
    gesture: 'rl',
    multicursor: false,
    exec: () => {},
  },
  {
    id: 'openGestureCheatsheet',
    label: 'Gesture Cheatsheet',
    description: 'Open gesture cheatsheet',
    gesture: 'u',
    multicursor: false,
    exec: () => {},
  },
  {
    id: 'cancel',
    label: 'Cancel',
    description: 'Cancel gesture',
    multicursor: false,
    exec: () => {},
  },
] as Command[]

export default mockCommands
