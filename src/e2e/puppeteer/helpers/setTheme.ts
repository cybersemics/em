import { WindowEm } from '../../../initialize'
import { page } from '../setup'

const em = window.em as WindowEm

/** Set color theme to light or dark. */
const setTheme = async (theme: 'Light' | 'Dark'): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

  await page.evaluate(theme => {
    em.store.dispatch({ type: 'settings', key: 'Theme', value: theme })
  }, theme)
}

export default setTheme
