import React, { FC, PropsWithChildren, useEffect, useRef, useState } from 'react'
import { css } from '../../../styled-system/css'
import { dialogRecipe } from '../../../styled-system/recipes'

/** Luminance mask applied to the glass stroke and container fill so light appears to fall off toward the bottom of the glass. */
const LUMINANCE_MASK = 'radial-gradient(144.9% 90.61% at 46.96% 13.01%, #FFF 0%, rgba(255, 255, 255, 0.0) 87.02%)'

/** When true, renders color-coded borders and labels on each decorative layer for visual debugging. */
const DEBUG = false

/** Layers that can be toggled individually for layer-by-layer UI refinement. */
const LAYERS = [
  'BackgroundGlow',
  'Highlight',
  'Rainbow',
  'GlassStroke',
  'Highlight-clipped',
  'Rainbow-clipped',
  'ContainerBackground',
  'Content',
  'Gradient',
] as const

type Layer = (typeof LAYERS)[number]

/** When true, renders a floating multiselect picker at the bottom-right that lets you toggle layers interactively. */
const DEBUG_PICKER = true

/** Default ContainerBackground tuning values. Inner hue matches the Figma-derived muted purple; outer hue was dialed in to 223 visually. */
const DEFAULT_BG = {
  hueInner: 282,
  hueOuter: 223,
  saturation: 24,
  lightness: 39,
  alpha: 0.24,
  midAlpha: 0.5,
  cx: 50,
  cy: 15,
  rx: 140,
  ry: 88,
  midStop: 50,
}

/** Returns debug styles for a layer: a colored 4px border and a positioned monospace label. */
const debugStyle = (label: string, color: string) =>
  DEBUG
    ? {
        border: `4px solid ${color}`,
        boxSizing: 'border-box',
        '&::after': {
          content: `"${label}"`,
          position: 'absolute',
          top: '4px',
          left: '4px',
          color,
          fontFamily: 'monospace',
          fontSize: '10px',
          fontWeight: 700,
          lineHeight: 1,
          pointerEvents: 'none',
          zIndex: 9999,
        },
      }
    : {}

/** Soft muted-purple glow concentrated near the top of the glass sheet, fading to transparent toward the bottom. Bakes the Figma "fill × luminance mask" into a single radial gradient. Color is parameterized so the debug picker can tune hue/alpha live. */
interface ContainerBackgroundProps {
  hueInner: number
  hueOuter: number
  saturation: number
  lightness: number
  alpha: number
  midAlpha: number
  cx: number
  cy: number
  rx: number
  ry: number
  midStop: number
}

const ContainerBackground: FC<ContainerBackgroundProps> = ({
  hueInner,
  hueOuter,
  saturation,
  lightness,
  alpha,
  midAlpha,
  cx,
  cy,
  rx,
  ry,
  midStop,
}) => (
  <div
    className={css({
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      ...debugStyle('ContainerBackground', '#f00'),
    })}
    style={{
      background: `radial-gradient(${rx}% ${ry}% at ${cx}% ${cy}%, hsla(${hueInner}, ${saturation}%, ${lightness}%, ${alpha}) 0%, hsla(${hueOuter}, ${saturation}%, ${lightness}%, ${alpha * midAlpha}) ${midStop}%, hsla(${hueOuter}, ${saturation}%, ${lightness}%, 0) 87%)`,
    }}
  />
)

/** Full-screen glow image rendered behind the glass sheet as part of the backdrop. */
const BackgroundGlow: FC = () => (
  <div
    className={css({
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundImage: 'url(/img/dialog/dialog-background-glow.avif)',
      backgroundSize: '250vw 200vh',
      backgroundPosition: 'center bottom',
      backgroundRepeat: 'no-repeat',
      opacity: 0.3,
      pointerEvents: 'none',
      ...debugStyle('BackgroundGlow', '#ff0'),
    })}
  />
)

/** Simulates light hitting and refracting through the top of the glass sheet. The clipped instance is anchored inside the glass container; the unclipped instance is pinned to the top of the viewport so the bleed sits at the absolute top of the screen. */
const Highlight: FC<{ clipped?: boolean }> = ({ clipped }) => (
  <div
    className={css(
      clipped
        ? {
            position: 'absolute',
            top: 'calc(-50vh + 50%)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            height: '40%',
            backgroundImage: 'url(/img/dialog/dialog-highlight.avif)',
            backgroundSize: '150% auto',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top center',
            opacity: 0.2,
            pointerEvents: 'none',
            ...debugStyle('Highlight (clipped)', '#0f0'),
          }
        : {
            position: 'fixed',
            top: -72,
            left: 0,
            width: '100vw',
            height: '40vh',
            backgroundImage: 'url(/img/dialog/dialog-highlight.avif)',
            backgroundSize: '175% auto',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top center',
            opacity: 0.1,
            pointerEvents: 'none',
            ...debugStyle('Highlight', '#0f0'),
          },
    )}
  />
)

