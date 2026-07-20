import _ from 'lodash'
import React, { FocusEventHandler, useCallback, useEffect, useMemo, useRef } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { cx } from '../../styled-system/css'
import { editableRecipe, invalidOptionRecipe } from '../../styled-system/recipes'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import TutorialChoice from '../@types/TutorialChoice'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { errorActionCreator as error } from '../actions/error'
import importData from '../actions/importData'
import { importSpeechToTextActionCreator as importSpeechToText } from '../actions/importSpeechToText'
import { setInvalidStateActionCreator as setInvalidState } from '../actions/invalidState'
import { keyboardOpenActionCreator } from '../actions/keyboardOpen'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { tutorialNextActionCreator as tutorialNext } from '../actions/tutorialNext'
import { isMac, isSafari, isTouch } from '../browser'
import { commandEmitter } from '../commands'
import {
  EDIT_THROTTLE,
  EM_TOKEN,
  LongPressState,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../constants'
import asyncFocus from '../device/asyncFocus'
import preventAutoscroll, { preventAutoscrollEnd } from '../device/preventAutoscroll'
import * as selection from '../device/selection'
import globals from '../globals'
import findDescendant from '../selectors/findDescendant'
import { anyChild, getAllChildrenAsThoughts } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getSetting from '../selectors/getSetting'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursorSelector from '../selectors/hasMulticursor'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import editingValueUntrimmedStore from '../stores/editingValueUntrimmed'
import storageModel from '../stores/storageModel'
import suppressFocusStore from '../stores/suppressFocus'
import addEmojiSpace from '../util/addEmojiSpace'
import containsURL from '../util/containsURL'
import debugLog from '../util/debugLog'
import ellipsize from '../util/ellipsize'
import equalPath from '../util/equalPath'
import getCommandState from '../util/getCommandState'
import haptics from '../util/haptics'
import head from '../util/head'
import isDivider from '../util/isDivider'
import isDocumentEditable from '../util/isDocumentEditable'
import strip from '../util/strip'
import stripEmptyFormattingTags from '../util/stripEmptyFormattingTags'
import stripTags from '../util/stripTags'
import trimHtml from '../util/trimHtml'
import ContentEditable, { ContentEditableEvent } from './ContentEditable'
import useEditMode from './Editable/useEditMode'
import useOnCopy from './Editable/useOnCopy'
import useOnCut from './Editable/useOnCut'
import useOnPaste from './Editable/useOnPaste'

interface EditableProps {
  editableRef?: React.RefObject<HTMLInputElement | null>
  path: Path
  isEditing: boolean
  isVisible?: boolean
  multiline?: boolean
  placeholder?: string
  rank?: number
  style?: React.CSSProperties
  className?: string
  simplePath: SimplePath
  /* If transient is true:
    1. Instead of calling exisitingThoughtChange, it calls newThought to add the given child to the state.
    2. It also sets focus to itself on render.
  */
  transient?: boolean
  onEdit?: (args: { path: Path; oldValue: string; newValue: string }) => void
}

/** If oldValue is wrapped in a formatting node, transfer that wrapper to the new value. */
const applyOuterTag = (newValue: string, oldValue: string): string => {
  const div = document.createElement('div')
  div.innerHTML = oldValue

  if (
    div.childNodes.length > 1 ||
    div.firstChild?.nodeType === Node.TEXT_NODE ||
    !(div.firstChild instanceof HTMLElement)
  )
    return newValue

  div.firstChild.innerHTML = newValue

  return div.firstChild.outerHTML
}

// this flag is used to ensure that the browser selection is not restored after the initial setCursorOnThought
let cursorOffsetInitialized = false

/** Returns a guard function that throws with the given message if it is called more than `limit` times within a
 * rolling `windowMs` window. Used to convert a runaway re-entrant loop into a loud, stack-unwinding error instead of
 * a frozen main thread. The default limit is far above any human typing/IME/autocomplete burst. */
const useInfiniteLoopGuard = (name: string, message: string, limit = 100, windowMs = 1000) => {
  const stateRef = useRef({ count: 0, windowStart: 0 })
  return useCallback(() => {
    const now = performance.now()
    const guard = stateRef.current
    if (now - guard.windowStart > windowMs) {
      guard.windowStart = now
      guard.count = 0
    }
    guard.count++
    // Log high-water marks so the rolling log shows the loop tightening (dt collapsing) before it trips the limit.
    if (guard.count % 25 === 0) {
      debugLog.log('guard', { guard: name, count: guard.count })
    }
    if (guard.count > limit) {
      // Log immediately before throwing so the final pre-freeze burst is captured even though the throw unwinds the stack.
      debugLog.log('guard', { guard: name, count: guard.count, threw: true })
      throw new Error(message)
    }
  }, [name, message, limit, windowMs])
}

/**
 * An editable thought with throttled editing.
 * Use rank instead of headRank(simplePath) as it will be different for context view.
 */
const Editable = ({
  editableRef,
  isEditing,
  isVisible,
  multiline,
  placeholder,
  onEdit,
  path,
  simplePath,
  style,
  className,
  transient,
}: EditableProps) => {
  const dispatch = useDispatch()
  const thoughtId = head(simplePath)
  const parentId = useSelector(state => head(rootedParentOf(state, simplePath)))
  const readonly = useSelector(state => findDescendant(state, thoughtId, '=readonly'))
  const uneditable = useSelector(state => findDescendant(state, thoughtId, '=uneditable'))
  const optionsId = useSelector(state => findDescendant(state, parentId, '=options'))
  const options = useSelector(state => {
    const childrenOptions = getAllChildrenAsThoughts(state, optionsId)
    return childrenOptions.length > 0 ? childrenOptions.map(thought => thought.value.toLowerCase()) : null
  }, shallowEqual)
  // it is possible that the thought is deleted and the Editable is re-rendered before it unmounts, so guard against undefined thought
  const value = useSelector(state => getThoughtById(state, head(simplePath))?.value || '')
  const rank = useSelector(state => getThoughtById(state, head(simplePath))?.rank || 0)
  const isCursorCleared = useSelector(state => !!isEditing && state.cursorCleared)
  const placeholderCommandState = useMemo(
    () => (isCursorCleared ? getCommandState(value) : null),
    [isCursorCleared, value],
  )
  const placeholderForeColor =
    typeof placeholderCommandState?.foreColor === 'string' ? placeholderCommandState.foreColor : undefined
  const placeholderBackColor =
    typeof placeholderCommandState?.backColor === 'string' ? placeholderCommandState.backColor : undefined
  const contentEditableStyle = useMemo(
    (): React.CSSProperties | undefined =>
      placeholderForeColor || placeholderBackColor
        ? {
            ...(style || {}),
            ...(placeholderForeColor ? { '--placeholder-color': placeholderForeColor } : null),
            ...(placeholderBackColor ? { '--placeholder-background-color': placeholderBackColor } : null),
          }
        : style,
    [placeholderBackColor, placeholderForeColor, style],
  )

  const hasMulticursor = useSelector(hasMulticursorSelector)
  // store the old value so that we have a transcendental head when it is changed
  const oldValueRef = useRef(value)
  // Guards against a runaway re-entrant loop in the change/autocomplete handlers freezing the app (#4467).
  const guardChangeHandler = useInfiniteLoopGuard(
    'change',
    'Infinite loop detected in Editable.onChangeHandler: over 100 change events within 1s',
  )
  const guardAutocompleteInput = useInfiniteLoopGuard(
    'autocomplete',
    'Infinite loop detected in Editable.onAutocompleteInput: over 100 input events within 1s',
  )
  const nullRef = useRef<HTMLInputElement>(null)
  const contentRef = editableRef || nullRef
  const isCursor = useSelector(state => equalPath(path, state.cursor))
  const editingOrOnCursor = useSelector(state => isCursor || state.isKeyboardOpen)
  // Stop dragover events from propagating up on non-cursor thoughts or notes, otherwise text selection drag-and-drop will be canceled by
  // react-dnd on desktop.
  const stopDragOver = useSelector(state => !isCursor || state.noteFocus)

  // Disable contenteditable during drag-and-drop, otherwise thought text will become selected on mobile Safari.
  // On desktop Chrome, disabled is used to allow dragover events to avoid disrupting drag-and-drop behavior.
  // https://github.com/cybersemics/em/pull/3703
  const disabled = useSelector(state => !isDocumentEditable || state.longPress === LongPressState.DragInProgress)

  // console.info('<Editable> ' + prettyPath(store.getState(), simplePath))
  // useWhyDidYouUpdate('<Editable> ' + prettyPath(state, simplePath), {
  //   cursorOffset,
  //   disabled,
  //   editing,
  //   isEditing,
  //   isVisible,
  //   onEdit,
  //   path,
  //   simplePath,
  //   style,
  //   transient,
  //   value,
  //   rank,
  //   fontSize,
  //   hasNoteFocus,
  //   isCursorCleared,
  // })

  const childrenLabel = useSelector(state => {
    const labelId = findDescendant(state, parentId, '=label')
    return anyChild(state, labelId)?.value
  })

  if (contentRef.current) {
    contentRef.current.style.opacity = '1.0'
  }

  /** Toggle invalid-option class using contentRef. */
  const setContentInvalidState = (value: boolean) => {
    if (!contentRef.current) return
    contentRef.current.classList[value ? 'add' : 'remove'](invalidOptionRecipe())
  }

  // side effect to set old value ref to head value from updated simplePath. Also update editing value, if it is different from current value.
  useEffect(
    () => {
      oldValueRef.current = value
      if (isEditing && selection.isThought() && editingValueStore.getState() !== value) {
        editingValueStore.update(value)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value],
  )

  /** Set or reset invalid state. */
  const invalidStateError = (invalidValue: string | null) => {
    const isInvalid = invalidValue != null
    dispatch(error({ value: isInvalid ? `Invalid Value: "${invalidValue}"` : null }))
    setInvalidState(isInvalid)

    // the Editable cannot connect to state.invalidState, as it would re-render during editing
    // instead, we use setContentInvalidState to manipulate the DOM directly
    setContentInvalidState(isInvalid)
  }

  /** Set the cursor on the thought. */
  const setCursorOnThought = useCallback(
    ({ isKeyboardOpen }: { isKeyboardOpen?: boolean } = {}) => {
      dispatch((dispatch, getState) => {
        const state = getState()

        // do not set cursor if it is unchanged and we are not entering when keyboard is open
        if ((!isKeyboardOpen || state.isKeyboardOpen) && equalPath(state.cursor, path)) return

        // set offset to null to allow the browser to set the position of the selection
        let offset = null

        // if running for the first time, restore the offset if the path matches the restored cursor
        if (!cursorOffsetInitialized) {
          const restored: { path: Path | null; offset: number | null } = storageModel.get('cursor')
          if (path && restored.offset && equalPath(restored.path, path)) {
            offset = restored.offset || null
          }
        }

        // Prevent the cursor offset from being restored after the initial setCursorOnThought.
        cursorOffsetInitialized = true

        dispatch(
          setCursor({
            cursorHistoryClear: true,
            preserveMulticursor: true,
            isKeyboardOpen,
            offset,
            path,
          }),
        )
      })
    },
    // When isEditing changes, we need to reset the cursor on the thought.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, isEditing, path],
  )

  /**
   * Dispatches editThought and has tutorial logic.
   * Debounced from onChangeHandler.
   * Since variables inside this function won't get updated between re-render so passing latest context, rank etc as params.
   */
  const thoughtChangeHandler = (
    newValue: string,
    {
      force,
      rank,
      simplePath,
      cursorOffset,
    }: { force?: boolean; rank: number; simplePath: SimplePath; cursorOffset?: number },
  ) => {
    // Note: Don't update innerHTML of contentEditable here. Since thoughtChangeHandler may be debounced, it may cause contentEditable to be out of sync.
    invalidStateError(null)

    const oldValue = oldValueRef.current

    if (transient) {
      dispatch((dispatch, getState) => {
        const state = getState()
        return newThought({
          at: rootedParentOf(state, path),
          value: newValue,
        })
      })
      return
    }

    // Log the value transition at the point the edit is committed to Redux. Correlates with the 'change' branch that queued it.
    debugLog.log('edit', { oldValue, newValue, rank })

    dispatch(
      editThought({
        oldValue,
        newValue,
        path: simplePath,
        // Set cursorOffset so that it is included in the undo patch.
        // Otherwise, the selection offset will not be restored correctly on undo/redo.
        // This will have no effect on useEditMode, which does not subscribe to state.cursorOffset reactively.
        cursorOffset: cursorOffset ?? selection.offsetThought() ?? undefined,
        force,
      }),
    )

    if (isDivider(newValue)) {
      // remove selection so that the focusOffset does not cause a split false positive in newThought
      selection.clear()
    }

    // store the value so that we have a transcendental head when it is changed
    oldValueRef.current = newValue

    dispatch((dispatch, getState) => {
      const state = getState()
      const tutorialChoice = +(getSetting(state, 'Tutorial Choice') || 0) as TutorialChoice
      const tutorialStep = +(getSetting(state, 'Tutorial Step') || 1)
      if (
        newValue &&
        ((Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1_PARENT &&
          newValue.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) ||
          (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2_PARENT &&
            newValue.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) ||
          ((Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1 ||
            Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2) &&
            newValue.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())) &&
        newValue.length > 0
      ) {
        dispatch(tutorialNext({}))
      }
    })

    onEdit?.({ path, oldValue, newValue })
  }

  // using useRef hook to store throttled function so that it can persist even between component re-renders, so that throttle.flush method can be used properly
  const throttledChangeRef = useRef(_.throttle(thoughtChangeHandler, EDIT_THROTTLE, { leading: false }))

  useEditMode({ contentRef, isEditing, path, style, transient })

  useEffect(() => {
    /** Flushes pending edits. */
    const flush = () => throttledChangeRef.current.flush()
    commandEmitter.on('command', flush)

    // flush edits and remove handler on unmount
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      throttledChangeRef.current.flush()
      commandEmitter.off('command', flush)
    }
  }, [])

  useEffect(() => {
    if (!isTouch || !isSafari() || !contentRef.current) return

    const editable = contentRef.current
    const AUTOCOMPLETE_SPACE_WINDOW_MS = 250
    let pendingAutocompleteAt: number | null = null

    /** Snapshots the input event and editable state for the rolling log. `branch` names the code path that handled the event,
     * so the log distinguishes an ignored keystroke from the retarget path that runs after iOS autocomplete. */
    const logInput = (e: InputEvent, branch: string) =>
      debugLog.log('input', {
        branch,
        inputType: e.inputType,
        data: e.data,
        isComposing: e.isComposing,
        value: editable.textContent,
        sel: selection.offsetThought() ?? selection.offset(),
        pending: pendingAutocompleteAt,
      })

    /** After iOS autocomplete (insertReplacementText) accepts a word, no touch events reach the DOM
     * in a "dead zone" beneath the word until focus is retargeted. Moving focus to the asyncFocus dummy input
     * and back to the previous active element allows touch events to reach the DOM again.
     *
     * It is possible to intercept insertReplacementText and perform the focus retargeting there
     * instead of waiting for the next insertText event, but that breaks native undo via shake or three-finger swipe.
     */
    const onAutocompleteInput = (e: Event) => {
      if (!editable || !(e instanceof InputEvent)) return

      guardAutocompleteInput()

      if (e.inputType === 'insertReplacementText') {
        logInput(e, 'replacement-pending')
        pendingAutocompleteAt = performance.now()
        return
      }

      if (e.inputType !== 'insertText' || e.data !== ' ' || pendingAutocompleteAt == null) {
        logInput(e, 'ignored')
        pendingAutocompleteAt = null
        return
      }

      if (performance.now() - pendingAutocompleteAt > AUTOCOMPLETE_SPACE_WINDOW_MS) {
        logInput(e, 'window-expired')
        pendingAutocompleteAt = null
        return
      }

      logInput(e, 'retarget')

      const savedCharOffset = selection.offsetThought() ?? selection.offset() ?? 0

      // Queue and flush the change with the browser-applied value to ensure it's captured before the editable blurs.
      oldValueRef.current = editable.textContent || ''
      throttledChangeRef.current(oldValueRef.current, { rank, simplePath })
      throttledChangeRef.current.flush()

      // Log each retarget step around the native focus/selection calls so a freeze can be pinned to the exact call
      // that stopped returning (the last 'retarget' entry before the log goes silent is the culprit).
      debugLog.log('retarget', { step: 'asyncFocus', savedOffset: savedCharOffset })
      asyncFocus({ force: true })

      debugLog.log('retarget', { step: 'preventAutoscroll', savedOffset: savedCharOffset })
      preventAutoscroll(editable)
      // Restore the selection offset captured when insertText(' ') arrived.
      debugLog.log('retarget', { step: 'selection.set', savedOffset: savedCharOffset })
      selection.set(editable, { offset: savedCharOffset })
      preventAutoscrollEnd(editable)

      pendingAutocompleteAt = null
    }

    // The following native listeners are scoped to this effect (Safari touch only) so they add zero surface area on other
    // platforms. Each is a no-op when debug logging is disabled. They capture the raw event stream around autocomplete,
    // which React's synthetic onChange does not fully expose (e.g. beforeinput, composition, and focus retargeting).

    /** Logs the key sequence leading into an autocomplete freeze. */
    const onEditableKeyDown = (e: KeyboardEvent) => debugLog.log('keydown', { key: e.key, isComposing: e.isComposing })

    /** Logs beforeinput, which precedes each mutation and reveals intent (e.g. insertReplacementText) even if input never fires. */
    const onEditableBeforeInput = (e: Event) =>
      e instanceof InputEvent &&
      debugLog.log('beforeinput', { inputType: e.inputType, data: e.data, isComposing: e.isComposing })

    /** Logs IME composition boundaries; iOS autocorrect runs inside a composition and a hang may straddle these. */
    const onEditableCompositionStart = () => debugLog.log('composition', { phase: 'start' })
    /** Logs the end of an IME composition, including the committed data. */
    const onEditableCompositionEnd = (e: CompositionEvent) =>
      debugLog.log('composition', { phase: 'end', data: e.data })

    /** Describes the currently focused element (tag + data-testid) so focus retargeting during autocomplete can be traced. */
    const describeActiveElement = () => {
      const el = document.activeElement
      return { tag: el?.tagName ?? null, testid: el?.getAttribute?.('data-testid') ?? null }
    }
    /** Logs when the editable gains focus, recording which element is now active. */
    const onEditableFocus = () => debugLog.log('focus', describeActiveElement())
    /** Logs when the editable loses focus, recording which element is now active (reveals the asyncFocus retarget target). */
    const onEditableBlur = () => debugLog.log('blur', describeActiveElement())

    /** Logs caret movement ONLY during the ~250ms autocomplete window (pendingAutocompleteAt != null) to trace the caret
     * entering the touch dead zone without flooding the log with every ordinary selection change. */
    const onSelectionChange = () => {
      if (pendingAutocompleteAt == null) return
      debugLog.log('selectionchange', {
        anchor: selection.anchorOffset(),
        focus: selection.offset(),
        collapsed: selection.isCollapsed(),
      })
    }

    editable.addEventListener('input', onAutocompleteInput)
    editable.addEventListener('keydown', onEditableKeyDown)
    editable.addEventListener('beforeinput', onEditableBeforeInput)
    editable.addEventListener('compositionstart', onEditableCompositionStart)
    editable.addEventListener('compositionend', onEditableCompositionEnd)
    editable.addEventListener('focus', onEditableFocus)
    editable.addEventListener('blur', onEditableBlur)
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      editable.removeEventListener('input', onAutocompleteInput)
      editable.removeEventListener('keydown', onEditableKeyDown)
      editable.removeEventListener('beforeinput', onEditableBeforeInput)
      editable.removeEventListener('compositionstart', onEditableCompositionStart)
      editable.removeEventListener('compositionend', onEditableCompositionEnd)
      editable.removeEventListener('focus', onEditableFocus)
      editable.removeEventListener('blur', onEditableBlur)
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [contentRef, rank, simplePath, guardAutocompleteInput])

  useEffect(() => {
    // if there is a multicursor, blur the contentRef
    if (hasMulticursor && contentRef.current && contentRef.current === document.activeElement) {
      contentRef.current.blur()
    }
  }, [hasMulticursor, contentRef])

  /** Performs meta validation and calls thoughtChangeHandler immediately or using throttled reference. */
  const onChangeHandler = useCallback(
    (e: ContentEditableEvent) => {
      // Ignore programmatic edits made while formatting is suppressing focus — specifically the throwaway
      // execCommand('insertHTML') that registerNativeUndoStep runs on iOS to create a native undo step. em's Redux
      // truth comes from the synchronous editThought dispatched by formatSelection; recording this DOM mutation would
      // create a duplicate undo step (WebKit re-serializes the inserted HTML, so it is not even value-identical). The
      // editThought's forced re-render restores the editable to the exact computed value (#4637).
      if (suppressFocusStore.getState()) return

      // Infinite loop guard. onChangeHandler is re-entrant (edit → dispatch editThought → re-render →
      // input → onChange). The newValue === oldValue short-circuit below normally breaks the cycle, but a
      // corrupted Thought/Lexeme pair can defeat it and spin the main thread, freezing the app (#4467).
      guardChangeHandler()

      // make sure to get updated state

      // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      const oldValue = oldValueRef.current

      // Using a clipboard app such as Paste for iOS or the built-in clipboard viewer on Android directly modifies the innerHTML and triggers an onChange event on the contenteditable.
      const isClipboardInsert = /<div>(?!<br>)/.test(e.target.value)

      if (isClipboardInsert) {
        // When inserting plain text, the clipboard app replaces newlines with divs. This results in a mixed format that looks like HTML, but it actually plain text with meaningful whitespace.
        // TODO: What happens when actual HTML is inserted from the clipboard app? It needs to be differentiated from plain text with divs.
        // TODO: Consider handling this in importData or textToHtml, as onChangeHandler should not contain import logic. Just need to make sure it does not introduce regressions.
        const text = e.target.value.slice(oldValue.length).replace(/<div>/g, '\n')
        debugLog.log('change', {
          branch: 'clipboard',
          isClipboardInsert,
          oldValue,
          newValue: e.target.value,
          cursorOffset: selection.offsetThought(),
        })
        dispatch(
          importData({
            path: simplePath,
            text,
            rawDestValue: strip(contentRef.current!.innerHTML, { preventTrim: true }),
            transient,
          }),
        )
        return
      }

      editingValueUntrimmedStore.update(e.target.value)

      dispatch((dispatch, getState) => {
        const state = getState()

        // When the cursor is cleared, there may be an existing style that wraps the entire thought.
        // That style should be re-applied once they type something. (#3673)

        const wrappedValue = state.cursorCleared ? applyOuterTag(e.target.value, oldValue) : e.target.value
        const trimmedWrappedValue = trimHtml(wrappedValue)
        const valueWithEmojiSpace = addEmojiSpace(trimmedWrappedValue)
        const newValue = stripEmptyFormattingTags(valueWithEmojiSpace)
        const emojiSpaceAdded = valueWithEmojiSpace !== trimmedWrappedValue
        const emojiSpaceInsertionIndex = emojiSpaceAdded ? valueWithEmojiSpace.indexOf(' ') : null

        /* The realtime editingValue must always be updated (and not short-circuited) since oldValueRef is throttled. Otherwise, editingValueStore becomes stale and heights are not recalculated in VirtualThought.

        e.g.

          1. user edits a -> aa
          2. throttledChangeRef is queued.
          3. editingValueStore is updated in realtime on the first edit.
          4. user edits aa -> a
          5. onChangeHandler short circuits since throttledChangeRef has not resolved and newValue === oldValue
          6. editingValueStore must be updated, otherwise it will retain the stale value aa
      */
        editingValueStore.update(newValue)

        const cursorOffset = selection.offsetThought()
        // If addEmojiSpace inserts a space, keep the caret in the same visual position after re-render.
        let cursorOffsetWithEmojiSpace = cursorOffset === null ? undefined : cursorOffset
        if (
          emojiSpaceInsertionIndex != null &&
          emojiSpaceInsertionIndex >= 0 &&
          cursorOffset != null &&
          cursorOffset >= emojiSpaceInsertionIndex
        ) {
          cursorOffsetWithEmojiSpace = cursorOffset + 1
        }

        // TODO: Disable keypress
        // e.preventDefault() does not work
        // disabled={readonly} removes contenteditable property

        if (newValue === oldValue) {
          if (contentRef.current) {
            contentRef.current.style.opacity = '1.0'
          }

          if (readonly || uneditable || options) invalidStateError(null)

          // The newValue === oldValue short-circuit is the primary defense against the re-entrant change loop (#4467).
          // Logging it reveals whether the guard is firing because this short-circuit is being defeated (values differ
          // every cycle) or bypassed entirely.
          debugLog.log('change', {
            branch: 'noop',
            isClipboardInsert,
            oldValue,
            newValue,
            cursorOffset: cursorOffsetWithEmojiSpace,
          })

          // if we cancel the edit, we have to cancel pending its
          // this can occur for example by editing a value away from and back to its
          throttledChangeRef.current.cancel()

          return
        }

        const oldValueClean = oldValue === EM_TOKEN ? 'em' : ellipsize(oldValue)

        if (contentRef.current) {
          contentRef.current.style.opacity = '1.0'
        }

        if (readonly) {
          debugLog.log('change', {
            branch: 'readonly',
            isClipboardInsert,
            oldValue,
            newValue,
            cursorOffset: cursorOffsetWithEmojiSpace,
          })
          dispatch(error({ value: `"${ellipsize(oldValueClean)}" is read-only and cannot be edited.` }))
          throttledChangeRef.current.cancel() // see above
          return
        } else if (uneditable) {
          debugLog.log('change', {
            branch: 'uneditable',
            isClipboardInsert,
            oldValue,
            newValue,
            cursorOffset: cursorOffsetWithEmojiSpace,
          })
          dispatch(error({ value: `"${ellipsize(oldValueClean)}" is uneditable.` }))
          throttledChangeRef.current.cancel() // see above
          return
        } else if (options && !options.includes(newValue.toLowerCase())) {
          debugLog.log('change', {
            branch: 'invalid',
            isClipboardInsert,
            oldValue,
            newValue,
            cursorOffset: cursorOffsetWithEmojiSpace,
          })
          invalidStateError(newValue)
          throttledChangeRef.current.cancel() // see above
          return
        }

        const newNumContext = getContexts(state, newValue).length
        const isNewValueURL = containsURL(newValue)

        const contextLengthChange =
          newNumContext > 0 || newNumContext !== getContexts(state, oldValueRef.current).length - 1
        const urlChange = isNewValueURL || isNewValueURL !== containsURL(oldValueRef.current)

        // A formatting-only edit changes the markup but not the plain text (e.g. applying a font or background color).
        // Persist it immediately rather than through the edit throttle so that formatSelection's follow-up strip thunk
        // reads a fresh value from Redux. Otherwise a stale read can leave a redundant default background in place (#4265).
        const formattingChange =
          newValue !== oldValueRef.current && stripTags(newValue) === stripTags(oldValueRef.current)

        const isEmpty = newValue.length === 0

        // Safari adds <br> to empty contenteditables after editing, so strip them out.
        // Make sure empty thoughts are truly empty.
        if (contentRef.current && isEmpty) {
          contentRef.current.innerHTML = newValue
        }

        // run the thoughtChangeHandler immediately if superscript changes or it's a url (also when it changes true to false)
        // run it immediately is there is a style wrapper that needs to be applied to the editable after a clearThought action (#3673)
        if (
          wrappedValue !== e.target.value ||
          emojiSpaceAdded ||
          transient ||
          contextLengthChange ||
          urlChange ||
          formattingChange ||
          isEmpty ||
          isDivider(newValue)
        ) {
          // update new supercript value and url boolean
          debugLog.log('change', {
            branch: 'immediate',
            isClipboardInsert,
            oldValue,
            newValue,
            cursorOffset: cursorOffsetWithEmojiSpace,
          })
          throttledChangeRef.current.flush()
          // if a style needs to be re-applied with cursorClearedWrapper, the editable needs to re-render immediately to prevent
          // a flash of unstyled content
          thoughtChangeHandler(newValue, {
            force: wrappedValue !== e.target.value || emojiSpaceAdded,
            rank,
            simplePath,
            cursorOffset: cursorOffsetWithEmojiSpace,
          })
        } else {
          debugLog.log('change', {
            branch: 'throttled',
            isClipboardInsert,
            oldValue,
            newValue,
            cursorOffset: cursorOffsetWithEmojiSpace,
          })
          throttledChangeRef.current(newValue, { rank, simplePath })
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readonly, uneditable /* TODO: options */],
  )

  /** Imports text that is pasted onto the thought. */
  const onPaste = useOnPaste({ contentRef, simplePath, transient })
  const onCopy = useOnCopy({ thoughtId })
  const onCut = useOnCut()
  /** Flushes edits and updates certain state variables on blur. */
  const onBlur: FocusEventHandler<HTMLElement> = useCallback(
    e => {
      throttledChangeRef.current.flush()

      // update the ContentEditable if the new scrubbed value is different (i.e. stripped, space after emoji added, etc)
      // they may intentionally become out of sync during editing if the value is modified programmatically (such as trim) in order to avoid reseting the caret while the user is still editing
      // oldValueRef.current is the latest value since throttledChangeRef was just flushed
      if (contentRef.current?.innerHTML !== oldValueRef.current) {
        // remove the invalid state error, remove invalid-option class, and reset editable html
        dispatch((dispatch, getState) => {
          const state = getState()
          if (state.invalidState) {
            invalidStateError(null)
          }
        })
        contentRef.current!.innerHTML = oldValueRef.current
      }

      // if we know that the focus is changing to another editable or note then do not set editing to false
      // (does not work when clicking a bullet as it is set to null)
      const isRelatedTargetEditableOrNote =
        e.relatedTarget &&
        ((e.relatedTarget as Element).hasAttribute?.('data-editable') ||
          !!(e.relatedTarget as Element).querySelector('[aria-label="note-editable"]'))

      if (isRelatedTargetEditableOrNote) return

      // detect speech-to-text
      // needs to be deferred to the next tick, otherwise causes store.getState() to be invoked in a reducer (???)
      if (value.split(/<div>/g).length > 1) {
        setTimeout(() => dispatch(importSpeechToText({ simplePath, value: (e.target as HTMLInputElement).value })))
      }

      // reset editingValue on mobile if we have really blurred to avoid a spurious duplicate thought error (#895)
      // if enabled on desktop, it will break "clicking a bullet, the caret should move to the beginning of the thought" test)
      if (isTouch) {
        editingValueStore.update(null)
      }
      // temporary states such as duplicate error states and cursorCleared are reset on blur
      dispatch(cursorCleared({ value: false }))

      if (isTouch) {
        dispatch(keyboardOpenActionCreator({ value: false }))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simplePath],
  )

  /**
   * Sets the cursor on focus.
   * Prevented by touchend event above for hidden thoughts.
   */
  const onFocus = useCallback(
    () => {
      /**
       * On iOS, a long press between 415–650ms will trigger onFocus even when preventDefault is called in touchend, thus opening the virtual keyboard on top of the Command Center. There appears to be no way to prevent focus in this case. Therefore, we clear the selection and disable edit mode manually as soon as the focus triggers.
       *
       * Unfortunatly, doing this synchronously results in 1) iOS Writing Tools getting stuck open, and 2) the selection gets restored after the Command Center is closed (presumably because state.isKeyboardOpen is incorrectly set to true at some point). Clearing the selection after two animation frames fixes the issue.
       *
       * See: https://github.com/cybersemics/em/issues/3387.
       * */
      if (isTouch && isSafari()) {
        dispatch((dispatch, getState) => {
          const state = getState()
          if (state.showCommandCenter) {
            selection.clear()
            dispatch(keyboardOpenActionCreator({ value: false }))
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                selection.clear()
                dispatch(keyboardOpenActionCreator({ value: false }))
              })
            })
          }
        })
      }

      if (suppressFocusStore.getState()) return

      // Update editingValueUntrimmedStore with the current value
      editingValueUntrimmedStore.update(value)

      dispatch((dispatch, getState) => {
        const { longPress } = getState()
        if (longPress === LongPressState.Inactive) {
          setCursorOnThought({ isKeyboardOpen: true })
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, setCursorOnThought],
  )

  /**
   * Shared on tap logic dispatched after both click and touchend.
   * Checks long-press, multicursor, disabled, and visibility to decide whether to set the cursor.
   */
  const handleTapBehavior = useCallback(
    (e: MouseEvent | TouchEvent) => {
      // When MultiGesture is below the gesture threshold it is possible that onClick and onTouchEnd
      // both trigger. Prevent handleTapBehavior from running a second time via touchend in that case.
      // https://github.com/cybersemics/em/issues/1268
      if (e.type === 'touchend' && globals.touching && e.cancelable) {
        e.preventDefault()
      }

      dispatch((dispatch, getState) => {
        const state = getState()

        // If long press is in progress, don't allow the editable to receive focus or iOS Safari will scroll it.
        if (state.longPress !== LongPressState.Inactive) {
          e.preventDefault()
          return
        }

        if (
          // disable editing when multicursor is enabled
          hasMulticursorSelector(state) ||
          disabled ||
          // do not set cursor on hidden thought
          // dragInProgress: not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
          (!globals.touching && (!editingOrOnCursor || !isVisible))
        ) {
          e.preventDefault()

          if (!isVisible) {
            selection.clear()

            // close all popups when clicking on a thought
            dispatch(toggleDropdown())
          } else {
            setCursorOnThought()
          }
        }
      })
    },
    [disabled, dispatch, editingOrOnCursor, isVisible, setCursorOnThought],
  )

  /** Registers native event listeners for tap behavior (click and touchend). */
  useEffect(() => {
    const editable = contentRef.current
    if (!editable) return

    /** Sets the cursor on the thought on click. Handles hidden elements, drags, and editing mode. */
    const onClick = (e: MouseEvent) => {
      // If CMD/CTRL is pressed, don't focus the editable.
      const isMultiselectClick = isMac ? e.metaKey : e.ctrlKey
      if (isMultiselectClick) {
        e.preventDefault()
        return
      }

      handleTapBehavior(e)
    }

    /** Handles touchend for haptics and tap behavior. */
    const onTouchEnd = (e: TouchEvent) => {
      haptics.light()
      handleTapBehavior(e)
    }

    editable.addEventListener('click', onClick)
    editable.addEventListener('touchend', onTouchEnd, { passive: false })

    return () => {
      editable.removeEventListener('click', onClick)
      editable.removeEventListener('touchend', onTouchEnd)
    }
  }, [contentRef, editingOrOnCursor, hasMulticursor, handleTapBehavior])

  return (
    <ContentEditable
      disabled={disabled}
      stopDragOver={stopDragOver}
      innerRef={contentRef}
      aria-label={'editable-' + head(path)}
      data-editable
      data-placeholder-bold={placeholderCommandState?.bold || undefined}
      data-placeholder-code={placeholderCommandState?.code || undefined}
      data-placeholder-italic={placeholderCommandState?.italic || undefined}
      data-placeholder-strikethrough={placeholderCommandState?.strikethrough || undefined}
      data-placeholder-underline={placeholderCommandState?.underline || undefined}
      className={cx(editableRecipe(), className)}
      html={
        value === EM_TOKEN
          ? '<b>em</b>'
          : // render as empty string during temporary clear state
            // see: /actions/cursorCleared
            isCursorCleared
            ? ''
            : isEditing
              ? value
              : (childrenLabel ?? value)
      }
      placeholder={placeholder}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={onChangeHandler}
      onCopy={onCopy}
      onCut={e => {
        // flush the last edit, otherwise if cut occurs in quick succession the new value can be overwritten by the throttled change
        throttledChangeRef.current?.flush()

        onCut(e)
      }}
      onPaste={e => {
        // flush the last edit, otherwise if paste occurs in quick succession the pasted value can be overwritten by the throttled change
        throttledChangeRef.current?.flush()

        onPaste(e)
      }}
      // iOS Safari delays event handling in case the DOM is modified during setTimeout inside an event handler,
      // unless it is given a hint that the element is some sort of form control
      role='button'
      style={contentEditableStyle}
    />
  )
}

const EditableMemo = React.memo(Editable)
EditableMemo.displayName = 'Editable'

export default EditableMemo
