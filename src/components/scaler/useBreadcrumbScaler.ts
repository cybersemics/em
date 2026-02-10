import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { BASE_FONT_SIZE } from '../../constants'

export type BreadcrumbPlacement = 'thought' | 'navbar' | 'thoughtLink'

/**
 * Calculates the scale factor for breadcrumbs based on their placement location.
 *
 * The scale factor adjusts breadcrumb size relative to the base context breadcrumb font size
 * (0.867 * fontSize) to maintain consistent sizing across different UI locations.
 *
 * @param placement - The location where the breadcrumb is displayed
 * - 'navbar': Renders at a fixed 14px equivalent size
 * - 'thoughtLink': Renders at 16px(BASE_FONT_SIZE) * 0.867 equivalent size
 * - other: Uses default scale of 1.
 * @returns A scale multiplier to apply to the breadcrumb component.
 */
const useBreadcrumbScaler = (placement: BreadcrumbPlacement): number => {
  const fontSize = useSelector(state => state.fontSize)
  return useMemo(() => {
    const ctxBreadcrumbRootContainerFontSize = 0.867 * fontSize
    if (placement === 'navbar') {
      return 14 / ctxBreadcrumbRootContainerFontSize
    }

    if (placement === 'thoughtLink') {
      return (BASE_FONT_SIZE * 0.867) / ctxBreadcrumbRootContainerFontSize
    }
    return 1
  }, [fontSize, placement])
}

export default useBreadcrumbScaler
