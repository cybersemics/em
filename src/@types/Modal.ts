import * as modals from '../components/modals'

/** Labels are used in autogenerate CSS classes, e.g. modal-welcome. */
type Modal = keyof typeof modals

export default Modal
