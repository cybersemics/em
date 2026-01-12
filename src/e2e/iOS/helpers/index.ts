// Import all helpers to build default export
import $ from './$'
import clickThought from './clickThought'
import editThought from './editThought'
import gesture from './gesture'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import getElementRectByScreen from './getElementRectByScreen'
import getNativeElementRect from './getNativeElementRect'
import getSelection from './getSelection'
import hideKeyboardByTappingDone from './hideKeyboardByTappingDone'
import isKeyboardShown from './isKeyboardShown'
import keyboard from './keyboard'
import newThought from './newThought'
import paste from './paste'
import pause from './pause'
import swipe from './swipe'
import tap from './tap'
import tapReturnKey from './tapReturnKey'
import waitForEditable from './waitForEditable'
import waitForElement from './waitForElement'
import waitUntil from './waitUntil'

/**
 * IOS test helpers for WDIO.
 * All helpers use the global `browser` object provided by the WDIO test runner.
 */

export { default as $ } from './$'
export { default as clickThought } from './clickThought'
export { default as editThought } from './editThought'
export { default as gesture } from './gesture'
export { default as getEditable } from './getEditable'
export { default as getEditingText } from './getEditingText'
export { default as getElementRectByScreen } from './getElementRectByScreen'
export { default as getNativeElementRect } from './getNativeElementRect'
export { default as getSelection } from './getSelection'
export { default as hideKeyboardByTappingDone } from './hideKeyboardByTappingDone'
export { default as isKeyboardShown } from './isKeyboardShown'
export { default as keyboard } from './keyboard'
export { default as newThought } from './newThought'
export { default as paste } from './paste'
export { default as pause } from './pause'
export { default as swipe } from './swipe'
export { default as tap } from './tap'
export { default as tapReturnKey } from './tapReturnKey'
export { default as waitForEditable } from './waitForEditable'
export { default as waitForElement } from './waitForElement'
export { default as waitUntil } from './waitUntil'
export type { GestureOptions } from './gesture'

// Default export as function that returns all helpers
export default () => ({
  $,
  clickThought,
  editThought,
  gesture,
  getEditable,
  getEditingText,
  getElementRectByScreen,
  getNativeElementRect,
  getSelection,
  hideKeyboardByTappingDone,
  isKeyboardShown,
  keyboard,
  newThought,
  paste,
  pause,
  swipe,
  tap,
  tapReturnKey,
  waitForEditable,
  waitForElement,
  waitUntil,
})
