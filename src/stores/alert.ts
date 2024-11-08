import reactMinistore from './react-ministore'

/** A store that tracks the message displayed in the Alert component. Used to circumvent Redux state for high volume renders (e.g. import progress). Automatically cleared by the alert action-creator. Note: Not cleared by the alert reducer, so make sure to manually call alertStore.update(null) to clear if not using the action-creator. */
const alertStore = reactMinistore<string | null>(null)

export default alertStore
