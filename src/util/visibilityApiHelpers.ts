type T = 'hidden' | 'webkitHidden' | 'mozHidden' | 'msHidden' | 'oHidden'

/** Get hidden prop(browser specific) name. */
const getBrowserHiddenProp = (): T | null => {
  const prefixes = ['hidden', 'webkitHidden', 'mozHidden', 'msHidden', 'oHidden']
  if ('hidden' in document) return 'hidden'
  return (prefixes.find(prefix => prefix in document) as T) || null
}

/** Checks whether the current tab is hidden. */
export const isTabHidden = () => {
  const browserHiddenProp = getBrowserHiddenProp()
  if (!browserHiddenProp) return false

  return document[browserHiddenProp]
}

/** Get hidden prop(browser specific) name. */
export const getVisibilityChangeEventName = () => {
  const browserHiddenProp = getBrowserHiddenProp()

  if (browserHiddenProp) {
    const visiblityEventName = `${browserHiddenProp.replace(/[H|h]idden/, '')}visibilitychange`
    return visiblityEventName
  }
  return null
}
