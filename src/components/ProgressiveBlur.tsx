import { MotionValue, motion } from 'framer-motion'
import React from 'react'
import { css } from '../../styled-system/css'

interface ProgressiveBlurProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Direction of the blur progression. */
  direction?:
    | 'to right'
    | 'to left'
    | 'to top'
    | 'to bottom'
    | 'to bottom right'
    | 'to bottom left'
    | 'to top right'
    | 'to top left'
  /** Maximum blur radius in pixels. */
  maxBlur?: number
  /** Minimum blur radius in pixels (applied to all layers). */
  minBlur?: number
  /** Number of discrete blur layers. */
  layers?: number
  /** Width override. */
  width?: string | number
  /** Optional MotionValue to animate the opacity of the progressive blur effect. Avoids the Safari bug where animating opacity on a parent of backdrop-filter elements breaks the blur. */
  opacity?: MotionValue<number>
}

/** A progressive blur component using a multi-layered slice technique with backdrop-filter. */
const ProgressiveBlur = ({
  direction = 'to right',
  maxBlur = 32,
  minBlur = 0,
  layers = 8,
  width = '100%',
  opacity,
  className,
  ...props
}: ProgressiveBlurProps) => {
  const blurLayers = Array.from({ length: layers }).map((_, i) => {
    // Blur radius follows a quadratic curve for a more natural look.
    // We add the minBlur as a constant baseline.
    const radius = minBlur + Math.pow((layers - i) / layers, 2) * (maxBlur - minBlur)

    // Each layer covers a specific slice with a generous overlap (feather) to ensure smoothness.
    const start = (i / layers) * 100
    const end = ((i + 1) / layers) * 100
    const feather = (100 / layers) * 2 // Double feather for smoother blending

    return { radius, start, end, feather }
  })

  return (
    <div
      {...props}
      className={css({
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      })}
      style={{ width, ...props.style }}
    >
      {blurLayers.map((layer, i) => (
        <motion.div
          key={i}
          className={css({
            position: 'absolute',
            inset: 0,
          })}
          style={{
            opacity,
            backdropFilter: `blur(${layer.radius.toFixed(2)}px)`,
            WebkitBackdropFilter: `blur(${layer.radius.toFixed(2)}px)`,

            // Sliced mask with overlap (feather)
            maskImage: `linear-gradient(${direction}, transparent ${layer.start - layer.feather}%, black ${layer.start}%, black ${layer.end}%, transparent ${layer.end + layer.feather}%)`,
            WebkitMaskImage: `linear-gradient(${direction}, transparent ${layer.start - layer.feather}%, black ${layer.start}%, black ${layer.end}%, transparent ${layer.end + layer.feather}%)`,
          }}
        />
      ))}
    </div>
  )
}

export { ProgressiveBlur }
export default ProgressiveBlur
