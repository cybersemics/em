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
import initSession from './initSession'
import isKeyboardShown from './isKeyboardShown'
import hideKeyboardByTappingDone from './hideKeyboardByTappingDone'
import paste from './paste'
import getSelection from './getSelection'
import tapReturnKey from './tapReturnKey'
import tap from './tap'
import type from './type'
import waitForEditable from './waitForEditable'
import waitForElement from './waitForElement'
import waitUntil from './waitUntil'
import newThought from './newThought'

async function pasteOverload(text: string): Promise<void>
async function pasteOverload(pathUnranked: string[], text: string): Promise<void>
/** Parameter<...> doesn't handle function overload afaik, so we need to fix the types manually before exporting. */
async function pasteOverload(pathUnranked: string | string[], text?: string): Promise<void> {
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
  tap,
  tapReturnKey,
  type,
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
  })

  return index as typeof index & {
    paste: typeof pasteOverload
  }
}

export default index
