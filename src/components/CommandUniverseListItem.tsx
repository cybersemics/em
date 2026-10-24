import type { Node } from '@react-types/shared'
import { FC, MouseEvent, useCallback, useEffect, useRef } from 'react'
import { mergeProps, useOption } from 'react-aria'
import type { ListState } from 'react-stately'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import Command from '../@types/Command'
import useCommandItemState from '../hooks/useCommandItemState'
import CommandKeyboardShortcut from './CommandKeyboardShortcut'
import HighlightedText from './HighlightedText'
import ArrowRightIcon from './icons/ArrowRightIcon'

type OriginRect = Pick<DOMRectReadOnly, 'x' | 'y' | 'width' | 'height'>
/**
 * Animates `container.scrollTop` toward `target` over `durationMs` using easeOutCubic.
 * The active RAF handle is stashed on the container instance so successive calls cancel
 * the in-flight animation mid-step and start a fresh one from the current scroll position
 * — rapid arrow-key navigation glides without compounding stale animations or fighting
 * the browser's native smooth scroll (which can't have its duration tuned and feels
 * sluggish under rapid keypresses).
 */
const SCROLL_ANIM_KEY = '__cuScrollAnim'
/** Smoothly scrolls the active row into view, cancelling any prior scroll. */
const animateScrollTop = (container: HTMLElement, target: number, durationMs: number) => {
  const c = container as unknown as Record<typeof SCROLL_ANIM_KEY, number | null>
  if (c[SCROLL_ANIM_KEY] != null) cancelAnimationFrame(c[SCROLL_ANIM_KEY])
  const start = container.scrollTop
  const distance = target - start
  if (Math.abs(distance) < 0.5) {
    container.scrollTop = target
    c[SCROLL_ANIM_KEY] = null
    return
  }
  const startTime = performance.now()
  /** Eases a scroll toward its destination. */
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
  /** Advances one scroll animation frame. */
  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / durationMs)
    container.scrollTop = start + distance * easeOutCubic(t)
    if (t < 1) {
      c[SCROLL_ANIM_KEY] = requestAnimationFrame(step)
    } else {
      c[SCROLL_ANIM_KEY] = null
    }
  }
  c[SCROLL_ANIM_KEY] = requestAnimationFrame(step)
}
interface CommandUniverseListItemProps {
  /** Collection node for this row — the source of truth for the listbox key. */
  item: Node<Command>
  /** Resolved Command (cheaper than walking the collection on every render). */
  command: Command
  /** Listbox state. Drives focused/selected styling via `state.selectionManager`. */
  state: ListState<Command>
  /** Search text that will be highlighted within the matched command title. */
  search?: string
  /** Registers the row's `<li>` ref with the parent so keyboard-Enter activations can compute the zoom origin rect. */
  registerRef?: (commandId: string, el: HTMLLIElement | null) => void
  /**
   * Called when the focused-row Activate pill is pressed. The parent runs the command
   * (close dialog, execute via `executeCommandWithMulticursor`, persist to recents). When
   * absent, the Activate pill is not rendered.
   */
  onActivate?: (command: Command) => void
  /**
   * Called when the focused-row arrow pill (→) is clicked. The parent pushes a detail entry
   * onto the navstack, anchored at the captured origin rect so the zoom animates from this
   * row. Row click and Enter both go to `onActivate` instead; this pill is the *only* path
   * from the index page into the detail level.
   */
  onZoom?: (command: Command, originRect: OriginRect) => void
}
/**
 * Renders a single command as a horizontal row in `CommandUniverseList`. Built on
 * react-aria's `useOption` so the row participates in the listbox's keyboard/focus model
 * automatically — virtual focus highlight, scroll-into-view, click→onAction wiring, ARIA
 * `role="option"` — without any per-row keydown plumbing.
 */
