import { fetchPage } from './setup'

/** Scroll to the top of the page. */
const scroll = async (x: number, y: number) => {
  await fetchPage().evaluate(
    (x: number, y: number) => {
      window.scroll(x, y)
    },
    x,
    y,
  )
}

export default scroll
