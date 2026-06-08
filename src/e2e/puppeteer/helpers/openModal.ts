import ModalType from '../../../@types/Modal'
import type { WindowEm } from '../../../initialize'
import { page } from '../setup'
import waitUntil from './waitUntil'

/** Directly opens a Modal and waits for it to finish loading. */
const openModal = async (id: ModalType): Promise<void> => {
  await page.evaluate(id => {
    const em = window.em as WindowEm
    em.store.dispatch({ type: 'showModal', id })
  }, id)

  // Wait for any loading indicators to disappear
  // Check for elements with data-loading-indicator attribute (LoadingEllipsis component)
  await waitUntil(() => {
    const modalContent = document.querySelector('[aria-label="modal-content"]')
    if (!modalContent) return false

    const hasLoadingIndicator = modalContent.querySelector('[data-loading-indicator]') !== null

    return !hasLoadingIndicator
  })
}

export default openModal
