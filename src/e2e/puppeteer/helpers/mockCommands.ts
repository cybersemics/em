import Command from '../../../@types/Command'

/**
 * Mock commands for GestureMenu testing.
 *
 * These commands provide stable fixtures for the GestureMenu puppeteer test to ensure snapshot stability.
 * When real command gestures change (e.g., a command's gesture is modified from 'rd' to 'ru'), the GestureMenu
 * snapshot would fail. By using these mock commands with fixed gestures, the snapshot remains stable.
 *
 * The mock commands have fixed gestures: r, rd, rdr, rdl, rl, rdld (cheatsheet).
 * Special commands 'openGestureCheatsheet' and 'cancel' are included because they have special behavior
 * in the GestureMenu component (they appear at the end of the list).
 *
 * To use: call setMockCommands() before performing a gesture in the test.
 */
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
    gesture: 'rdld',
    multicursor: false,
    exec: () => {},
  },
  {
    id: 'cancel',
    label: 'Cancel',
    description: 'Cancel gesture',
    gesture: undefined,
    multicursor: false,
    exec: () => {},
  },
] as Command[]

export default mockCommands
