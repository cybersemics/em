import { Page } from 'puppeteer'
import { Context } from '../../../types'

/**
 * Wait until given context has a child with given value.
 */
const waitForContextHasChildWithValue = async (page: Page, context: Context, childValue: any) =>
  await page.waitForFunction((context: [], childValue: any) =>
    (window.em as any).getAllChildren(context).some((child: any) => child.value === childValue) > 0 && (window.em as any).getThought(childValue),
  {}, context, childValue
  )

export default waitForContextHasChildWithValue
