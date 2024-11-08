import { fireEvent } from '@testing-library/react'
import { act } from 'react'

/** Clicks an element within an act block, simulating mousedown and mouseup separately. */
const click = async (selector: string) => {
  const el = document.querySelector(selector)!
  await act(async () => {
    fireEvent.mouseDown(el)
  })
  await act(async () => {
    fireEvent.mouseUp(el)
  })
}

export default click
