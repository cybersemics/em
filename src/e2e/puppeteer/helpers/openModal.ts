import ModalType from '../../../@types/Modal'
import { WindowEm } from '../../../initialize'
import sleep from '../../../util/sleep'
import { page } from '../setup'

const em = window.em as WindowEm

/** Directly opens a Modal. */
const openModal = async (id: ModalType): Promise<void> => {
  await sleep(100)

  await page.evaluate(id => {
    em.store.dispatch({ type: 'showModal', id })
  }, id)
}

export default openModal
