import { Page } from 'puppeteer'
import { Child, Context } from '../../../types'
import { WindowEm } from '../../../initialize'

/**
 * Wait until given context has a child with given value.
 */
const waitForContextHasChildWithValue = async (page: Page, context: Context, childValue: string) =>
  await page.waitForFunction(
    (context: [], childValue: string) =>
      (window.em as WindowEm).getAllChildren(context).some((child: Child) => child.value === childValue) &&
      (window.em as WindowEm).getLexeme(childValue),
    {},
    context,
    childValue,
  )

export default waitForContextHasChildWithValue
