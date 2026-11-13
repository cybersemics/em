import _ from 'lodash'
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { isMac } from '../browser'
import { commandByKeyDown, hashKeyDown, isArrowKey } from '../commands'
import findCommand from '../commands/find'
import getVisibleBounds from '../device/getVisibleBounds'
import scrollTo from '../device/scrollTo'
import * as selection from '../device/selection'
import commandEmitter from '../stores/commandEmitter'
import findBarStore from '../stores/findBarStore'
import head from '../util/head'
import ChevronRightIcon from './icons/ChevronRightIcon'
import XIcon from './icons/XIcon'

/** The names of the CSS highlights that paint the matches and the current match. Styled with ::highlight() in panda.config.ts. */
const MATCH_HIGHLIGHT = 'find-match'
const CURRENT_MATCH_HIGHLIGHT = 'find-match-current'

/** A highlight that has no ::highlight() style, and so paints nothing, used only to make WebKit repaint text (see repaint). */
const REPAINT_HIGHLIGHT = 'find-repaint'

/** How often, at most, the rendered thoughts are searched again while they change, in ms. Scrolling renders and removes thoughts on every frame, and a match that is painted a few frames after its thought appears is not noticeable. */
const RESCAN_THROTTLE = 100

/** The hashes (see hashKeyDown) of the shortcuts that a text field performs itself: Select All, Cut, Copy, Paste, Undo, and Redo. */
const TEXT_FIELD_SHORTCUTS = new Set([
  'META_A',
  'META_X',
  'META_C',
  'META_V',
  'META_Z',
  'META_SHIFT_Z',
  ...(isMac ? [] : ['META_Y']),
])

/** A case-insensitive occurrence of the query in the text of a rendered thought. */
interface Match {
  /** The editable of the thought. */
  editable: HTMLElement
  /** The offset of the end of the match in the thought's plain text, where the caret is placed when the match is committed. */
  end: number
  /** The text of the match, which the highlights paint. */
  range: Range
}

/** The part of the viewport, in viewport coordinates, that a match can be seen in. */
interface Bounds {
  top: number
  bottom: number
}

/** Finds every case-insensitive occurrence of the query in the rendered thoughts, in document order. Only rendered thoughts can match: em does not render collapsed thoughts, hidden thoughts, or thoughts virtualized below the viewport. A thought that autofocus hides is rendered, faded out, but it is marked invisible (see Editable) and does not match, since the cursor cannot be set on it. Each thought's text is matched across the formatting tags in it. The text that ThoughtAnnotation renders again under visibility: hidden is not in an editable, so it is not matched twice. Reads no layout, so that it can run whenever the thoughts change. */
const findMatches = (query: string): Match[] => {
  const content = document.getElementById('content')
  if (!query || !content) return []
  const pattern = new RegExp(_.escapeRegExp(query), 'gi')
  return [...content.querySelectorAll<HTMLElement>('[data-editable]:not([data-invisible])')].flatMap(editable =>
    [...(editable.textContent ?? '').matchAll(pattern)].flatMap(found => {
      const end = found.index + found[0].length
      const start = selection.offsetFromClosestParent(editable, found.index)
      const finish = selection.offsetFromClosestParent(editable, end)
      if (!start?.node || !finish?.node) return []
      const range = document.createRange()
      range.setStart(start.node, start.offset)
      range.setEnd(finish.node, finish.offset)
      return [{ editable, end, range }]
    }),
  )
}

/** Whether two lists of matches cover the same text, so that painting the second in place of the first would change nothing. */
const isSameText = (matches: Match[], others: Match[]) =>
  matches.length === others.length &&
  matches.every(({ range }, i) => {
    const other = others[i].range
    return (
      range.startContainer === other.startContainer &&
      range.startOffset === other.startOffset &&
      range.endContainer === other.endContainer &&
      range.endOffset === other.endOffset
    )
  })

/** Repaints the thoughts that the given matches are in. WebKit (macOS 26.3) does not repaint text when the highlight that paints it is removed from the registry or replaced, so a match stays painted on screen after its highlight is gone, until something else repaints the thought. Registering a highlight does repaint its ranges, so a highlight of each whole thought is registered and removed again. */
const repaint = (matches: Match[]) => {
  const ranges = _.uniq(matches.map(match => match.editable))
    .filter(editable => editable.isConnected)
    .map(editable => {
      const range = document.createRange()
      range.selectNodeContents(editable)
      return range
    })
  if (ranges.length === 0) return
  CSS.highlights.set(REPAINT_HIGHLIGHT, new Highlight(...ranges))
  CSS.highlights.delete(REPAINT_HIGHLIGHT)
}

