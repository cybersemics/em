import { ALLOWED_FORMATTING_TAGS } from '../constants'

/** Removes empty formatting elements (e.g. the <font> left behind after extractContents splits a colored range). */
const removeEmptyFormatting = (container: HTMLElement) => {
  for (const el of Array.from(container.querySelectorAll(ALLOWED_FORMATTING_TAGS.join(',')))) {
    if ((el.textContent ?? '') === '') el.remove()
  }
}

export default removeEmptyFormatting
