import _ from 'lodash'
import { Browser } from 'webdriverio'
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


const device = (browser: Browser<'async'>) => ({

  clickThought: _.partial(clickThought, browser),
  editThought: _.partial(editThought, browser),
  gesture: _.partial(gesture, browser),
  getEditable: _.partial(getEditable, browser),
  getEditingText: _.partial(getEditingText, browser),
  getNativeElementRect: _.partial(getNativeElementRect, browser),
  hideKeyboardByTappingDone: _.partial(hideKeyboardByTappingDone, browser),
  init,
  paste: _.partial(paste, browser),
  tapReturnKey: _.partial(tapReturnKey, browser),
  tapWithOffset: _.partial(tapWithOffset, browser),
  waitForEditable: _.partial(waitForEditable, browser),
  waitForElement: _.partial(waitForElement, browser),
  waitForElementNotExist: _.partial(waitForElementNotExist, browser),

})

export default device