/** Simulates rainbow refractions through mist and glass. Rendered both inside and outside the glass container — the unclipped instance bleeds past the edge, while the clipped instance appears trapped in the glass. */
const Rainbow: FC<{ clipped?: boolean }> = ({ clipped }) => (
  <div
    className={css({
      position: 'absolute',
      top: 'calc(-50vh + 50%)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '200vw',
      height: '40%',
      backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'bottom center',
      opacity: clipped ? 0.1 : 0.05,
      mixBlendMode: 'screen',
      pointerEvents: 'none',
      ...debugStyle(clipped ? 'Rainbow (clipped)' : 'Rainbow', '#f0f'),
    })}
  />
)

/** Gradient border on the glass sheet that fades out toward the bottom via a luminance mask. */
const GlassStroke: FC = () => (
  <div
    className={css({
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      /* eslint-disable @pandacss/no-property-renaming */
      maskImage: LUMINANCE_MASK,
      WebkitMaskImage: LUMINANCE_MASK,
      /* eslint-enable @pandacss/no-property-renaming */
      zIndex: 1,
      ...debugStyle('GlassStroke', '#0ff'),
    })}
  >
    <div
      className={css({
        position: 'absolute',
        inset: 0,
        borderRadius: '32px',
        border: '1px solid transparent',
        /* eslint-disable @pandacss/no-hardcoded-color */
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.0) 100%) border-box',
        /* eslint-enable @pandacss/no-hardcoded-color */
        WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
      })}
    />
  </div>
)

interface DialogProps {
  onClose: () => void
  nodeRef: React.RefObject<HTMLDivElement | null>
}

/**
 * Dialog component with liminal glass treatment.
 */
