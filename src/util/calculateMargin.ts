import { DROPEND_MARGINLEFT, DROPHOVER_FINGERSHIFT, DROPHOVER_MARGINLEFT } from '../constants'

/**
 * Calculates the margin-left of drop-end and drop-hover.
 */
function calculateMargin({ isTouch, shiftDropHover }: { isTouch: boolean; shiftDropHover: boolean }) {
  // Calculate the marginLeft of drop-end and drop-hover
  const marginLeftDropEnd = isTouch ? `${DROPEND_MARGINLEFT + DROPHOVER_FINGERSHIFT}em` : `${DROPEND_MARGINLEFT}em`
  const marginLeftDrophover = shiftDropHover
    ? `calc(${DROPHOVER_MARGINLEFT - DROPHOVER_FINGERSHIFT}em - 13px)`
    : `calc(${DROPHOVER_MARGINLEFT}em - 13px)`

  return {
    marginLeftDropEnd,
    marginLeftDrophover,
  }
}

export default calculateMargin
