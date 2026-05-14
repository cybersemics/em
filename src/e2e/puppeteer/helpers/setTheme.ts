import type { WindowEm } from '../../../initialize'
import sleep from '../../../util/sleep'
import { page } from '../setup'
import waitForEmIdle from './waitForEmIdle'

/** Set color theme to light or dark by directly dispatching settings action. */
const setTheme = async (theme: 'Light' | 'Dark'): Promise<void> => {
  // TODO
  await sleep(200)

  await page.evaluate(theme => {
    const em = window.em as WindowEm
    em.store.dispatch({ type: 'settings', key: 'Theme', value: theme })
  }, theme)
  await waitForEmIdle()

  // TODO
  // Waiting for requestAnimationFrame does not fix the issue.
  await sleep(200)
}

export default setTheme
