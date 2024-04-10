import { act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/** Clicks an element within an act block. */
const click = async (selector: string) => {
  const el = document.querySelector(selector)!
  await act(async () => {
    userEvent.click(el)
  })
}

export default click
