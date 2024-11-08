import ministore from './ministore'

/** A store that is used to suppress the Editable focus handler while selecting text for execCommand. */
const suppressFocus = ministore(false)

export default suppressFocus
