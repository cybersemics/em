import { useMemo } from 'react'
import { useSelector } from 'react-redux'

export type BreadcrumbVariant = 'default' | 'small'

/**
 * Calculates the scale factor for breadcrumbs based on their variant.
 *
 * The scale factor adjusts breadcrumb size relative to the base context breadcrumb font size
 * (0.867 * fontSize) to maintain consistent sizing across different UI locations.
 *
 * @param variant - The variant of the breadcrumb
 * - 'small': Renders at a fixed 14px equivalent size (used in navbar, thoughtLink)
 * - 'default': Uses default scale of 1.
 * @returns A scale multiplier to apply to the breadcrumb component.
 */
const useBreadcrumbScaler = (variant: BreadcrumbVariant): number => {
  const fontSize = useSelector(state => state.fontSize)
  return useMemo(() => {
    if (variant === 'small') {
      const ctxBreadcrumbRootContainerFontSize = 0.867 * fontSize
      return 14 / ctxBreadcrumbRootContainerFontSize
    }
    return 1
  }, [fontSize, variant])
}

export default useBreadcrumbScaler
