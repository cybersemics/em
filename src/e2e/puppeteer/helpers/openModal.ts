import { Page } from 'puppeteer'
import ModalType from '../../../@types/Modal'
import { WindowEm } from '../../../initialize'

const em = window.em as WindowEm

/** Directly opens a Modal. ONLY USE for test modals. Open normal modals through the UI as a user would. */
const openModal = async (page: Page, id: ModalType): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

  await page.evaluate(id => {
    em.store.dispatch({ type: 'showModal', id })
  }, id)
}

export default openModal
