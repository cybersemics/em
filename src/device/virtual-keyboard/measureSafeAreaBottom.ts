/** Returns the safe-area-bottom inset as an integer by reading the CSS variable `--safe-area-inset-bottom`. */
const measureSafeAreaBottom = (): number => {
  if (typeof document === 'undefined') return 0

  const raw = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')
  const value = parseFloat(raw) || 0
  return value
}

export default measureSafeAreaBottom
