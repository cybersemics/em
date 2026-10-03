import { RefObject, useLayoutEffect } from 'react'
import virtualKeyboardStore from '../stores/virtualKeyboardStore'

const properties = {
  height: '--virtual-keyboard-height',
  openPercent: '--virtual-keyboard-open-percent',
} as const

/** Binds a keyboard metric to its CSS consumers without rendering or inheriting it across the page. */
const useVirtualKeyboardCssProperty = (
  metric: keyof typeof properties,
  elementRefs?: readonly RefObject<HTMLElement | null>[],
) => {
  useLayoutEffect(() => {
    if (!elementRefs) return
    const property = properties[metric]
    const elements = elementRefs.flatMap(ref => (ref.current ? [ref.current] : []))
    const previous = elements.map(element => ({
      element,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property),
    }))
    /** Writes only the referenced consumers, keeping the metric out of unrelated inherited styles. */
    const update = (value: number) => {
      elements.forEach(element => element.style.setProperty(property, metric === 'height' ? `${value}px` : `${value}`))
    }
    update(virtualKeyboardStore.getState()[metric])
    const unsubscribe = virtualKeyboardStore.subscribeSelector(state => state[metric], update)
    return () => {
      unsubscribe()
      previous.forEach(({ element, value, priority }) => {
        if (value) element.style.setProperty(property, value, priority)
        else element.style.removeProperty(property)
      })
    }
  }, [elementRefs, metric])
}

export default useVirtualKeyboardCssProperty
