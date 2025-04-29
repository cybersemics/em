import { useSelector } from 'react-redux'
import Path from '../@types/Path'
import { isSafari, isTouch, isiPhone } from '../browser'
import attributeEquals from '../selectors/attributeEquals'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

const isIOSSafari: boolean = isTouch && isiPhone && isSafari()

/**
 * Returns a variable that determines the bullet and bullet overlay position.
 *
 * The margin and padding values are defined within this hook to ensure
 * that any changes in consuming components are automatically synchronized
 * across other components.
 */
export default function useBulletPosition({ path }: { path?: Path }) {
  const fontSize = useSelector(state => state.fontSize)

  const simplePath = useSelector(state => path && simplifyPath(state, path))

  const isTableCol1 = useSelector(state =>
    simplePath ? attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table') : false,
  )

  const isInContextView = useSelector(state => path && isContextViewActive(state, parentOf(path)))

  // thought's lineheight
  const lineHeight = fontSize * 1.25

  // variables related to Bullet component
  const bulletOverlayRadius = isIOSSafari ? 300 : 245

  // bullet span
  // calculate position of bullet for different font sizes
  // Table column 1 needs more space between the bullet and thought for some reason
  const bulletSpanWidth = 11 - (fontSize - 9) * 0.5 + (!isInContextView && isTableCol1 ? fontSize / 4 : 0)
  const bulletSpanLeftPosition = -bulletSpanWidth

  // bullet svg
  const bulletSvgLeftPosition = lineHeight * 0.317

  const bulletSvgMarginLeft = -lineHeight

  const glyphMarginBottom = -(isIOSSafari ? 0.2 : 0.3) * fontSize

  // variables related to ContextView component
  const ctxViewBreadcrumbMarginTop = 0.533 * fontSize

  const ctxViewBreadcrumbFontSize = 0.867 * fontSize

  const ctxViewBreadcrumbPaddingTop = 0.5 * fontSize

  // variables related to ThoughtAnnotation component
  const thoughtAnnotationHorizontalPadding = 0.333 * fontSize

  const thoughtAnnotationMarginLeft = fontSize - 18

  return {
    lineHeight,
    bulletOverlayRadius,

    bullet: {
      svgLeft: bulletSvgLeftPosition,
      glyphMarginBottom,
      svgMarginLeft: bulletSvgMarginLeft,
      spanWidth: bulletSpanWidth,
      spanLeft: bulletSpanLeftPosition,
    },
    ctxViewWithBreadcrumb: {
      marginTop: ctxViewBreadcrumbMarginTop,
      fontSize: ctxViewBreadcrumbFontSize,
      paddingTop: ctxViewBreadcrumbPaddingTop,
    },
    thoughtAnnotation: {
      horizontalPadding: thoughtAnnotationHorizontalPadding,
      marginLeft: thoughtAnnotationMarginLeft,
    },
  }
}