/** Paints the matches, and the current match over them, in place of the previous matches. The CSS Custom Highlight API paints ranges without changing the DOM, which matters because the editables are contenteditable: wrapping a match in an element would corrupt editing and undo. A browser without the API paints nothing, and the count and the commit still work. */
const paint = (previous: Match[], matches: Match[], current: number) => {
  if (!('highlights' in CSS)) return
  CSS.highlights.set(MATCH_HIGHLIGHT, new Highlight(...matches.map(match => match.range)))
  const currentMatch = matches[current]
  if (currentMatch) {
    const highlight = new Highlight(currentMatch.range)
    highlight.priority = 1
    CSS.highlights.set(CURRENT_MATCH_HIGHLIGHT, highlight)
  } else {
    CSS.highlights.delete(CURRENT_MATCH_HIGHLIGHT)
  }
  repaint(previous)
}

/** Removes the highlights of the matches. */
const clearHighlights = (matches: Match[]) => {
  if (!('highlights' in CSS)) return
  CSS.highlights.delete(MATCH_HIGHLIGHT)
  CSS.highlights.delete(CURRENT_MATCH_HIGHLIGHT)
  repaint(matches)
}

/** The part of the viewport that a match can be seen in: the part that content can be seen in (see getVisibleBounds), below the find bar, which covers the top of it. */
const matchBounds = (bar: HTMLElement | null): Bounds => {
  const { top, bottom } = getVisibleBounds()
  return { top: Math.max(top, bar?.getBoundingClientRect().bottom ?? top), bottom }
}

/** Scrolls a match to the middle of the part of the viewport that it can be seen in, unless it can already be seen there. Reads the scroll position from the window rather than from scrollTopStore, which a scroll event updates after the scroll, since the next step can come before that event. */
const scrollIntoView = (match: Match, bounds: Bounds) => {
  const { top, bottom } = match.range.getBoundingClientRect()
  if (top >= bounds.top && bottom <= bounds.bottom) return
  scrollTo(window.scrollY + top - (bounds.top + bounds.bottom - (bottom - top)) / 2)
}

/** Whether a keystroke edits the query or moves the caret in it, as it would in any text field, rather than executing the command that it is bound to: a character, typed with or without Shift, with Option on macOS, or with AltGr elsewhere; Backspace and Delete; an arrow key, with or without modifiers; a text field's own shortcuts (see TEXT_FIELD_SHORTCUTS); and on macOS, Control with a letter, which a text field binds to moving the caret and deleting, e.g. Control + E to the end of the line. */
const isQueryKey = (e: KeyboardEvent): boolean => {
  const typed = e.key.length === 1 || e.key === 'Dead'
  return (
    isArrowKey(e.key) ||
    (!e.metaKey && !e.ctrlKey && !e.altKey && (typed || e.key === 'Backspace' || e.key === 'Delete')) ||
    (isMac && e.altKey && !e.metaKey && !e.ctrlKey && typed) ||
    (!isMac && e.getModifierState('AltGraph') && typed) ||
    (isMac && e.ctrlKey && !e.metaKey && !e.altKey && /^Key[A-Z]$/.test(e.code)) ||
    TEXT_FIELD_SHORTCUTS.has(hashKeyDown(e))
  )
}

/** The style of the find bar's buttons. */
const findBarButton = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.2em',
  border: 'none',
  borderRadius: '4px',
  backgroundColor: 'transparent',
  color: 'fg',
  cursor: 'pointer',
  fontSize: 'inherit',
  _hover: { backgroundColor: 'fgOverlay10' },
})

/** A button of the find bar. A click on it leaves the focus in the query (see the find bar's onMouseDown), so that typing continues the query. */
const FindBarButton = ({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  label: string
  onClick: () => void
}) => (
  <button type='button' aria-label={label} disabled={disabled} onClick={onClick} className={findBarButton}>
    {children}
  </button>
)