const Dialog: React.FC<PropsWithChildren<DialogProps>> = ({ children, onClose, nodeRef }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const pickerRef = useRef<HTMLElement | null>(null)
  const dialogClasses = dialogRecipe()
  const [visible, setVisible] = useState<Set<Layer>>(() => new Set(LAYERS))
  const [bg, setBg] = useState(DEFAULT_BG)
  const [pickerOpen, setPickerOpen] = useState(true)
  const [dragging, setDragging] = useState(false)
  const setBgProp = <K extends keyof typeof DEFAULT_BG>(key: K, value: (typeof DEFAULT_BG)[K]) =>
    setBg(prev => ({ ...prev, [key]: value }))
  const resetBg = () => setBg(DEFAULT_BG)
  const show = (layer: Layer): boolean => visible.has(layer)
  const toggleLayer = (layer: Layer) =>
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })

  /**
   * Calls the onClose function when the user clicks outside the dialog.
   */
  useEffect(() => {
    const currentDialogRef = dialogRef.current

    /** When the user clicks outside the dialog, close the dialog. */
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (currentDialogRef && !currentDialogRef.contains(target) && !pickerRef.current?.contains(target)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  /**
   * While a slider is being dragged, clear the dragging flag on pointerup anywhere so the picker fades back in.
   */
  useEffect(() => {
    if (!dragging) return
    const end = () => setDragging(false)
    document.addEventListener('pointerup', end)
    document.addEventListener('pointercancel', end)
    return () => {
      document.removeEventListener('pointerup', end)
      document.removeEventListener('pointercancel', end)
    }
  }, [dragging])

  /**
   * Disable swipe-to-go-back.
   * On iOS Safari, swiping from the left edge of the page functions similarly to hitting the back button.
   * This is disabled in the main app, probably by MultiGesture, and needs to be disabled while a dialog is open.
   */
  useEffect(() => {
    const overlayElement = nodeRef.current
    const dialogElement = dialogRef.current

    if (!overlayElement || !dialogElement) return

    /** This event handler prevents touch events from propagating to the page. */
    const preventTouchMove = (e: TouchEvent) => {
      const target = e.target as Node
      if (!dialogElement.contains(target) && !pickerRef.current?.contains(target)) {
        // Only prevent scrolling if NOT inside dialog content or debug picker
        e.preventDefault()
      }
    }

    overlayElement.addEventListener('touchmove', preventTouchMove, { passive: false })

    return () => {
      overlayElement.removeEventListener('touchmove', preventTouchMove)
    }
  }, [nodeRef])

  return (
    <div ref={nodeRef} className={dialogClasses.overlay}>
      {show('BackgroundGlow') && <BackgroundGlow />}

      {/* Container wrapper — allows unclipped highlights to bleed outside the glass */}
      <div className={css({ position: 'relative', maxWidth: '500px', width: '87.5%', ...debugStyle('Wrapper', '#f80') })}>
        {show('Highlight') && <Highlight />}
        {show('Rainbow') && <Rainbow />}

        {/* Glass sheet */}
        <div ref={dialogRef} className={dialogClasses.container}>
          {show('ContainerBackground') && <ContainerBackground {...bg} />}
          {show('GlassStroke') && <GlassStroke />}
          {/* Rounded clip wrapper for highlight/rainbow layers trapped inside the glass */}
          <div
            className={css({
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
            })}
            style={{ clipPath: 'inset(0 round 32px)' }}
          >
            {show('Highlight-clipped') && <Highlight clipped />}
            {show('Rainbow-clipped') && <Rainbow clipped />}
          </div>
          {/* Always render children so the dialog retains its natural height; hide visually when Content is toggled off. */}
          <div style={!show('Content') ? { visibility: 'hidden' } : undefined}>{children}</div>
          {show('Gradient') && <div className={dialogClasses.gradient} />}
        </div>
      </div>
      {DEBUG_PICKER && !pickerOpen && (
        <button
          ref={el => {
            pickerRef.current = el
          }}
          type='button'
          onClick={() => setPickerOpen(true)}
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 11,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
          }}
        >
          DEBUG
        </button>
      )}
      {DEBUG_PICKER && pickerOpen && (
        <div
          ref={el => {
            pickerRef.current = el
          }}
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '8px 10px',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minWidth: 200,
            maxHeight: 'calc(100dvh - 32px)',
            overflowY: 'auto',
            opacity: dragging ? 0 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ opacity: 0.7 }}>LAYERS</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type='button'
                onClick={() => setPickerOpen(false)}
                title='minimize'
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1px 6px',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  cursor: 'pointer',
                  borderRadius: 3,
                }}
              >
                −
              </button>
              <button
                type='button'
                onClick={() => setVisible(new Set(LAYERS))}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1px 6px',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  cursor: 'pointer',
                  borderRadius: 3,
                }}
              >
                all
              </button>
              <button
                type='button'
                onClick={() => setVisible(new Set())}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1px 6px',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  cursor: 'pointer',
                  borderRadius: 3,
                }}
              >
                none
              </button>
            </div>
          </div>
          {LAYERS.map(layer => (
            <label key={layer} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type='checkbox'
                checked={visible.has(layer)}
                onChange={() => toggleLayer(layer)}
                style={{ margin: 0, cursor: 'pointer' }}
              />
              {layer}
            </label>
          ))}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ opacity: 0.7 }}>CONTAINER BG</span>
              <button
                type='button'
                onClick={resetBg}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '1px 6px',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  cursor: 'pointer',
                  borderRadius: 3,
                }}
              >
                reset
              </button>
            </div>
            {(
              [
                { key: 'hueInner', label: 'hue in', min: 0, max: 360, step: 1, decimals: 0 },
                { key: 'hueOuter', label: 'hue out', min: 0, max: 360, step: 1, decimals: 0 },
                { key: 'saturation', label: 'sat', min: 0, max: 100, step: 1, decimals: 0 },
                { key: 'lightness', label: 'light', min: 0, max: 100, step: 1, decimals: 0 },
                { key: 'alpha', label: 'alpha', min: 0, max: 1, step: 0.01, decimals: 2 },
                { key: 'midAlpha', label: 'mid α', min: 0, max: 1, step: 0.01, decimals: 2 },
                { key: 'cx', label: 'cx', min: 0, max: 100, step: 1, decimals: 0 },
                { key: 'cy', label: 'cy', min: 0, max: 100, step: 1, decimals: 0 },
                { key: 'rx', label: 'rx', min: 0, max: 300, step: 1, decimals: 0 },
                { key: 'ry', label: 'ry', min: 0, max: 300, step: 1, decimals: 0 },
                { key: 'midStop', label: 'mid %', min: 1, max: 99, step: 1, decimals: 0 },
              ] as const
            ).map(({ key, label, min, max, step, decimals }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 42, opacity: 0.7 }}>{label}</span>
                <input
                  type='range'
                  min={min}
                  max={max}
                  step={step}
                  value={bg[key]}
                  onChange={e => setBgProp(key, Number(e.target.value))}
                  onPointerDown={() => setDragging(true)}
                  style={{ flex: 1 }}
                />
                <span style={{ width: 32, textAlign: 'right' }}>{bg[key].toFixed(decimals)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dialog
