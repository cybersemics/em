import { useEffect, useRef, useState } from 'react'
import { css } from '../../styled-system/css'
import * as selection from '../device/selection'
import selectionMenuStore from '../stores/selectionMenuStore'

/** How far the menu sits from the selection, in px. */
const GAP = 10

/** Below this distance from the top of the viewport, in px, the menu would cover the toolbar, so it is placed under the selection instead of over it. */
const MIN_TOP = 120

/** The position of the menu in document coordinates, so that the page scroll moves it with the selection without an update. */
interface MenuPosition {
  left: number
  top: number
  placement: 'above' | 'below'
}

/** Measures the selection and returns where the menu goes, or null when there is no selection in an editable. */
const measure = (): { position: MenuPosition; key: string } | null => {
  const rects = selection.editableClientRects()
  const first = rects[0]
  const last = rects[rects.length - 1]
  if (!first || !last) return null

  // The key identifies the selection's geometry in document coordinates, so a page scroll does not count as a change.
  const key = rects
    .map(rect => [rect.left + window.scrollX, rect.top + window.scrollY, rect.width, rect.height].join(','))
    .join(';')
  const placement = first.top < MIN_TOP ? 'below' : 'above'
  const anchor = placement === 'above' ? first : last

  return {
    key,
    position: {
      left: anchor.left + anchor.width / 2 + window.scrollX,
      top: (placement === 'above' ? anchor.top - GAP : anchor.bottom + GAP) + window.scrollY,
      placement,
    },
  }
}

/** Returns the focused thought or note editable, or null. */
const focusedEditable = (): HTMLElement | null => {
  const el = document.activeElement
  return el instanceof HTMLElement && el.isContentEditable ? el : null
}

/** Reads the clipboard and pastes it into the focused editable through the same paste event a native paste fires, so that em's paste handling (useOnPaste) applies. Falls back to inserting the plain text if the browser does not carry clipboard data on a constructed paste event. */
const paste = async (): Promise<void> => {
  const editable = focusedEditable()
  if (!editable) return

  const items = await navigator.clipboard.read()
  const entries = await Promise.all(
    items.flatMap(item =>
      ['text/plain', 'text/html']
        .filter(type => item.types.includes(type))
        .map(async type => [type, await (await item.getType(type)).text()] as const),
    ),
  )
  const data = new DataTransfer()
  entries.forEach(([type, value]) => data.setData(type, value))

  const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
  if (event.clipboardData) {
    editable.dispatchEvent(event)
  } else {
    const text = entries.find(([type]) => type === 'text/plain')?.[1]
    if (text) document.execCommand('insertText', false, text)
  }
}

/** The menu's actions. Cut and Copy run the browser's own commands, which fire the cut and copy events that the editable already handles (useOnCut, useOnCopy). */
const actions: { label: string; run: () => void }[] = [
  { label: 'Cut', run: () => document.execCommand('cut') },
  { label: 'Copy', run: () => document.execCommand('copy') },
  {
    label: 'Paste',
    run: () => {
      paste().catch(err => console.error('SelectionMenu: paste failed', err))
    },
  },
]

/**
 * The app's own text selection menu (Cut, Copy, Paste), shown over the selection in Mobile Safari when an edit of em's own
 * has dismissed Safari's native edit menu and a web page has no way to present it again (#5641). It is shown by
 * restoreEditMenu and hides as soon as the selection changes or the user touches anything else, after which the
 * native menu returns on the user's next tap on the selection. See docs/cursor-and-caret.md.
 */
const SelectionMenu = () => {
  const show = selectionMenuStore.useState()
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) {
      setPosition(null)
      return
    }

    const initial = measure()
    if (!initial) {
      selectionMenuStore.update(false)
      return
    }
    setPosition(initial.position)

    /** Hides the menu when the selection is gone or no longer the one the menu was shown for. */
    const onSelectionChange = () => {
      if (measure()?.key !== initial.key) selectionMenuStore.update(false)
    }

    /** Hides the menu on a touch anywhere else, which is also what brings the native menu back. */
    const onTouchStart = (e: TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) selectionMenuStore.update(false)
    }

    /** Hides the menu when the editable loses focus, e.g. when the keyboard is closed. */
    const onFocusOut = () => selectionMenuStore.update(false)

    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('touchstart', onTouchStart, true)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('touchstart', onTouchStart, true)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [show])

  if (!show || !position) return null

  return (
    <div
      ref={ref}
      role='menu'
      aria-label='selection menu'
      className={css({
        position: 'absolute',
        zIndex: 'popup',
        display: 'flex',
        backgroundColor: 'pickerBg',
        color: 'fg',
        borderRadius: '9999px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      })}
      style={{
        left: position.left,
        top: position.top,
        transform: position.placement === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
    >
      {actions.map(({ label, run }, i) => (
        <div
          key={label}
          role='menuitem'
          aria-label={label}
          className={css({
            padding: '0.6em 1em',
            borderLeft: i > 0 ? '1px solid {colors.gray33}' : undefined,
          })}
          // Run the action on touchend, and prevent its default so that the tap neither moves focus out of the
          // editable nor synthesizes mouse events that would collapse the selection. touchend is a user activation,
          // which execCommand('copy') and the Clipboard API require.
          onTouchEnd={e => {
            e.preventDefault()
            e.stopPropagation()
            run()
            selectionMenuStore.update(false)
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

export default SelectionMenu
