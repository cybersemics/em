import type { Node } from '@react-types/shared'
import {
  Fragment,
  KeyboardEvent,
  forwardRef,
  startTransition,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useListBox } from 'react-aria'
import { useSelector } from 'react-redux'
import { Item, Section, useListState } from 'react-stately'
import { css } from '../../styled-system/css'
import Command from '../@types/Command'
import useCommandList from '../hooks/useCommandList'
import durations from '../util/durations'
import CommandUniverseListItem from './CommandUniverseListItem'

type CommandGroup = ReturnType<typeof useCommandList>['sections'][number]
type OriginRect = Pick<DOMRectReadOnly, 'x' | 'y' | 'width' | 'height'>
const SCROLL_ANIM_KEY = '__cuScrollAnim'

const INITIAL_ROW_LIMIT = 12
const REMAINING_ROWS_DELAY = durations.get('fast') + 50

interface CommandUniverseListHandle {
  /**
   * Forward a key event from an external focus owner (the search input). Returns true if the
   * key was consumed so the caller can preventDefault on the original DOM event.
   */
  handleKeyDown: (e: KeyboardEvent<Element>) => boolean
}

interface CommandUniverseListProps {
  /**
   * Full sectioned collection. The list renders headers itself (skipped when only one group
   * exists) so it can present a single logical listbox that arrow keys traverse seamlessly
   * across sections — the parent only owns search/sort state, not the row chrome.
   */
  groups: CommandGroup[]
  /** Reports the focused DOM row to the sibling glow without storing it in Redux. */
  onFocusedRowChange?: (row: HTMLLIElement | null) => void
  /** Search text that will be highlighted within each matched command title. */
  search?: string
  /** Fired when a row is activated by click or keyboard Enter; receives the row's bounding rect in dialog-content coordinates. */
  onItemTap?: (command: Command, originRect: OriginRect) => void
  /** Fired when the focused row's "Activate" pill is pressed; the parent runs the command. */
  onItemActivate?: (command: Command) => void
  /**
   * Navigate one step BACK in the navstack (detail → grid). Invoked on Shift+Tab forwarded
   * from the search input. The list doesn't own the navstack, so the parent dialog wires
   * this to its `handleBack`. Optional so the list can render standalone (no-op back).
   */
  onNavigateBack?: () => void
}

/**
 * Vertical, sectioned list of commands for the Command Universe. Desktop-primary counterpart
 * to `CommandUniverseGrid`. Built on react-aria's `useListBox` with `shouldUseVirtualFocus`
 * so the search input keeps real focus while a highlighted "focused" row tracks the user's
 * arrow-key navigation; the parent forwards key events via the imperative handle.
 *
 * Designed to extend to 2D nav later: swap `useListState` + `useListBox` + `useOption` for
 * their grid counterparts and the input-driven keyboard wiring carries over unchanged.
 */
