import ModalType from '../../../@types/Modal'
import { WindowEm } from '../../../initialize'
import { page } from '../setup'
import waitUntil from './waitUntil'

const em = window.em as WindowEm

/** Directly opens a Modal and waits for it to finish loading. */
const openModal = async (id: ModalType): Promise<void> => {
  await page.evaluate(id => {
    em.store.dispatch({ type: 'showModal', id })
  }, id)

  // Wait for modal content to be visible
  await page.waitForSelector('[aria-label="modal-content"]', { visible: true })

  // Wait for any loading indicators to disappear
  // This checks if a "Loading" text is present within the modal and waits for it to be removed
  await waitUntil(() => {
    const modalContent = document.querySelector('[aria-label="modal-content"]')
    if (!modalContent) return false

    // Check if there's any element within the modal containing "Loading" text
    const textContent = modalContent.textContent || ''
    const hasLoading = textContent.includes('Loading')

    // Return true when loading is gone (modal is ready)
    return !hasLoading
  })
}

export default openModal
