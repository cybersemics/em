import { store } from '../store.js'
import { SHOW_OVERLAY, HIDE_OVERLAY } from '../constants'

export const overlayReveal = ({ id, name, description }) => {
    store.dispatch({
        type: SHOW_OVERLAY,
        id,
        name,
        description
    })
}

export const overlayHide = () => {
    store.dispatch({
        type: HIDE_OVERLAY
    })
}