const CommandUniverseList = forwardRef<CommandUniverseListHandle, CommandUniverseListProps>(
  ({ groups, search = '', onItemTap, onItemActivate, onNavigateBack, onFocusedRowChange }, forwardedRef) => {
    const fontSize = useSelector(state => state.fontSize)

    // command.id → Command. Item keys in the collection are command.ids, and onAction
    // callbacks hand us a Key — this map resolves it back without spelunking the collection.
    const commandsByKey = useMemo(() => {
      const m = new Map<string, Command>()
      groups.forEach(g => g.commands.forEach(c => m.set(c.id, c)))
      return m
    }, [groups])

    // Per-row DOM refs, indexed by command.id. Needed so a keyboard-Enter activation can
    // compute the zoom origin rect — the click path wraps each row in `getBoundingClientRect`
    // implicitly via the event target, but keyboard activations have no target element.
    const rowRefs = useRef(new Map<string, HTMLLIElement>())
    const registerRowRef = useCallback((id: string, el: HTMLLIElement | null) => {
      if (el) rowRefs.current.set(id, el)
      else rowRefs.current.delete(id)
    }, [])

    // Activate (execute) the focused command. Bound to row click via useListBox's onAction
    // and to Enter via the imperative handle. The right-arrow pill on each row calls
    // `onItemTap` directly with its own captured rect to drill into the detail page —
    // that's now the only path that opens detail, so this list no longer needs a fireZoom.
    const fireActivate = useCallback(
      (key: string) => {
        const cmd = commandsByKey.get(key)
        if (!cmd || !onItemActivate) return
        onItemActivate(cmd)
      },
      [commandsByKey, onItemActivate],
    )

    // Drill into the focused command's detail page from the keyboard. Same destination as
    // clicking the row's right-arrow pill — looks up the row's <li> ref so we can capture
    // an origin rect for the navstack zoom.
    const fireZoom = useCallback(
      (key: string) => {
        const cmd = commandsByKey.get(key)
        const el = rowRefs.current.get(key)
        if (!cmd || !el || !onItemTap) return
        const rect = el.getBoundingClientRect()
        if (!rect) return
        onItemTap(cmd, rect)
      },
      [commandsByKey, onItemTap],
    )

    const state = useListState<Command>({
      selectionMode: 'single',
      selectionBehavior: 'replace',
      children: groups.map(group => (
        <Section key={group.title} title={group.title}>
          {group.commands.map(cmd => (
            <Item key={cmd.id} textValue={cmd.label}>
              {cmd.label}
            </Item>
          ))}
        </Section>
      )),
    })

    // Render INITIAL_ROW_LIMIT rows on mount and the rest once the opening animation has finished. The transition
    // lets React split that work across frames if anything else is animating.
    const [rowLimit, setRowLimit] = useState(INITIAL_ROW_LIMIT)
    useEffect(() => {
      const timeout = window.setTimeout(() => startTransition(() => setRowLimit(Infinity)), REMAINING_ROWS_DELAY)
      return () => clearTimeout(timeout)
    }, [])
    // Sections trimmed to rowLimit rows in total, dropping any section left with none.
    let rowsLeft = rowLimit
    const visibleSections = [...state.collection].flatMap(section => {
      const items = [...section.childNodes].slice(0, rowsLeft)
      rowsLeft -= items.length
      return items.length > 0 ? [{ section, items }] : []
    })

    const listRef = useRef<HTMLUListElement>(null)
    const { listBoxProps } = useListBox(
      {
        'aria-label': 'Commands',
        // The search input owns real DOM focus; arrow keys move a *virtual* focused-key
        // pointer in state.selectionManager that we render as a row highlight.
        shouldUseVirtualFocus: true,
        autoFocus: false,
        // Row click → Activate (execute the command). Matches the legacy DesktopCommand-
        // Universe semantics: the row is "the command", clicking it runs it. The right-
        // arrow pill is the explicit affordance for opening the detail page. Disabled
        // rows fire `onItemActivate` too — the upstream handler decides whether to execute
        // or surface an alert explaining why the command is unavailable.
      },
      state,
      listRef,
    )

    // react-aria gates `useOption`'s `isFocused` on `selectionManager.isFocused`, which is
    // a separate flag from `focusedKey`. Without flipping it the row highlight never
    // appears even after we call `setFocusedKey`. Seed it on mount, and also seed an
    // initial focused key (skipping disabled rows) so users see a highlight before
    // pressing arrows. Re-runs when the collection is rebuilt (search filtered) so
    // post-filter the highlight lands on the first enabled row of the new result set.
    const fm = state.selectionManager
    const coll = state.collection
    const firstItemKey = useCallback(() => {
      let k = coll.getFirstKey()
      while (k != null && coll.getItem(k)?.type !== 'item') k = coll.getKeyAfter(k)
      return k
    }, [coll])

    // Re-seed focus to the first item whenever `groups` changes (mount, search input
    // changes, sort changes). `useCommandList` memoizes groups on (search, sortOrder,
    // filteredCommands) so the reference is stable for unrelated re-renders.
    //
    // Re-seed on *any* search transition — typed, refined, or cleared. The user's mental
    // model is "search filters the list and the top match is focused"; on backspace-to-
    // empty we want focus on the new first row, not whichever search-result command
    // happens to still exist in the unsearched view (otherwise the next ArrowDown would
    // navigate from a stale anchor and land on the old search neighbor instead of the
    // visible row below the top). Outside of search transitions, keep focus on the
    // current row if it's still present so unrelated re-renders don't yank focus mid
    // arrow-nav.
    //
    // `useLayoutEffect` — runs BEFORE react-stately's `useFocusedKeyReset` (which is a
    // `useEffect`). That order matters: if we seed the right key first, react-stately's
    // reset sees the focused key in the new collection and skips its own walk-the-old-
    // collection fallback (which is what produced the stale "next search neighbor" focus
    // before this seed). Reading via `useEffect` would still work in practice (last
    // setFocusedKey wins via React batching), but layout-ordering makes the contract
    // explicit and removes a class of timing edge cases.
    const prevSearchRef = useRef<string>('')
    useLayoutEffect(() => {
      fm.setFocused(true)
      const searchChanged = prevSearchRef.current !== search
      prevSearchRef.current = search
      const currentKey = fm.focusedKey != null ? String(fm.focusedKey) : null
      if (!searchChanged && currentKey != null && commandsByKey.has(currentKey)) return
      const seed = firstItemKey()
      if (seed != null) {
        // Signal the overlay to snap (no tween) for this particular focus change.
        fm.setFocusedKey(seed)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-seed on filter changes
    }, [groups, search])

    // Also re-reported when the groups change: re-sorting or filtering renders a new element for the focused row
    // while its key stays the same, and the selection glow would otherwise keep measuring the old, detached element
    // (whose offsets read as 0, so the glow jumps to the top). PROTOTYPE: belongs in #6018, which added the glow.
    useEffect(() => {
      const key = state.selectionManager.focusedKey
      onFocusedRowChange?.(key == null ? null : (rowRefs.current.get(String(key)) ?? null))
      return () => onFocusedRowChange?.(null)
    }, [onFocusedRowChange, state.selectionManager.focusedKey, groups])

    // Neutralize react-aria's secondary "center the whole listbox" scroll. After the row's
    // own scroll-into-view, if the row moved at all, react-aria additionally calls
    // `containingElement.scrollIntoView({ block: 'center', inline: 'center' })` on the
    // listbox `<ul>` — which yanks pageEntry to center the entire list and visibly breaks
    // the layout. Row-level scrolling is handled in CommandUniverseListItem.
    useEffect(() => {
      const el = listRef.current
      if (!el) return
      Object.defineProperty(el, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: () => {},
      })
      return () => {
        delete (el as unknown as { scrollIntoView?: unknown }).scrollIntoView
      }
    }, [])

    // Track the cursor position so a *user* scroll can re-home the highlight onto whatever row
    // ends up under the (stationary) cursor. Stored in a ref — it never needs to trigger a render.
    const mousePosRef = useRef<{ x: number; y: number } | null>(null)
    useEffect(() => {
      /** Record the latest cursor position for the user-scroll re-home handler below. */
      const onMouseMove = (e: MouseEvent) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY }
      }
      window.addEventListener('mousemove', onMouseMove, { passive: true })
      return () => window.removeEventListener('mousemove', onMouseMove)
    }, [])

    // On a USER scroll of the list, make the row under the cursor the focused (highlighted)
    // row — as content scrolls under a stationary cursor, the highlight tracks what's beneath it.
    // Gated to user scrolls only: programmatic autoscroll (arrow-key nav calling
    // `animateScrollTop`) stashes a RAF handle under `SCROLL_ANIM_KEY` on the container, and we
    // skip those frames. Otherwise a row sliding under a stationary cursor during keyboard nav
    // would yank the highlight away — the same reason the per-row hover handler binds `mousemove`
    // rather than `mouseenter`.
    useEffect(() => {
      const container = listRef.current?.closest('[data-dialog-scroll="true"]') as HTMLElement | null
      if (!container) return
      const fm = state.selectionManager
      /** Re-home the highlight to the row under the cursor on a user-driven scroll. */
      const onScroll = () => {
        // Skip our own animated autoscroll; only react to wheel/trackpad/scrollbar scrolls.
        if ((container as unknown as Record<string, number | null>)[SCROLL_ANIM_KEY] != null) return
        const pos = mousePosRef.current
        if (!pos) return
        const el = document.elementFromPoint(pos.x, pos.y)
        // Ignore points outside this list (cursor over the footer, another navstack page, etc.).
        if (!el || !listRef.current?.contains(el)) return
        const id = el.closest('[data-cu-command-id]')?.getAttribute('data-cu-command-id')
        if (id && commandsByKey.has(id)) fm.setFocusedKey(id)
      }
      container.addEventListener('scroll', onScroll, { passive: true })
      return () => container.removeEventListener('scroll', onScroll)
    }, [state.selectionManager, commandsByKey])

    useImperativeHandle(
      forwardedRef,
      () => ({
        handleKeyDown: e => {
          if (e.nativeEvent.isComposing) return false
          const fm = state.selectionManager
          const coll = state.collection
          /** Claims a navigation key before editor handlers receive it. */
          const consume = () => {
            e.preventDefault()
            e.stopPropagation()
          }
          // Walk past section headers in the given direction. Returns null only if no
          // item key exists in that direction — caller leaves focus in place rather than
          // landing on a section. Collection iteration is flat (section nodes are
          // returned alongside items), so we filter by `node.type === 'item'`. Disabled
          // rows are *not* skipped: they remain focusable for the user to see and read.
          /** Skips section headings while traversing command rows. */
          const nextItem = (start: ReturnType<typeof coll.getFirstKey>, dir: 'after' | 'before') => {
            let k = start
            while (k != null && coll.getItem(k)?.type !== 'item') {
              k = dir === 'after' ? coll.getKeyAfter(k) : coll.getKeyBefore(k)
            }
            return k
          }
          /** Finds the first command in the collection. */
          const firstItem = () => nextItem(coll.getFirstKey(), 'after')
          /** Finds the last command in the collection. */
          const lastItem = () => nextItem(coll.getLastKey(), 'before')
          // Cmd/Alt + Arrow jumps to the corresponding end — mirrors the legacy desktop
          // palette's metaKey/altKey shortcut.
          if (e.key === 'ArrowDown' && (e.metaKey || e.altKey)) {
            const k = lastItem()
            if (k != null) fm.setFocusedKey(k)
            consume()
            return true
          }
          if (e.key === 'ArrowUp' && (e.metaKey || e.altKey)) {
            const k = firstItem()
            if (k != null) fm.setFocusedKey(k)
            consume()
            return true
          }
          if (e.key === 'ArrowDown') {
            const start = fm.focusedKey != null ? coll.getKeyAfter(fm.focusedKey) : coll.getFirstKey()
            const next = nextItem(start, 'after')
            if (next != null) fm.setFocusedKey(next)
            consume()
            return true
          }
          if (e.key === 'ArrowUp') {
            const start = fm.focusedKey != null ? coll.getKeyBefore(fm.focusedKey) : coll.getLastKey()
            const prev = nextItem(start, 'before')
            if (prev != null) fm.setFocusedKey(prev)
            consume()
            return true
          }
          if (e.key === 'PageDown' || e.key === 'PageUp') {
            // Move by about one visible page of rows: step past rows, adding up their heights,
            // until the next would carry focus past the scroll container's visible height. Rows
            // vary from one to three lines, so heights are measured; a row not rendered yet
            // (a row outside the visible region) counts at the average height of those that are.
            const dir = e.key === 'PageDown' ? 'after' : 'before'
            const pageHeight = listRef.current?.closest<HTMLElement>('[data-dialog-scroll="true"]')?.clientHeight ?? 0
            const heights = [...rowRefs.current.values()].map(row => row.offsetHeight)
            const averageHeight = heights.length > 0 ? heights.reduce((a, h) => a + h, 0) / heights.length : 64
            let target = fm.focusedKey ?? firstItem()
            let travelled = 0
            while (target != null) {
              const next = nextItem(dir === 'after' ? coll.getKeyAfter(target) : coll.getKeyBefore(target), dir)
              if (next == null) break
              travelled += rowRefs.current.get(String(next))?.offsetHeight ?? averageHeight
              if (travelled > pageHeight && target !== fm.focusedKey) break
              target = next
            }
            if (target != null) fm.setFocusedKey(target)
            consume()
            return true
          }
          if (e.key === 'Home') {
            const k = firstItem()
            if (k != null) fm.setFocusedKey(k)
            consume()
            return true
          }
          if (e.key === 'End') {
            const k = lastItem()
            if (k != null) fm.setFocusedKey(k)
            consume()
            return true
          }
          if (e.key === 'Enter') {
            // Enter activates (runs) the focused command — same as clicking the row or the
            // Activate pill. Disabled commands still fire the upstream activation handler;
            // it shows an alert instead of executing.
            if (fm.focusedKey != null) {
              fireActivate(String(fm.focusedKey))
            }
            consume()
            return true
          }
          // Tab / Shift+Tab drive the navstack on the grid level, replacing the old
          // ArrowLeft/ArrowRight navigation. Freeing the arrow keys lets ←/→ move the
          // search input's text caret normally (the search input owns real DOM focus and
          // forwards keys here). ArrowRight specifically no longer drills into detail —
          // it now falls through (returns false) so the caret can move.
          if (e.key === 'Tab' && !e.shiftKey) {
            // Tab goes FORWARD: drill into the focused row's detail page — same destination
            // as the row's right-arrow pill (and the former ArrowRight-on-row behavior).
            // Consumed so the browser's default tab-focus traversal doesn't move focus off
            // the search input. Falls through (returns false) when no row is focused so the
            // dialog-level handler can take over (forward-stack replay on the detail level).
            if (fm.focusedKey != null) {
              fireZoom(String(fm.focusedKey))
              consume()
              return true
            }
            return false
          }
          if (e.key === 'Tab' && e.shiftKey) {
            // Shift+Tab goes BACK (detail → grid; navstack back). The list doesn't own the
            // navstack, so it calls back out via the optional `onNavigateBack` callback the
            // parent dialog wires to `handleBack`. Always consumed so the browser's default
            // reverse-tab traversal doesn't pull focus off the search input.
            onNavigateBack?.()
            consume()
            return true
          }
          return false
        },
      }),
      [state, fireActivate, fireZoom, onNavigateBack],
    )

    return (
      <>
        <ul
          {...listBoxProps}
          ref={listRef}
          className={css({
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
          })}
          // anchor all `em` units used in children to `fontSize`
          style={{ fontSize }}
        >
          {visibleSections.map(({ section, items }, index) => (
            <Fragment key={section.key}>
              {groups.length > 1 && (
                <li
                  role='presentation'
                  className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    paddingTop: index === 0 ? '0.75rem' : '1.25rem',
                    paddingBottom: '0.65rem',
                    paddingInline: '0.8rem',
                  })}
                >
                  <h2
                    className={css({
                      fontSize: '1rem',
                      fontWeight: 500,
                      color: 'fg',
                      borderBottom: 'none',
                      margin: 0,
                      whiteSpace: 'nowrap',
                    })}
                  >
                    {section.rendered}
                  </h2>
                  <div
                    className={css({
                      flexGrow: 1,
                      height: '1px',
                      // eslint-disable-next-line @pandacss/prefer-token -- Both gradient colors reference theme tokens.
                      background: 'linear-gradient(to right, {colors.dialogHeaderDivider}, {colors.transparent})',
                    })}
                  />
                </li>
              )}
              {items.map(itemNode => {
                const cmd = commandsByKey.get(String(itemNode.key))
                if (!cmd) return null
                return (
                  <CommandUniverseListItem
                    key={itemNode.key}
                    item={itemNode as Node<Command>}
                    command={cmd}
                    state={state}
                    search={search}
                    registerRef={registerRowRef}
                    onActivate={onItemActivate}
                    onZoom={onItemTap}
                  />
                )
              })}
            </Fragment>
          ))}
        </ul>
      </>
    )
  },
)

CommandUniverseList.displayName = 'CommandUniverseList'

export default CommandUniverseList
