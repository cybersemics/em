import { Browser } from 'webdriverio'
import partialWithRef from '../../../test-helpers/partialWithRef'

// helpers
import clickThought from './clickThought'
import editThought from './editThought'
import gesture from './gesture'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import getNativeElementRect from './getNativeElementRect'
import initSession from './initSession'
import hideKeyboardByTappingDone from './hideKeyboardByTappingDone'
import paste from './paste'
import tapReturnKey from './tapReturnKey'
import tapWithOffset from './tapWithOffset'
import waitForEditable from './waitForEditable'
import waitForElement from './waitForElement'
import waitForElementNotExist from './waitForElementNotExist'

async function pasteOverload(text: string): Promise<void>
async function pasteOverload(pathUnranked: string[], text: string): Promise<void>
/** Parameter<...> doesn't handle function overload afaik, so we need to fix the types manually before exporting. */
async function pasteOverload(pathUnranked: string | string[], text?: string): Promise<void> { /** */ }

const init = initSession()

const helpers = {
  clickThought,
  editThought,
  gesture,
  getEditable,
  getEditingText,
  getNativeElementRect,
  hideKeyboardByTappingDone,
  paste,
  tapReturnKey,
  tapWithOffset,
  waitForEditable,
  waitForElement,
  waitForElementNotExist,
}

/** Setup up the Browser instance for all helpers and returns an index of test helpers with the Browser instance partially applied. */
const index = () => {

  const browserRef = {} as { current?: Browser<'async'> }
  const index = partialWithRef(browserRef, helpers)

  beforeEach(async () => {
    browserRef.current = await init()
  })

  return index as typeof index & {
    paste: typeof pasteOverload,
  }
}

export default index
