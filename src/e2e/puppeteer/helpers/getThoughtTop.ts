import { page } from '../session'

/** Gets a thought's y position relative to the viewport or document. Throws if the thought is not rendered. */
const getThoughtTop = async (
  value: string,
  { relativeTo = 'viewport' }: { relativeTo?: 'viewport' | 'document' } = {},
): Promise<number> => {
  const top = await page.evaluate(
    ({ value, relativeTo }) => {
      const thought = Array.from(document.querySelectorAll('[data-editable]')).find(
        element => element.innerHTML === value,
      )
      return thought ? thought.getBoundingClientRect().top + (relativeTo === 'document' ? window.scrollY : 0) : null
    },
    { value, relativeTo },
  )
  if (top === null) throw new Error(`Thought "${value}" is not rendered.`)
  return top
}

export default getThoughtTop