const CommandUniverseListItem: FC<CommandUniverseListItemProps> = ({
  item,
  command,
  state,
  search = '',
  registerRef,
  onActivate,
  onZoom,
}) => {
  const { label, description, disabled, Icon } = useCommandItemState(command)
  const ref = useRef<HTMLLIElement>(null)
  // Keep the parent's id→el map in sync so keyboard activations can read this row's rect.
  useEffect(() => {
    if (!registerRef) return
    registerRef(command.id, ref.current)
    return () => registerRef(command.id, null)
  }, [command.id, registerRef])
  // react-aria's `useListBox` calls the row's native `scrollIntoView({ block: 'nearest' })`
  // whenever `focusedKey` changes. The browser walks up and scrolls *every* scrollable
  // ancestor — for our nested dialog (pageEntry inside content) that means two containers
  // scroll at once, fighting the touch/wheel behavior and visibly breaking the layout.
  // Shadow the instance method with a contained scroll of just the nearest `pageEntry`.
  //
  // The override honours pageEntry's `scroll-padding-top`/`scroll-padding-bottom` so a
  // focused row never lands inside the top mask fade or bottom shadow gradient — the
  // selection always sits fully inside the visually clear region. Scrolls are animated
  // (`behavior: 'smooth'`) so arrow-key nav glides instead of snapping.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    Object.defineProperty(el, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: () => {
        const container = el.closest('[data-dialog-scroll="true"]') as HTMLElement | null
        if (!container) return
        const elRect = el.getBoundingClientRect()
        const cRect = container.getBoundingClientRect()
        // pageEntry's CSS `scroll-padding-*` defines the "safe" inner region where focused
        // rows are allowed to land. Reading via getComputedStyle keeps the rem-based values
        // in sync with the recipe instead of duplicating them as JS constants.
        const cs = getComputedStyle(container)
        const padTop = parseFloat(cs.scrollPaddingTop) || 0
        const padBottom = parseFloat(cs.scrollPaddingBottom) || 0
        // pageEntry.clientHeight isn't always the *visible* height — at md+ pageStack's
        // height can exceed glassSheet's max-height, so the bottom slice of pageEntry is
        // clipped behind the rounded glass border. Walking up the DOM and intersecting
        // every clipping ancestor's bounding rect gives us the actually-visible window
        // regardless of which ancestor caps the height. Without this, autoscroll thinks
        // rows landing in the hidden slice are "in view" and never scrolls them up.
        let visTopVp = cRect.top
        let visBottomVp = cRect.bottom
        let node: HTMLElement | null = container.parentElement
        while (node && node !== document.documentElement) {
          const ns = getComputedStyle(node)
          if (ns.overflow !== 'visible' || ns.overflowX !== 'visible' || ns.overflowY !== 'visible') {
            const r = node.getBoundingClientRect()
            if (r.top > visTopVp) visTopVp = r.top
            if (r.bottom < visBottomVp) visBottomVp = r.bottom
          }
          node = node.parentElement
        }
        // Convert the viewport-space visible window into scroll-content-space offsets
        // from the container's top (so they're invariant under scrolling).
        const visTopOffset = visTopVp - cRect.top
        const visBottomOffset = visBottomVp - cRect.top
        // When this row is the first in its section, its section heading (the preceding
        // presentation <li>) counts as part of it for the top bound, so moving up onto it
        // reveals the heading instead of stopping with the heading hidden just above.
        const heading =
          el.previousElementSibling?.getAttribute('role') === 'presentation' ? el.previousElementSibling : null
        const topRect = heading ? heading.getBoundingClientRect() : elRect
        const elTop = topRect.top - cRect.top + container.scrollTop
        const elBottom = elRect.bottom - cRect.top + container.scrollTop
        const safeTop = container.scrollTop + visTopOffset + padTop
        const safeBottom = container.scrollTop + visBottomOffset - padBottom
        let nextScrollTop = container.scrollTop
        if (elTop < safeTop) {
          nextScrollTop = elTop - visTopOffset - padTop
        } else if (elBottom > safeBottom) {
          // Land elBottom at the visible bottom (minus padding). Uses visBottomOffset —
          // the visible-window bottom in scroll-content-relative coords — rather than
          // `container.clientHeight`, so the scroll lands the row at the actually visible
          // bottom even when pageEntry overflows glassSheet at md+.
          nextScrollTop = elBottom - visBottomOffset + padBottom
        }
        if (nextScrollTop !== container.scrollTop) {
          // 180ms easeOutCubic. Native `scrollTo({ behavior: 'smooth' })` runs ~300ms
          // with no duration knob and feels laggy under rapid arrow-key nav. The custom
          // helper interrupts cleanly, so a held arrow key produces a continuous glide
          // instead of stuttering catch-up animations.
          animateScrollTop(container, nextScrollTop, 180)
        }
      },
    })
    return () => {
      delete (
        el as unknown as {
          scrollIntoView?: unknown
        }
      ).scrollIntoView
    }
  }, [])
  // Deliberately *not* passing `isDisabled: disabled` to useOption. react-aria's
  // `useSelectableItem` clears `focusedKey` whenever an item rendered with `isDisabled`
  // finds itself focused, which would prevent the user from keyboard-focusing a disabled
  // row. We still want focus to land here (so the user can read the row's hint and
  // understand why it's unavailable); the parent's `onAction` filters disabled keys so
  // clicks and Enter don't execute.
  const { optionProps } = useOption(
    {
      key: item.key,
      shouldUseVirtualFocus: true,
    },
    state,
    ref,
  )
  const isFocused = state.selectionManager.focusedKey === item.key
  // Hover updates the listbox's focused key — matches the legacy DesktopCommandUniverse
  // behavior where mousing over a row also moves the keyboard-selected highlight.
  // Disabled rows are still focusable on hover; action suppression happens at the parent.
  //
  // Bound to `mousemove` rather than `mouseenter` so the focus only follows *real* cursor
  // motion. `mouseenter` also fires when an element slides under a stationary cursor (e.g.
  // when autoscroll moves a new row into the cursor's position after arrow-key nav), which
  // would yank the keyboard-selected highlight onto whichever row happened to scroll under
  // the mouse.
  const onMouseMove = useCallback(() => {
    state.selectionManager.setFocusedKey(item.key)
  }, [item.key, state.selectionManager])
  return (
    <li
      {...mergeProps(optionProps, { onMouseMove, onClick: () => onActivate?.(command) })}
      ref={ref}
      aria-label={label}
      aria-selected={isFocused}
      // Lets the parent's user-scroll handler map an `elementFromPoint` hit back to a command
      // key (so the row under the cursor becomes the highlight when the list is scrolled).
      data-cu-command-id={command.id}
      aria-disabled={disabled || undefined}
      className={css({
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        outline: 'none',
        listStyle: 'none',
        gap: '0.85rem',
        paddingBlock: '0.7rem',
        paddingInline: '1rem',
      })}
    >
      {/* Icon column. Square box matching the grid item for cross-representation parity.
            `position: relative` + `zIndex: 1` keeps the icon above the focus highlight layers. */}
      <div
        className={css({
          position: 'relative',
          zIndex: 1,
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          opacity: disabled ? 0.25 : 1,
        })}
      >
        <Icon className={css({ flex: 'none' })} size={16} fill={token('colors.fg')} />
      </div>

      {/* Title + description column. Takes the available width so the shortcut chip hugs
            the right edge of the row. `minWidth: 0` lets the title ellipsize and lets the
            description wrap correctly inside its flex parent instead of blowing the row out.
            `position: relative` + `zIndex: 1` keeps the text above the focus highlight layers. */}
      <div
        className={css({
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.2rem',
          opacity: disabled ? 0.25 : 1,
        })}
      >
        <span
          className={css({
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            // Crossfade title color on focus changes — same 200ms feel as the rest of the
            // focused-row chrome (action pills, glow), so everything moves together. The weight
            // changes instantly: animating font-weight reflows and re-rasterises the text on
            // every frame.
            transition: 'color 200ms ease-out',
            color: isFocused ? 'white' : 'commandUniverseTitleMuted',
            fontSize: '0.85rem',
            fontWeight: isFocused ? 600 : 400,
            mixBlendMode: 'normal',
          })}
        >
          <HighlightedText value={label} match={search} disabled={disabled} />
        </span>
        {description && (
          <span
            className={css({
              lineHeight: 1.3,
              // Wrap onto multiple lines rather than ellipsizing — long-form descriptions
              // (e.g. multi-clause command explanations) read better as 2–3 lines than
              // truncated to one.
              overflowWrap: 'break-word',
              // Crossfade subtitle alpha on focus changes — pairs with the title transition.
              transition: 'color 200ms ease-out',
              color: isFocused ? 'white' : 'whiteOverlay40',
              fontSize: '0.75rem',
              fontWeight: 400,
              mixBlendMode: 'normal',
            })}
          >
            {description}
          </span>
        )}
      </div>

      {/* Right edge of the row. Stacks the action pills (→ + Activate) and the keyboard-
            shortcut chip in the same single-cell CSS grid so the column always sizes to the
            action pills' width — eliminating the layout shift (and the description rewrap)
            that previously occurred when the row gained/lost focus. Each child is hidden via
            `visibility: hidden` rather than `display: none` so it still contributes to the
            cell's intrinsic size. `position: relative` + `zIndex: 1` keeps the chrome above
            the focus highlight layers. The controls share their column without changing row width on focus. */}
      {(() => {
        return (
          <div
            className={css({
              position: 'relative',
              zIndex: 1,
              flex: 'none',
              display: 'grid',
              alignItems: 'center',
              justifyItems: 'end',
            })}
          >
            {/* Action pills layer. Always rendered so the grid cell reserves its width
                    regardless of focus state; `visibility: hidden` + `pointer-events: none`
                    make it inert when the row isn't focused, without collapsing its size.
                    The `& svg` descendant rule cancels `iconRecipe`'s `transition: all` for
                    the arrow icon: with visibility in `all`, a visible→hidden flip is held at
                    "visible" until the timer expires, so the row losing focus kept painting
                    its arrow while the newly-focused row's arrow was already up. */}
            <div
              aria-hidden={!isFocused}
              className={css({
                display: 'flex',
                alignItems: 'center',
                '& svg': { transitionProperty: 'none' },
                // Crossfade with the keyboard-shortcut chip below — both layers share the
                // grid cell, so opacity is enough to swap them. Matches the focus-glow
                // 200ms transition so the row's whole state change reads as one motion.
                transition: 'opacity 200ms ease-out',
                gridArea: '1 / 1',
                gap: '0.4rem',
                opacity: isFocused ? 1 : 0,
                // `pointer-events: none` while invisible so the unfocused row's action
                // buttons can't intercept clicks meant for the row underneath.
                pointerEvents: isFocused ? 'auto' : 'none',
              })}
            >
              {/* The arrow pill explicitly drills into the detail page — it captures the
                    row's bounding rect so the navstack zoom anchors here. `stopPropagation`
                    keeps the click from ALSO firing the row's option onClick (which would
                    trigger Activate). Disabled rows render but the click is a no-op. */}
              <button
                type='button'
                aria-label='Open details'
                tabIndex={-1}
                disabled={!onZoom}
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation()
                  if (!onZoom || !ref.current) return
                  const rect = ref.current.getBoundingClientRect()
                  if (!rect) return
                  onZoom(command, rect)
                }}
                className={css({
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  fontFamily: 'inherit',
                  // Always a perfect circle — width === height === diameter, radius = 50%.
                  // `actionPillBorderRadius` is intentionally NOT applied here; the arrow
                  // pill's circular shape is part of the design contract, the knob is just
                  // what diameter to use.
                  width: '1.25rem',
                  height: '1.25rem',
                  borderRadius: '50%',
                  background: 'whiteOverlay6',
                  border: 'none',
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                })}
              >
                <ArrowRightIcon size={16} fill='white' />
              </button>
              <span
                aria-hidden
                className={css({
                  userSelect: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: 'whiteOverlay40',
                  fontSize: '0.75em',
                })}
              >
                /
              </span>
              <button
                type='button'
                tabIndex={-1}
                disabled={disabled || !onActivate}
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  // Stop propagation so this click doesn't ALSO trigger the row's option
                  // onClick (which would execute via onAction — same destination, but
                  // stopping here keeps the Activate path explicit).
                  e.stopPropagation()
                  if (disabled || !onActivate) return
                  onActivate(command)
                }}
                className={css({
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'inherit',
                  // No explicit height — content + padding y drive it. Lets the Activate
                  // pill grow vertically when the user dials up padding y without fighting
                  // a fixed height.
                  paddingInline: '0.6rem',
                  paddingBlock: '0.15rem',
                  borderRadius: '999px',
                  background: 'whiteOverlay6',
                  border: 'none',
                  color: 'white',
                  fontSize: '0.75em',
                  fontWeight: 400,
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                })}
              >
                Activate
              </button>
            </div>
            {/* Keyboard-shortcut chip layer. Only rendered when this command has a binding
                    — but when present, it overlays the action-pills layer in the same grid
                    cell, so the column width stays driven by the (wider) action pills. */}
            {command.keyboard && (
              <div
                aria-hidden={isFocused}
                className={css({
                  // Crossfade out as the row gains focus — paired with the action-pills'
                  // fade-in above. Same duration so the swap reads as a single transition.
                  transition: 'opacity 200ms ease-out',
                  gridArea: '1 / 1',
                  // When focused: hidden (give the stage to the action pills).
                  // When not focused: dimmed if disabled, otherwise solid.
                  opacity: isFocused ? 0 : disabled ? 0.25 : 0.5,
                  mixBlendMode: 'normal',
                  // Same defensive pointer-events as the action layer — chip is decorative
                  // here, no interactive surface, but this prevents stray hit-testing while
                  // it's fading out under the focused-row's action buttons.
                  pointerEvents: isFocused ? 'none' : 'auto',
                })}
              >
                <CommandKeyboardShortcut keyboardOrString={command.keyboard} color='white' />
              </div>
            )}
          </div>
        )
      })()}
    </li>
  )
}
export default CommandUniverseListItem
