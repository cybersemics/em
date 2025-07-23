import ModalType from '../../../@types/Modal'
import { WindowEm } from '../../../initialize'
import { page } from '../setup'

// import waitForFrames from './waitForFrames'

const em = window.em as WindowEm

/** Directly opens a Modal. */
const openModal = async (id: ModalType): Promise<void> => {
  // disable temporarily
  // await waitForFrames()

  await page.evaluate(id => {
    em.store.dispatch({ type: 'showModal', id })
  }, id)
}

export default openModal
