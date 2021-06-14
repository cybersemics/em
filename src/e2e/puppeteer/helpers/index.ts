import _ from 'lodash'
import { Page } from 'puppeteer'
import clickBullet from './clickBullet'
import clickThought from './clickThought'
import clickWithOffset from './clickWithOffset'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import init from './initPage'
import newThought from './newThought'
import paste from './paste'
import waitForAlert from './waitForAlert'
import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'
import waitForEditable from './waitForEditable'
import waitForHiddenEditable from './waitForHiddenEditable'
import waitForState from './waitForState'
import waitForThoughtExistInDb from './waitForThoughtExistInDb'

// TODO: Implement webdriver helpers or throw 'Not Implemented'

const device = (page: Page) => ({

  clickBullet: _.partial(clickBullet, page),
  clickThought: _.partial(clickThought, page),
  clickWithOffset: _.partial(clickWithOffset, page),
  // editThought: _.partial(editThought, page),
  // gesture: _.partial(gesture, page),
  getEditable: _.partial(getEditable, page),
  getEditingText: _.partial(getEditingText, page),
  // getNativeElementRect: _.partial(getNativeElementRect, page),
  // hideKeyboardByTappingDone: _.partial(hideKeyboardByTappingDone, page),
  init,
  newThought: _.partial(newThought, page),
  paste: _.partial(paste, page),
  // tapReturnKey: _.partial(tapReturnKey, page),
  // tapWithOffset: _.partial(tapWithOffset, page),
  waitForAlert: _.partial(waitForAlert, page),
  waitForContextHasChildWithValue: _.partial(waitForContextHasChildWithValue, page),
  waitForEditable: _.partial(waitForEditable, page),
  // waitForElement: _.partial(waitForElement, page),
  // waitForElementNotExist: _.partial(waitForElementNotExist, page),
  waitForHiddenEditable: _.partial(waitForHiddenEditable, page),
  waitForState: _.partial(waitForState, page),
  waitForThoughtExistInDb: _.partial(waitForThoughtExistInDb, page),

})

export default device
