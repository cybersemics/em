import { AnimationPlaybackControls, animate, motion, useMotionValue, useTransform } from 'motion/react'
import React, { FC, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { isTouch } from '../browser'
import formattingBarPopoverInfoStore from '../stores/formattingBarPopoverInfoStore'
import viewportStore from '../stores/viewportStore'
import durations from '../util/durations'
import FormattingBarContext from './FormattingBarContext'
import ProgressiveBlur from './ProgressiveBlur'

interface FormattingBarPopoverProps {
  /** The persistent Formatting Bar button that opened this picker. */
  anchorRef: React.RefObject<HTMLElement | null>
  ariaLabel?: string
  children: React.ReactNode
  /** One line explaining the picker, shown under the title when the info button is tapped. */
  description?: string
  show?: boolean
  title?: string
}

/** Minimum distance between the popover and the edge of the screen. */
const SCREEN_MARGIN = 30

/** The scale the options and header grow from as the popover opens, from their bottom centre. */
const ENTER_SCALE = 0.97

/** How far below their resting place, in pixels, the options and header rise from as the popover opens. */
const ENTER_RISE = 4

/** A Formatting Bar popover that is open or still closing, through which a popover opening in its place fades out its light. */
interface LitPopover {
  fadeOutLight: () => void
}

/** The popovers that are open or still closing. */
const litPopovers = new Set<LitPopover>()

/** Stops a tap from moving the focus out of the editable, which would close the virtual keyboard, and from reaching the toolbar button that renders the popover, which would close it (#4264). */
const containTap = (e: React.MouseEvent | React.TouchEvent) => {
  e.stopPropagation()
  e.preventDefault()
}

/** The header's minimum height, which is the info button's, so the title is centred on the button. */
const HEADER_MIN_HEIGHT = 30

/** How far a touch may move, in pixels, and still count as a tap rather than the start of a gesture. */
const TAP_SLOP = 10

/** A circled "i" rendered at its actual pixel size. */
const InfoIcon: FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox='0 0 14 14' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <circle cx='7' cy='3.5' r='1' fill='currentColor' />
    <path d='M7 6.25V10.75' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
  </svg>
)

/**
 * The presentation shared by the Formatting Bar's dedicated pickers. It is
 * positioned above the bar and centred on the button that renders it, kept clear of the screen edges. The options and
 * light are portalled into the glow layer; a separate backdrop below both glows blurs and fades the underlying thoughts.
 * It has no box: a title with an info button that toggles a description, the picker's options, and soft light behind them.
 */
