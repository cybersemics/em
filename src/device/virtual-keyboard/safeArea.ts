/** Measures the safe-area-bottom inset in pixels. Returns 0 if unavailable. */
const measureSafeAreaBottom = (): number => {
  if (typeof document === 'undefined') return 0
  const div = document.createElement('div')
  div.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom);visibility:hidden'
  document.body.appendChild(div)
  const value = div.getBoundingClientRect().height
  document.body.removeChild(div)
  return value
}

export default measureSafeAreaBottom
