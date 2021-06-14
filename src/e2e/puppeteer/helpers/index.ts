import { RefObject } from 'react'
import { Page } from 'puppeteer'
import testDriver from '../../../test-helpers/testDriver'
import { Index } from '../../../types'

// helpers
import clickBullet from './clickBullet'
import clickThought from './clickThought'
import clickWithOffset from './clickWithOffset'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import newThought from './newThought'
import paste from './paste'
import press from './press'
import type from './type'
import waitForAlert from './waitForAlert'
import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'
import waitForEditable from './waitForEditable'
import waitForHiddenEditable from './waitForHiddenEditable'
import waitForState from './waitForState'
import waitForThoughtExistInDb from './waitForThoughtExistInDb'

// TODO: Implement webdriver helpers or throw 'Not Implemented'
// TODO: Why do the args need to be declared as any[]? testDriver type is off.
const helpers: Index<(page: Page, ...args: any[]) => unknown> = {
  clickBullet,
  clickThought,
  clickWithOffset,
  // editThought,
  // gesture,
  getEditable,
  getEditingText,
  // getNativeElementRect,
  // hideKeyboardByTappingDone,
  newThought,
  paste,
  press,
  type,
  // tapReturnKey,
  // tapWithOffset,
  waitForAlert,
  waitForContextHasChildWithValue,
  waitForEditable,
  // waitForElement,
  // waitForElementNotExist,
  waitForHiddenEditable,
  waitForState,
  waitForThoughtExistInDb,
}

const index = (pageRef: RefObject<Page>) => testDriver(pageRef, helpers)

export default index
