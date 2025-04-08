import { WindowEm } from '../../../initialize'
import sleep from '../../../util/sleep'
import { page } from '../setup'
import waitForRender from './waitForRender'

const em = window.em as WindowEm

/** Set color theme to light or dark by directly dispatching settings action. */
const setTheme = async (theme: 'Light' | 'Dark'): Promise<void> => {
  // TODO
  await sleep(100)

  await page.evaluate(theme => {
    em.store.dispatch({ type: 'settings', key: 'Theme', value: theme })
  }, theme)

  await waitForRender()
}

export default setTheme