/** The find bar, while it is open. The query keeps the keys that operate the find bar or edit the query, and leaves every other keystroke to the global keyDown handler (see onKeyDown). */
const FindBarOpen = () => {
  const dispatch = useDispatch()
  const barRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const queryRef = useRef(query)
  const matchesRef = useRef<Match[]>([])
  const currentRef = useRef(0)
  const [count, setCount] = useState({ current: 0, total: 0 })
  const [top, setTop] = useState(0)
  /** The selection that the find bar took the focus from, which is restored when it closes without a match to move the cursor to. */
  const savedSelection = useRef<selection.SavedSelection | null>(null)

  /** Makes a match the current one: paints it, scrolls it into view when asked to, and shows it in the count. Paints nothing when the matches cover the same text as before and the current match is the same, as after most changes to the rendered thoughts. */
  const update = useCallback((matches: Match[], current: number, { scroll }: { scroll: boolean }) => {
    const previous = matchesRef.current
    const unchanged = !scroll && current === currentRef.current && isSameText(previous, matches)
    matchesRef.current = matches
    currentRef.current = current
    if (unchanged) return
    paint(previous, matches, current)
    if (scroll && matches[current]) scrollIntoView(matches[current], matchBounds(barRef.current))
    setCount(count =>
      count.current === current && count.total === matches.length ? count : { current, total: matches.length },
    )
  }, [])

  /** Steps to the next or previous match, wrapping around at the ends. */
  const step = (direction: 1 | -1) => {
    const matches = matchesRef.current
    if (matches.length === 0) return
    update(matches, (currentRef.current + direction + matches.length) % matches.length, { scroll: true })
  }

  /** Closes the find bar and moves the cursor to the current match, with the caret at the end of the match. Focusing the editable sets the cursor on its thought (see onFocus in Editable), which knows its Path. Without a current match, the selection that the find bar took the focus from is restored, and the cursor is left where it was. Synchronous, so that a command that commits the match executes on the new cursor. */
  const commit = useCallback(() => {
    const match = matchesRef.current[currentRef.current]
    findBarStore.update({ open: false })
    if (!match?.editable.isConnected) {
      selection.restore(savedSelection.current)
      return
    }
    match.editable.focus()
    selection.set(match.editable, { offset: match.end })
    // The focus set the cursor with the caret at the start of the thought, since the find bar took the focus from a
    // thought that was being edited (see setCursor), and edit mode would move the caret back there.
    dispatch((dispatch, getState) => {
      const { cursor } = getState()
      if (cursor && match.editable.getAttribute('aria-label') === `editable-${head(cursor)}`) {
        dispatch(setCursor({ path: cursor, offset: match.end, preserveMulticursor: true }))
      }
    })
  }, [dispatch])

  /** Handles the keys that operate the find bar and the keys that edit the query, and stops them from reaching the global keyDown handler, which would execute the commands that many of them are bound to: Escape to Cursor Back, the arrows to the cursor movement commands, Space to Indent, Backspace to Delete Empty Thought, Command + C to Copy Cursor, Command + Z to Undo. Any other keystroke propagates to keyDown, and if keyDown executes a command, the find bar moves the cursor to the current match first (see the command listener below). */
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { nativeEvent } = e
    if (nativeEvent.isComposing || nativeEvent.keyCode === 229) {
      // A key of an input method's composition belongs to the composition, e.g. the Enter that confirms it and the
      // Escape that cancels it.
      e.stopPropagation()
    } else if (commandByKeyDown(nativeEvent) === findCommand) {
      // Find again selects the query, ready to be replaced, as in a browser's find bar
      e.preventDefault()
      e.stopPropagation()
      inputRef.current?.select()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      commit()
    } else if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      step(e.shiftKey ? -1 : 1)
    } else if (isQueryKey(nativeEvent)) {
      e.stopPropagation()
    }
  }

  // Take the focus from the thought, below the toolbar.
  useLayoutEffect(() => {
    setTop(getVisibleBounds().top)
    savedSelection.current = selection.save()
    inputRef.current?.focus()
    return () => clearHighlights(matchesRef.current)
  }, [])

  // The global beforeinput handler would treat a space typed in the query as Space to Indent when the cursor is on an
  // empty thought, and native undo and redo as the thoughtspace's own.
  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    /** Keeps the query's input events to the query. */
    const stopPropagation = (e: Event) => e.stopPropagation()
    input.addEventListener('beforeinput', stopPropagation)
    return () => input.removeEventListener('beforeinput', stopPropagation)
  }, [])

  // Move the cursor to the current match before any other command executes, whether its shortcut was pressed in the
  // query or it was chosen from the toolbar or the system menu. commandEmitter announces a command once its caller has
  // decided to execute it, e.g. after keyDown has checked that no modal is open, and before the command reads the cursor,
  // so a command that cannot execute on the match, such as Indent on a first child, still moves the cursor there.
  useEffect(() => {
    /** Commits the current match before a command executes. */
    const onCommand = (command?: Command) => {
      if (command && command !== findCommand && findBarStore.getState().open) commit()
    }
    commandEmitter.on('command', onCommand)
    return () => commandEmitter.off('command', onCommand)
  }, [commit])

  // Find the matches when the query changes, starting from the first one at or below the top of the visible area.
  useEffect(() => {
    queryRef.current = query
    const matches = findMatches(query)
    if (matches.length === 0) {
      update(matches, 0, { scroll: false })
      return
    }
    const bounds = matchBounds(barRef.current)
    const first = matches.findIndex(match => match.range.getBoundingClientRect().bottom >= bounds.top)
    update(matches, Math.max(first, 0), { scroll: true })
  }, [query, update])

  // Find the matches again when the rendered thoughts change, e.g. when a scroll renders thoughts that were virtualized,
  // keeping the current match if it is still rendered.
  useEffect(() => {
    const content = document.getElementById('content')
    if (!content) return
    /** Searches the rendered thoughts again for the query. */
    const rescan = _.throttle(
      () => {
        if (!queryRef.current) return
        const previous = matchesRef.current[currentRef.current]
        const matches = findMatches(queryRef.current)
        const same = previous
          ? matches.findIndex(match => match.editable === previous.editable && match.end === previous.end)
          : -1
        update(matches, same !== -1 ? same : Math.min(currentRef.current, Math.max(matches.length - 1, 0)), {
          scroll: false,
        })
      },
      RESCAN_THROTTLE,
      { leading: false },
    )
    const observer = new MutationObserver(() => rescan())
    observer.observe(content, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      rescan.cancel()
    }
  }, [update])

  return (
    <div
      ref={barRef}
      role='search'
      aria-label='find'
      // Keep the focus in the query when anything else in the find bar is clicked, since the find bar closes when the
      // query loses the focus. That includes a disabled button, which lets the click through to the find bar (see
      // button[disabled] in panda.config.ts).
      onMouseDown={e => {
        if (e.target !== inputRef.current) e.preventDefault()
      }}
      className={css({
        position: 'fixed',
        right: '1em',
        zIndex: 'popup',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5em',
        padding: '0.4em 0.6em',
        backgroundColor: 'bg',
        border: 'solid 1px {colors.gray33}',
        borderRadius: '8px',
      })}
      style={{ top: top + 8 }}
    >
      <input
        ref={inputRef}
        // No type attribute, which defaults to text, so that the global input[type='text'] style does not size it as a
        // full-width form field.
        aria-label='Find'
        placeholder='Find'
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        // Close when the focus moves elsewhere in the page, e.g. to a thought that was clicked. A blur from switching
        // to another window leaves the find bar open, as a browser's does.
        onBlur={() => {
          if (document.hasFocus()) findBarStore.update({ open: false })
        }}
        className={css({ padding: '0.3em 0.5em', borderRadius: '4px', width: '12em', fontSize: 'inherit' })}
      />
      <span role='status' className={css({ color: 'dim', whiteSpace: 'nowrap', minWidth: '5em' })}>
        {query ? (count.total > 0 ? `${count.current + 1} of ${count.total}` : 'No matches') : ''}
      </span>
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '0.2em',
          paddingLeft: '0.5em',
          borderLeft: 'solid 1px {colors.gray33}',
        })}
      >
        <FindBarButton label='Previous match' disabled={count.total === 0} onClick={() => step(-1)}>
          <ChevronRightIcon size={16} strokeWidth={2} fill='currentColor' className={css({ rotate: '-90deg' })} />
        </FindBarButton>
        <FindBarButton label='Next match' disabled={count.total === 0} onClick={() => step(1)}>
          <ChevronRightIcon size={16} strokeWidth={2} fill='currentColor' className={css({ rotate: '90deg' })} />
        </FindBarButton>
        <FindBarButton label='Close' onClick={commit}>
          <XIcon size={16} fill='currentColor' />
        </FindBarButton>
      </div>
    </div>
  )
}

/** An inline find bar for the rendered thoughts, opened with Find (Command/Ctrl + F). Enter and Shift + Enter, or the down and up buttons, step through the matches, Escape or the close button moves the cursor to the current match, and any other command moves the cursor to it and then executes. */
const FindBar = () => {
  const open = findBarStore.useSelector(state => state.open)
  return open ? <FindBarOpen /> : null
}

export default FindBar
