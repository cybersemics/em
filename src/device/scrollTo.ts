/** Scrolls the content to the top or bottom. */
const scrollTo = (target: 'top' | 'bottom', behavior?: 'smooth') => {
  const top = target === 'top' ? 0 : target === 'bottom' ? document.body.scrollHeight : null

  if (top === null) {
    throw new Error('Unrecognized scrollTo target: ' + target)
  }

  window.scrollTo({
    top,
    left: 0,
    behavior,
  })
}

export default scrollTo
