import { store } from '../store.js'
import { SHOW_OVERLAY, HIDE_OVERLAY, UPDATE_OVERLAY } from '../constants'

export const overlayReveal = ({ id, name, description }) => {
    store.dispatch({
        type: SHOW_OVERLAY,
        id,
        name,
        description
    })
}

export const overlayUpdate = ({ id, name, description }) => {
    store.dispatch({
        type: UPDATE_OVERLAY,
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
