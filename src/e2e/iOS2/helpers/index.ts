import { Browser } from 'webdriverio'
import partialWithRef from '../../../test-helpers/partialWithRef'
// helpers
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
import initSession from './initSession'
import isKeyboardShown from './isKeyboardShown'
import keyboard from './keyboard'
import newThought from './newThought'
import paste from './paste'
import swipe from './swipe'
import tap from './tap'
import tapReturnKey from './tapReturnKey'
import waitForEditable from './waitForEditable'
import waitForElement from './waitForElement'
import waitUntil from './waitUntil'

// Only used as a type.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function pasteOverload(text: string): Promise<void>
async function pasteOverload(pathUnranked: string[], text: string): Promise<void>
/** Parameter<...> doesn't handle function overload afaik, so we need to fix the types manually before exporting. */
async function pasteOverload(): Promise<void> {
  /** */
}

const helpers = {
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
  newThought,
  paste,
  swipe,
  tap,
  tapReturnKey,
  type: keyboard.type,
  waitForEditable,
  waitForElement,
  waitUntil,
}

/** Setup up the Browser instance for all helpers and returns an index of test helpers with the Browser instance partially applied. */
const index = () => {
  const init = initSession()
  const browserRef = {} as { current?: Browser<'async'> }
  const index = partialWithRef(browserRef, helpers)

  beforeEach(async () => {
    browserRef.current = await init()
  }, 30000)

  return index as typeof index & {
    paste: typeof pasteOverload
  }
}

export default index
