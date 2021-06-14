import { RefObject } from 'react'
import { Browser } from 'webdriverio'
import testDriver from '../../../test-helpers/testDriver'
import { Index } from '../../../types'

// helpers
import clickThought from './clickThought'
import editThought from './editThought'
import gesture from './gesture'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import getNativeElementRect from './getNativeElementRect'
import hideKeyboardByTappingDone from './hideKeyboardByTappingDone'
import init from './initSession'
import paste from './paste'
import tapReturnKey from './tapReturnKey'
import tapWithOffset from './tapWithOffset'
import waitForEditable from './waitForEditable'
import waitForElement from './waitForElement'
import waitForElementNotExist from './waitForElementNotExist'

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

const index = (browserRef: RefObject<Browser<'async'>>) => testDriver(browserRef, helpers)

export default index
