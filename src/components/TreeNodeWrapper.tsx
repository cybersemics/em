import { CSSProperties, ReactNode } from 'react'
import { css } from '../../styled-system/css'

type TreeNodeWrapperBaseProps = {
  isTableCol1?: boolean
  x: number
  y: number
  width: number
  children?: ReactNode
  ariaLabel?: string
}
type TreeNodeWrapperPlaceholderProps = {
  asPlaceholder: true
  outerTransition?: undefined
  innerTransition?: undefined
  outerStyle?: undefined
  innerStyle?: undefined
} & TreeNodeWrapperBaseProps
type TreeNodeWrapperVisibleProps = {
  asPlaceholder?: false

  outerTransition?: string
  innerTransition?: string
  outerStyle?: CSSProperties
  innerStyle?: CSSProperties
} & TreeNodeWrapperBaseProps

type TreeNodeWrapperProps = TreeNodeWrapperPlaceholderProps | TreeNodeWrapperVisibleProps
/**
 * A reusable positioned container that mirrors the outer/inner layout and transitions
 * used by `TreeNode`, while remaining lightweight for wrapper use in BulletCursorOverlay to mimic the real thought layout.
 */
export default function TreeNodeWrapper({
  children,
  isTableCol1 = false,
  x,
  y,
  width,
  outerTransition,
  innerTransition,
  outerStyle,
  innerStyle,
  ariaLabel,
  asPlaceholder,
}: TreeNodeWrapperProps) {
  const baseOuterStyle = {
    left: x,
    top: y,
    // Table col1 uses its exact width since cannot extend to the right edge of the screen.
    // All other thoughts extend to the right edge of the screen. We cannot use width auto as it causes the text to wrap continuously during the counter-indentation animation, which is jarring. Instead, use a fixed width of the available space so that it changes in a stepped fashion as depth changes and the word wrap will not be animated. Use x instead of depth in order to accommodate ancestor tables.
    // 1em + 10px is an eyeball measurement at font sizes 14 and 18
    // (Maybe the 10px is from .content padding-left?)
    width: isTableCol1 ? (width ?? 0) : (`calc(100% - ${x}px + 1em + 10px)` as const),
    ...(asPlaceholder && isTableCol1 ? { textAlign: 'right' as const } : {}),
  }

  return (
    <div
      aria-label={ariaLabel}
      className={css({
        position: 'absolute',
        transition:
          outerTransition ??
          'left {durations.layoutNodeAnimation} linear,top {durations.layoutNodeAnimation} ease-in-out',
      })}
      style={{
        ...baseOuterStyle,
        ...(outerStyle || {}),
      }}
    >
      <div
        className={css({
          ...(isTableCol1
            ? {
                position: 'relative',
                width: 'auto',
              }
            : {
                position: 'absolute',
                width: '100%',
              }),
          ...(innerTransition ? { transition: innerTransition! } : {}),
        })}
        style={innerStyle}
      >
        {children}
      </div>
    </div>
  )
}
