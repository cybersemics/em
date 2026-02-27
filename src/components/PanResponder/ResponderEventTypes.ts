/**
 * Copyright (c) Nicolas Gallagher.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Faithful TypeScript port of react-native-web's ResponderEventTypes.js.
 */

export interface Touch {
  force: number
  identifier: number
  locationX: number | undefined
  locationY: number | undefined
  pageX: number
  pageY: number
  target: EventTarget | null
  timestamp: number
}

export interface TouchEvent {
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  changedTouches: Touch[]
  force: number
  identifier: number
  locationX: number | undefined
  locationY: number | undefined
  pageX: number
  pageY: number
  target: EventTarget | null
  timestamp: number
  touches: Touch[]
  type?: string
}

export const BLUR = 'blur'
export const CONTEXT_MENU = 'contextmenu'
export const FOCUS_OUT = 'focusout'
export const MOUSE_DOWN = 'mousedown'
export const MOUSE_MOVE = 'mousemove'
export const MOUSE_UP = 'mouseup'
export const MOUSE_CANCEL = 'dragstart'
export const TOUCH_START = 'touchstart'
export const TOUCH_MOVE = 'touchmove'
export const TOUCH_END = 'touchend'
export const TOUCH_CANCEL = 'touchcancel'
export const SCROLL = 'scroll'
export const SELECT = 'select'
export const SELECTION_CHANGE = 'selectionchange'

/** Checks if the event type is cancelish (touchcancel or dragstart). */
export function isCancelish(eventType: string): boolean {
  return eventType === TOUCH_CANCEL || eventType === MOUSE_CANCEL
}

/** Checks if the event type is a start event (touchstart or mousedown). */
export function isStartish(eventType: string): boolean {
  return eventType === TOUCH_START || eventType === MOUSE_DOWN
}

/** Checks if the event type is a move event (touchmove or mousemove). */
export function isMoveish(eventType: string): boolean {
  return eventType === TOUCH_MOVE || eventType === MOUSE_MOVE
}

/** Checks if the event type is an end event (touchend, mouseup, or cancel). */
export function isEndish(eventType: string): boolean {
  return eventType === TOUCH_END || eventType === MOUSE_UP || isCancelish(eventType)
}

/** Checks if the event type is a scroll event. */
export function isScroll(eventType: string): boolean {
  return eventType === SCROLL
}

/** Checks if the event type is a selection change event. */
export function isSelectionChange(eventType: string): boolean {
  return eventType === SELECT || eventType === SELECTION_CHANGE
}
