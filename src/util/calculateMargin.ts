import { DROPEND_MARGINLEFT, MARGINLEFT_CHANGE } from '../constants'

/**
 * Calculates the change in the margin-left of drop-end to compensate for the shift towards the right on mobile devices.
 */
function calculateNewMargin() {
  // Define the initial value of drop-end marginLeft
  const initialValue = -1

  const dropEndValue = DROPEND_MARGINLEFT
  const changeInValue = MARGINLEFT_CHANGE

  // Calculate the change in drop-end marginLeft from its initial value
  const dropEndChange = dropEndValue - initialValue

  // Calculate the new changeInMarginLeft
  const newChangeInMarginLeft = changeInValue + dropEndChange

  return newChangeInMarginLeft
}

export default calculateNewMargin
