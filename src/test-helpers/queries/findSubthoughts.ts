import { findAllByLabelText } from '@testing-library/dom'
import { findThoughtByText } from './findThoughtByText'
import { getClosestByLabel } from './getClosestByLabel'

/** Finds all the subthoughts of a thought. Returns the child of each. Use findAllByLabelText([CHILD], 'thought') to select a child thought or use findSubthoughts(CHILD) to find child subthoughts. */
export const findSubthoughts = async (value?: HTMLElement | string | null): Promise<HTMLElement[]> => {
  if (!value) return []
  const thought = typeof value === 'string' ? await findThoughtByText(value) : value
  const container = getClosestByLabel(thought, 'child')!
  // there may be expanded descendant subthoughts, so only select the first
  const subthoughts = (await findAllByLabelText(container, 'subthoughts'))[0]
  const children = Array.from(subthoughts.childNodes).filter(
    child => (child as HTMLElement)?.getAttribute('aria-label') === 'child',
  )
  return children as HTMLElement[]
}
