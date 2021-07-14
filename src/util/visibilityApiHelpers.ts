type HiddenAttribute = 'hidden' | 'webkitHidden' | 'mozHidden' | 'msHidden' | 'oHidden'

/** Get hidden prop(browser specific) name. */
const getBrowserHiddenProp = (): HiddenAttribute | null => {
  const prefixes = ['hidden', 'webkitHidden', 'mozHidden', 'msHidden', 'oHidden']
  if ('hidden' in document) return 'hidden'
  return (prefixes.find(prefix => prefix in document) as HiddenAttribute) || null
}

/** Checks whether the current tab is hidden. */
export const isTabHidden = (): boolean => {
  const browserHiddenProp = getBrowserHiddenProp()
  if (!browserHiddenProp) return false

  return document[browserHiddenProp as keyof typeof document]
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