const FormattingBarPopover: FC<FormattingBarPopoverProps> = ({
  anchorRef,
  ariaLabel,
  children,
  description,
  show,
  title,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const { container, backdropContainer, iconSize } = useContext(FormattingBarContext)
  const headerMinHeight = Math.max(HEADER_MIN_HEIGHT, iconSize + 10)
  const viewportWidth = viewportStore.useSelector(state => state.innerWidth)
  const dropdownHost = useSelector(state => state.dropdownHost)
  const visible = !!show && dropdownHost === 'formattingBar'
  const dispatch = useDispatch()

  // A tap on the thoughts while the picker is open closes the picker instead of doing what it normally would, which is
  // to end editing and close the keyboard. Cancelling the tap's default action stops the focus change and click behind
  // that. The thoughts are outside the Formatting Bar, so this listens on the window rather than layering an element
  // over them, which would stop gestures from starting there. A touch that moved is a gesture and is left alone.
  useEffect(() => {
    if (!visible || !isTouch) return
    let start: { x: number; y: number } | null = null
    /** Notes where a single touch on the thoughts started. */
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      const onThoughts = e.target instanceof Element && !!e.target.closest('#content-wrapper')
      start = e.touches.length === 1 && touch && onThoughts ? { x: touch.clientX, y: touch.clientY } : null
    }
    /** Closes the picker if the touch was a tap. Pickers are mutually exclusive, so closing one closes any of them. */
    const onTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      const tapped = !!start && !!touch && Math.hypot(touch.clientX - start.x, touch.clientY - start.y) <= TAP_SLOP
      start = null
      if (!tapped) return
      e.preventDefault()
      dispatch(toggleDropdown({ dropDownType: 'colorPicker', value: false }))
    }
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    window.addEventListener('touchend', onTouchEnd, { capture: true, passive: false })
    return () => {
      window.removeEventListener('touchstart', onTouchStart, { capture: true })
      window.removeEventListener('touchend', onTouchEnd, { capture: true })
    }
  }, [visible, dispatch])

  // Shared by every picker and kept across reloads, so the descriptions stay shown until the info button is tapped again.
  const infoOpen = formattingBarPopoverInfoStore.useState()

  // Stays mounted after the picker is closed until its closing animation ends. Set during render rather than in an
  // effect, so the portals are never unmounted for the one render before the effect would run.
  const [closing, setClosing] = useState(false)
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)
    setClosing(!visible)
  }
  const rendered = visible || closing

  // Opening fades in the backdrop, the light and the options together, while the options and header also grow and rise
  // into place. Closing plays the same animation in reverse. Each starts from wherever the other left off, so reopening
  // a closing picker turns it around rather than restarting it.
  const progress = useMotionValue(0)
  const contentScale = useTransform(progress, [0, 1], [ENTER_SCALE, 1])
  const contentY = useTransform(progress, [0, 1], [ENTER_RISE, 0])

  // The light fades separately. When one picker replaces another, the old light fades out while the new one fades in on
  // the same curve, so their combined brightness holds steady rather than dipping between them.
  const lightOpacity = useMotionValue(0)
  const lightAnimation = useRef<AnimationPlaybackControls | null>(null)
  // Set when a popover opening in this one's place has taken over fading out its light.
  const lightHandedOff = useRef(false)
  const litPopover = useRef<LitPopover | null>(null)
  if (!litPopover.current) {
    litPopover.current = {
      fadeOutLight: () => {
        lightHandedOff.current = true
        lightAnimation.current?.stop()
        lightAnimation.current = animate(lightOpacity, 0, { duration: durations.get('fast') / 1000, ease: 'easeInOut' })
      },
    }
  }
  useEffect(
    () => () => {
      litPopovers.delete(litPopover.current!)
      lightAnimation.current?.stop()
    },
    [],
  )

  useLayoutEffect(() => {
    if (!visible && !closing) return
    const self = litPopover.current!
    const duration = durations.get('fast') / 1000

    if (visible) {
      // Another popover is still in the set whether its own layout effect for this change has run yet or not, since it
      // only leaves once its closing animation ends.
      const replaced = [...litPopovers].filter(popover => popover !== self)
      litPopovers.add(self)
      lightHandedOff.current = false
      replaced.forEach(popover => popover.fadeOutLight())
      lightAnimation.current?.stop()
      // Matches the replaced light's fade out, so that the two add up to full brightness throughout the switch.
      lightAnimation.current = animate(lightOpacity, 1, {
        duration,
        ease: replaced.length > 0 ? 'easeInOut' : 'easeOut',
      })
    } else if (!lightHandedOff.current) {
      lightAnimation.current?.stop()
      lightAnimation.current = animate(lightOpacity, 0, { duration, ease: 'easeIn' })
    }

    const controls = visible
      ? animate(progress, 1, { duration, ease: 'easeOut' })
      : animate(progress, 0, {
          duration,
          ease: 'easeIn',
          onComplete: () => {
            litPopovers.delete(self)
            setClosing(false)
          },
        })
    return () => controls.stop()
    // closing only changes alongside visible, or when the closing animation ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, progress])

  // Toggling the info button grows the header upwards by the description's height while the description fades in at its
  // final place, beneath the title. The popover's bottom is fixed, so the title rises and the options stay put.
  const infoProgress = useMotionValue(infoOpen ? 1 : 0)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const descriptionHeight = useMotionValue(0)
  const revealedDescriptionHeight = useTransform(() => infoProgress.get() * descriptionHeight.get())
  // How much the revealed description has actually grown the header. The header is at least as tall as the info button,
  // so the description's first few pixels fill the space around the centred title before the header grows at all.
  const titleRef = useRef<HTMLDivElement>(null)
  const titleHeight = useMotionValue(0)
  const headerGrowth = useTransform(
    () =>
      Math.max(headerMinHeight, titleHeight.get() + revealedDescriptionHeight.get()) -
      Math.max(headerMinHeight, titleHeight.get()),
  )
  useLayoutEffect(() => {
    if (!visible) return
    // A picker that opens after the info button was toggled in another one shows the result without animating.
    infoProgress.set(infoOpen ? 1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])
  useLayoutEffect(() => {
    const controls = animate(infoProgress, infoOpen ? 1 : 0, {
      duration: durations.get('fast') / 1000,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [infoOpen, infoProgress])
  useLayoutEffect(() => {
    if (!visible) return
    const description = descriptionRef.current
    const title = titleRef.current
    // Records the description's natural height and the title's, which change with the popover's width and the icon size.
    // The observer reports fractional, untransformed sizes, and reports each element once when it starts observing.
    const observer = new ResizeObserver(entries =>
      entries.forEach(entry => {
        const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
        if (entry.target === description) descriptionHeight.set(height)
        if (entry.target === title) titleHeight.set(height)
      }),
    )
    if (description) observer.observe(description)
    if (title) observer.observe(title)
    return () => observer.disconnect()
  }, [visible, descriptionHeight, titleHeight, container])

  // The horizontal center of the button that renders the popover, kept far enough from the edges that the popover fits.
  const [center, setCenter] = useState(0)
  // A motion value rather than state, since it changes on every frame of the description's animation.
  const height = useMotionValue(0)
  useLayoutEffect(() => {
    if (!visible || !ref.current || !anchorRef.current) return
    const element = ref.current
    const anchorElement = anchorRef.current
    /** Fits the picker on screen and keeps its anchor and separately layered backdrop aligned through resizing and description changes. */
    const measure = () => {
      // The picker lays out at its actual size and wraps its options within the screen margins.
      const rect = element.getBoundingClientRect()
      const halfWidth = rect.width / 2
      const anchorRect = anchorElement.getBoundingClientRect()
      const anchor = anchorRect.left + anchorRect.width / 2
      const center = Math.min(Math.max(anchor, halfWidth + SCREEN_MARGIN), viewportWidth - halfWidth - SCREEN_MARGIN)
      setCenter(center)
      height.set(rect.height)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [visible, iconSize, viewportWidth, height, anchorRef, container])

  /** Toggles the description. */
  const toggleInfo = (e: React.MouseEvent | React.TouchEvent) => {
    containTap(e)
    formattingBarPopoverInfoStore.update(open => !open)
  }

  return (
    <>
      {rendered &&
        backdropContainer &&
        createPortal(
          // No parent opacity: Safari disables backdrop filters when an ancestor has fractional opacity.
          <motion.div
            aria-hidden='true'
            className={css({
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '16px',
              pointerEvents: 'none',
            })}
            style={{ height }}
          >
            {/* Catches taps across the screen's full width beside the options and in the gap above the bar, where a near
              miss would otherwise land on the thoughts and close the picker and the keyboard. Only while open, so a tap
              during the closing animation reaches the page. */}
            <div
              data-formatting-bar-popover-dead-zone
              onClick={isTouch ? undefined : containTap}
              onTouchEnd={isTouch ? containTap : undefined}
              className={css({
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: '-16px',
              })}
              style={{ pointerEvents: visible ? 'auto' : 'none' }}
            />
            <div
              data-formatting-bar-popover-blur
              className={css({
                position: 'absolute',
                left: 0,
                right: 0,
                top: '-24px',
                bottom: 'calc(-1 * (16px + var(--formatting-bar-popover-underhang, 80px)))',
                pointerEvents: 'none',
              })}
            >
              {/* Covers the same box as the fade, so the thoughts under the overlay blur evenly from none at its top to the full radius at its bottom. */}
              <ProgressiveBlur direction='to top' maxBlur='10px' curve={1} opacity={progress} promoteLayers />
            </div>
            {/* The fade has an opacity of its own, so the entrance fades a wrapper of the same box instead. */}
            <motion.div
              className={css({ position: 'absolute', inset: 0, pointerEvents: 'none' })}
              style={{ opacity: progress }}
            >
              <div
                data-formatting-bar-popover-falloff
                className={css({
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '-24px',
                  bottom: 'calc(-1 * (16px + var(--formatting-bar-popover-underhang, 80px)))',
                  background: 'linear-gradient(to bottom, {colors.transparent}, {colors.black} 48px)',
                  opacity: 0.85,
                  pointerEvents: 'none',
                })}
              />
            </motion.div>
          </motion.div>,
          backdropContainer,
        )}
      {rendered &&
        container &&
        createPortal(
          <motion.div
            ref={ref}
            aria-label={ariaLabel}
            data-formatting-bar-popover
            onClick={isTouch ? undefined : containTap}
            onTouchEnd={isTouch ? containTap : undefined}
            className={css({
              position: 'absolute',
              // Keeps the light overlay behind the options rather than behind the page.
              isolation: 'isolate',
              transformOrigin: 'center bottom',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              width: 'max-content',
              bottom: '16px',
            })}
            style={{
              left: center,
              transform: 'translateX(-50%)',
              maxWidth: viewportWidth - SCREEN_MARGIN * 2,
              // A closing picker lets taps through to whatever is beneath it, such as the picker opening in its place.
              pointerEvents: visible ? 'auto' : 'none',
            }}
          >
            {/* Overlay: a soft ellipse of light behind the popover. The element is the whole image, centred relative
                to the popover. Its width follows the popover's, so a compact picker gets a narrower pool of light, but its
                height is set from the bar's actual icon dimensions, so a wide picker does not get a taller one. The image is a
                blur with no hard detail, so stretching it away from its own 1547×1263 proportions does not show. It is
                placed against the popover without however much the revealed description has grown it, so the light
                stays still while the description opens and closes.

                The light and the options each keep a compositing layer of their own for as long as the popover is
                mounted. Otherwise the browser composites the light only while its opacity animates, lifts the options
                into a layer too because they overlap it, and flattens both when the light reaches full opacity, so the
                options are drawn differently for a frame as the light settles. */}
            <motion.div
              className={css({
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                willChange: 'opacity',
              })}
              style={{ top: headerGrowth, opacity: lightOpacity }}
            >
              <div
                data-formatting-bar-popover-overlay
                className={css({
                  position: 'absolute',
                  zIndex: -1,
                  pointerEvents: 'none',
                  backgroundImage: 'url(/img/formatting-bar/popover-overlay.avif)',
                  backgroundSize: '100% 100%',
                  left: '51%',
                  top: '30%',
                  width: '190%',
                  transform: 'translate(-50%, -50%)',
                })}
                style={{ height: iconSize * 15.95 }}
              />
            </motion.div>

            {/* Options and header, which fade, grow and rise into place as the popover opens. The light stays outside
                so that it only fades, on its own timing. */}
            <motion.div
              className={css({ willChange: 'transform, opacity' })}
              style={{ scale: contentScale, y: contentY, opacity: progress, transformOrigin: 'center bottom' }}
            >
              {/* Header. Zero width with a full minimum width, so that the options alone set the popover's width and a
                long description wraps within it. The info button sits at its bottom, so it stays still while the
                description opens above it. */}
              {title && (
                <div
                  className={css({
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px',
                    width: 0,
                    minWidth: '100%',
                    marginBottom: '8px',
                  })}
                >
                  {/* At least as tall as the info button, with the title centred on it while the description is hidden. */}
                  <div
                    className={css({
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      whiteSpace: 'normal',
                    })}
                    style={{ minHeight: HEADER_MIN_HEIGHT }}
                  >
                    <div
                      ref={titleRef}
                      className={css({
                        color: 'formattingBarPopoverTitle',
                        fontWeight: 600,
                        lineHeight: 1.3,
                      })}
                      style={{ fontSize: iconSize * 0.75 }}
                    >
                      {title}
                    </div>
                    {/* Description. The outer box takes up only the revealed part of its height, and the text, aligned to
                        its bottom, overflows upwards behind the rising title while it fades in. */}
                    {description && (
                      <motion.div
                        aria-hidden={!infoOpen}
                        className={css({ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' })}
                        style={{ height: revealedDescriptionHeight, opacity: infoProgress }}
                      >
                        <div
                          ref={descriptionRef}
                          className={css({
                            flexShrink: 0,
                            color: 'formattingBarPopoverDescription',
                            lineHeight: 1.4,
                            paddingTop: '4px',
                            // Avoids a last line of one or two words.
                            textWrap: 'pretty',
                          })}
                          style={{ fontSize: iconSize * 0.65 }}
                        >
                          {description}
                        </div>
                      </motion.div>
                    )}
                  </div>
                  {description && (
                    <div
                      role='button'
                      aria-label='Info'
                      aria-pressed={infoOpen}
                      onClick={isTouch ? undefined : toggleInfo}
                      onTouchEnd={isTouch ? toggleInfo : undefined}
                      className={css({
                        flexShrink: 0,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'formattingBarPopoverTitle',
                        transition: 'background-color {durations.fast} ease-out, box-shadow {durations.fast} ease-out',
                      })}
                      style={{
                        width: iconSize + 10,
                        height: iconSize + 10,
                        backgroundColor: token(
                          infoOpen ? 'colors.formattingBarPopoverInfoBgLit' : 'colors.formattingBarPopoverInfoBg',
                        ),
                        boxShadow: infoOpen ? `0 0 16px 2px ${token('colors.formattingBarPopoverInfoGlow')}` : 'none',
                      }}
                    >
                      <InfoIcon size={Math.max(8, iconSize - 6)} />
                    </div>
                  )}
                </div>
              )}
              {children}
            </motion.div>
          </motion.div>,
          container,
        )}
    </>
  )
}

export default FormattingBarPopover
