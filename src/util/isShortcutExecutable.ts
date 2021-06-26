import { State } from '../util/initialState'
import { isDocumentEditable } from './isDocumentEditable'

/** Checks if shortcut is executable. */
export const isShortcutExecutable = (getState: () => State) => isDocumentEditable() && !!getState().cursor
