import { Page } from 'puppeteer'
import ModalType from '../../../@types/Modal'
import { WindowEm } from '../../../initialize'

// eslint-disable-next-line @typescript-eslint/no-namespace
declare module global {
  const page: Page
}

const em = window.em as WindowEm

/** Directly opens a Modal. */
const openModal = async (id: ModalType): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 100))

  await global.page.evaluate(id => {
    em.store.dispatch({ type: 'showModal', id })
  }, id)
}

export default openModal
