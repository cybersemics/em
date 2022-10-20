import classNames from 'classnames'
import { unescape } from 'html-escaper'
import _ from 'lodash'
import React, { FocusEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { connect, useDispatch, useSelector } from 'react-redux'
import Connected from '../@types/Connected'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import TutorialChoice from '../@types/TutorialChoice'
import cursorCleared from '../action-creators/cursorCleared'
import editThought from '../action-creators/editThought'
import editingAction from '../action-creators/editing'
import error from '../action-creators/error'
import importText from '../action-creators/importText'
import insertMultipleThoughts from '../action-creators/insertMultipleThoughts'
import newThought from '../action-creators/newThought'
import setCursor from '../action-creators/setCursor'
import setEditingValue from '../action-creators/setEditingValue'
import setInvalidState from '../action-creators/setInvalidState'
import toggleColorPicker from '../action-creators/toggleColorPicker'
import tutorialNext from '../action-creators/tutorialNext'
import { isSafari, isTouch } from '../browser'
import {
  EDIT_THROTTLE,
  EM_TOKEN,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../constants'
import asyncFocus from '../device/asyncFocus'
import * as selection from '../device/selection'
import globals from '../globals'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getLexeme from '../selectors/getLexeme'
import getSetting from '../selectors/getSetting'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import { shortcutEmitter } from '../shortcuts'
import { store } from '../store'
import addEmojiSpace from '../util/addEmojiSpace'
import appendToPath from '../util/appendToPath'
import ellipsize from '../util/ellipsize'
import ellipsizeUrl from '../util/ellipsizeUrl'
import equalPath from '../util/equalPath'
import head from '../util/head'
import headId from '../util/headId'
import isDivider from '../util/isDivider'
import isHTML from '../util/isHTML'
import isURL from '../util/isURL'
import parentOf from '../util/parentOf'
import strip from '../util/strip'
import stripEmptyFormattingTags from '../util/stripEmptyFormattingTags'
import ContentEditable, { ContentEditableEvent } from './ContentEditable'
import useMultiline from './Editable/useMultiline'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

/** Stops propagation of an event. */
const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

/** Change position:fixed top nav to position:absolute in order to fix Safari position:fixed browser behavior when keyboard is up. */
const makeToolbarPositionFixed = () => {
  document.addEventListener('scroll', updateToolbarPosition)
  const alert = document.getElementsByClassName('alert')[0] as HTMLElement
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  const rightArrow = document.getElementById('right-arrow') as HTMLElement
  const leftArrow = document.getElementById('left-arrow') as HTMLElement
  Array.from([alert, hamburgerMenu, toolbar, rightArrow, leftArrow]).forEach(el => {
    if (!el) return // hamburger menu and toolbar are not rendered during tutorial
    el.style.position = 'absolute'
    el.style.overflowX = 'hidden'
    if (el !== rightArrow && el !== leftArrow) {
      el.style.top = `${window.scrollY}px`
    }
  })
}
/** Reset position:absolute of toolbar elements. */
const resetToolbarPosition = () => {
  document.removeEventListener('scroll', updateToolbarPosition)
  const alert = document.getElementsByClassName('alert')[0] as HTMLElement
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  const rightArrow = document.getElementById('right-arrow') as HTMLElement
  const leftArrow = document.getElementById('left-arrow') as HTMLElement
  Array.from([alert, hamburgerMenu, toolbar, rightArrow, leftArrow]).forEach(el => {
    if (!el) return // hamburger menu and toolbar are not rendered during tutorial
    el.style.position = 'fixed'
    el.style.overflowX = ''
    el.style.top = ''
  })
}
/** Update position of toolbar elements while scrolling in order to show them always on top. */
const updateToolbarPosition = () => {
  const alert = document.getElementsByClassName('alert')[0] as HTMLElement
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  Array.from([alert, hamburgerMenu, toolbar]).forEach(el => {
    if (!el) return // hamburger menu and toolbar are not rendered during tutorial
    el.style.top = `${window.scrollY}px`
  })
}

interface EditableProps {
  path: Path
  cursorOffset?: number | null
  disabled?: boolean
  isEditing?: boolean
  isVisible?: boolean
  rank?: number
  style?: React.CSSProperties
  simplePath: SimplePath
  /* If transient is true:
    1. Instead of calling exisitingThoughtChange, it calls newThought to add the given child to the state.
    2. It also sets focus to itself on render.
  */
  transient?: boolean
  onEdit?: (args: { path: Path; oldValue: string; newValue: string }) => void
  editing?: boolean | null
}

// track if a thought is blurring so that we can avoid an extra dispatch of setEditingValue in onFocus
// otherwise it can trigger unnecessary re-renders
// intended to be global, not local state
let blurring = false

/**
 * An editable thought with throttled editing.
 * Use rank instead of headRank(simplePath) as it will be different for context view.
 */
const Editable = ({
  cursorOffset,
  disabled,
  editing,
  isEditing,
  isVisible,
  onEdit,
  path,
  simplePath,
  style,
  transient,
}: Connected<EditableProps>) => {
  const state = store.getState()
  const dispatch = useDispatch()
  const thoughtId = head(simplePath)
  const parentId = head(rootedParentOf(state, simplePath))
  const readonly = findDescendant(state, thoughtId, '=readonly')
  const uneditable = findDescendant(state, thoughtId, '=uneditable')
  const optionsId = findDescendant(state, parentId, '=options')
  const childrenOptions = getAllChildrenAsThoughts(state, optionsId)
  const options = childrenOptions.length > 0 ? childrenOptions.map(thought => thought.value.toLowerCase()) : null
  const isTableColumn1 = attributeEquals(state, parentId, '=view', 'Table')
  // it is possible that the thought is deleted and the Editable is re-rendered before it unmounts, so guard against undefined thought
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath))?.value || '')
  const rank = useSelector((state: State) => getThoughtById(state, head(simplePath))?.rank || 0)
  const editableNonceRef = useRef(state.editableNonce)
  const fontSize = useSelector((state: State) => state.fontSize)
  // must re-render when noteFocus changes in order to set the selection
  const hasNoteFocus = useSelector((state: State) => state.noteFocus && equalPath(state.cursor, path))
  const isCursorCleared = useSelector((state: State) => isEditing && state.cursorCleared)
  // store the old value so that we have a transcendental head when it is changed
  const oldValueRef = useRef(value)
  const [isTapped, setIsTapped] = useState(false)

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

  useEffect(() => {
    editableNonceRef.current = state.editableNonce
  }, [state.editableNonce])

  const lexeme = getLexeme(state, value)
  const labelId = findDescendant(state, parentId, '=label')
  const childrenLabel = getAllChildrenAsThoughts(state, labelId)

  // store ContentEditable ref to update DOM without re-rendering the Editable during editing
  const contentRef = React.useRef<HTMLInputElement>(null)
  if (contentRef.current) {
    contentRef.current.style.opacity = '1.0'
  }

  const multiline = useMultiline(contentRef, simplePath, isEditing)

  /** Toggle invalid-option class using contentRef. */
  const setContentInvalidState = (value: boolean) =>
    contentRef.current && contentRef.current.classList[value ? 'add' : 'remove']('invalid-option')

  // side effect to set old value ref to head value from updated simplePath. Also update editing value, if it is different from current value.
  useEffect(() => {
    oldValueRef.current = value
    if (isEditing && selection.isThought() && state.editingValue !== value) {
      dispatch(setEditingValue(value))
    }
  }, [value])

  /** Set or reset invalid state. */
  const invalidStateError = (invalidValue: string | null) => {
    const isInvalid = invalidValue != null
    store.dispatch(error({ value: isInvalid ? `Invalid Value: "${invalidValue}"` : null }))
    setInvalidState(isInvalid)

    // the Editable cannot connect to state.invalidState, as it would re-render during editing
    // instead, we use setContentInvalidState to manipulate the DOM directly
    setContentInvalidState(isInvalid)
  }

  /** Set the cursor on the thought. */
  const setCursorOnThought = ({ editing }: { editing?: boolean } = {}) => {
    const { cursor, editing: editingMode } = store.getState() // use fresh state

    // do not set cursor if it is unchanged and we are not entering edit mode
    if ((!editing || editingMode) && equalPath(cursor, path)) return

    const isEditing = equalPath(cursor, path)

    const pathLive = cursor && isEditing ? appendToPath(parentOf(path), head(cursor)) : path

    dispatch(
      setCursor({
        cursorHistoryClear: true,
        editing,
        // set offset to null to prevent selection.set on next render
        // to use the existing offset after a user clicks or touches the screent
        // when cursor is changed through another method, such as cursorDown, offset will be reset
        offset: null,
        path: pathLive,
      }),
    )
  }

  /**
   * Dispatches editThought and has tutorial logic.
   * Debounced from onChangeHandler.
   * Since variables inside this function won't get updated between re-render so passing latest context, rank etc as params.
   */
  const thoughtChangeHandler = (newValue: string, { rank, simplePath }: { rank: number; simplePath: SimplePath }) => {
    // Note: Don't update innerHTML of contentEditable here. Since thoughtChangeHandler may be debounced, it may cause contentEditable to be out of sync.
    invalidStateError(null)

    // make sure to get updated state
    const state = store.getState()

    const oldValue = oldValueRef.current

    if (transient) {
      dispatch(
        newThought({
          at: rootedParentOf(state, path),
          value: newValue,
        }),
      )
      return
    }

    dispatch(
      editThought({
        oldValue,
        newValue,
        rankInContext: rank,
        path: simplePath,
      }),
    )

    if (isDivider(newValue)) {
      // remove selection so that the focusOffset does not cause a split false positive in newThought
      selection.clear()
    }

    // store the value so that we have a transcendental head when it is changed
    oldValueRef.current = newValue

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
          newValue.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()))
    ) {
      dispatch(tutorialNext({}))
    }

    onEdit?.({ path, oldValue, newValue })
  }

  // using useRef hook to store throttled function so that it can persist even between component re-renders, so that throttle.flush method can be used properly
  const throttledChangeRef = useRef(_.throttle(thoughtChangeHandler, EDIT_THROTTLE, { leading: false }))

  /** Set the selection to the current Editable at the cursor offset. */
  const setSelectionToCursorOffset = () => {
    // do not set the selection on hidden thoughts, otherwise it will cause a faulty focus event when switching windows
    // https://github.com/cybersemics/em/issues/1596
    if (style?.visibility === 'hidden') {
      selection.clear()
    } else {
      selection.set(contentRef.current, { offset: cursorOffset || state.cursorOffset || 0 })
    }
  }

  useEffect(() => {
    // Set editing to false after unmount
    return () => {
      const { cursor, editing } = store.getState()
      if (editing && equalPath(cursor, path)) {
        dispatch(editingAction({ value: false }))
      }
    }
  }, [])

  useEffect(() => {
    const { editing, noteFocus, dragHold } = state

    // focus on the ContentEditable element if editing os on desktop
    const editMode = !isTouch || editing

    // if there is no browser selection, do not manually call selection.set as it does not preserve the cursor offset. Instead allow the default focus event.
    const cursorWithoutSelection = state.cursorOffset !== null || !selection.isActive()

    // if the selection is at the beginning of the thought, ignore cursorWithoutSelection and allow the selection to be set
    // otherwise clicking on empty space to activate cursorBack will not set the selection properly on desktop
    // disable on mobile to avoid infinite loop (#908)
    const isAtBeginning = !isTouch && selection.offset() === 0

    // allow transient editable to have focus on render
    if (
      transient ||
      (isEditing &&
        editMode &&
        !noteFocus &&
        contentRef.current &&
        (cursorWithoutSelection || isAtBeginning) &&
        !dragHold &&
        !isTapped)
    ) {
      /*
        When a new thought is created, the Shift key should be on when Auto-Capitalization is enabled.
        On Mobile Safari, Auto-Capitalization is broken if the selection is set synchronously (#999).
        Only breaks on Enter or Backspace, not gesture. Even stranger, the issue only showed up when newThought was converted to a reducer (ecc3b3be).
        For some reason, setTimeout fixes it.
      */
      if (isTouch && isSafari()) {
        asyncFocus()
        setTimeout(setSelectionToCursorOffset)
      } else {
        setSelectionToCursorOffset()
      }
    }

    // // there are many different values that determine if we set the selection
    // // use this to help debug selection issues
    // else if (isEditing) {
    //   console.info('These values are false, preventing the selection from being set on', value)
    //   if (!editMode) console.info('  - editMode')
    //   if (!contentRef.current) console.info('  - contentRef.current')
    //   if (noteFocus) console.info('  - !noteFocus')
    //   if (!(cursorWithoutSelection || isAtBeginning)) console.info('  - cursorWithoutSelection || isAtBeginning')
    //   if (dragHold) console.info('  - !dragHold')
    //   if (isTapped) console.info('  - !isTapped')
    // }

    if (isTapped) {
      setIsTapped(false)
    }

    /** Flushes pending edits. */
    const flush = () => throttledChangeRef.current.flush()
    shortcutEmitter.on('shortcut', flush)

    // flush edits and remove handler on unmount
    return () => {
      throttledChangeRef.current.flush()
      shortcutEmitter.off('shortcut', flush)
      // showDuplicationAlert(false, dispatch)
    }
  }, [isEditing, cursorOffset, hasNoteFocus, state.dragInProgress, editing])

  /** Performs meta validation and calls thoughtChangeHandler immediately or using throttled reference. */
  const onChangeHandler = (e: ContentEditableEvent) => {
    // make sure to get updated state
    const state = store.getState()

    // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
    const oldValue = oldValueRef.current

    // If the target value (innerHTML) contains divs, then it is either Optical Character Recognition (OCR) or Speech-to-text (STT).
    // Only detect OCR into an empty thought, otherwise it will cause a false positive for STT with multiple newlines.
    // <div><br> only occurs in STT, so exclude it.
    // Note: Joining every line does not work well for multiple paragraphs or bulleted lists with multiline items. It may be better to not split or join newlines at all, and make the user explicitly execute a join or split command. This gives them the ability to manually split on paragraphs and then use the join command on each. Indentation is not preserved in OCR, so it is not possible to completely automate multi paragraph restoration.
    const ocrDetected = oldValue === '' && /<div>(?!<br>)/.test(e.target.value)

    const newValue = e.target
      ? stripEmptyFormattingTags(
          addEmojiSpace(
            unescape(
              // When paragraphs from books are scanned with OCR, the value will consist of separate lines (wrapped in <div>...</div>).
              // Therefore, when OCR is detected, join the lines together with spaes.
              // Otherwise the multiline STT handler in onBlur will separate them into separate thoughts.
              strip(ocrDetected ? e.target.value.replace(/<div>/g, ' ') : e.target.value, { preserveFormatting: true }),
            ),
          ),
        )
      : oldValue

    // TODO: Disable keypress
    // e.preventDefault() does not work
    // disabled={readonly} removes contenteditable property

    dispatch(setEditingValue(newValue))

    if (newValue === oldValue) {
      if (contentRef.current) {
        contentRef.current.style.opacity = '1.0'
      }

      if (readonly || uneditable || options) invalidStateError(null)

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
      dispatch(error({ value: `"${ellipsize(oldValueClean)}" is read-only and cannot be edited.` }))
      throttledChangeRef.current.cancel() // see above
      return
    } else if (uneditable) {
      dispatch(error({ value: `"${ellipsize(oldValueClean)}" is uneditable.` }))
      throttledChangeRef.current.cancel() // see above
      return
    } else if (options && !options.includes(newValue.toLowerCase())) {
      invalidStateError(newValue)
      throttledChangeRef.current.cancel() // see above
      return
    }

    const newNumContext = getContexts(state, newValue).length
    const isNewValueURL = isURL(newValue)

    const contextLengthChange =
      newNumContext > 0 || newNumContext !== getContexts(state, oldValueRef.current).length - 1
    const urlChange = isNewValueURL || isNewValueURL !== isURL(oldValueRef.current)

    const isEmpty = newValue.length === 0

    // Safari adds <br> to empty contenteditables after editing, so strip them out.
    // Make sure empty thoughts are truly empty.
    // Also update the ContentEditable with the joined OCR result, otherwise onBlur will split it into separate lines.
    if (contentRef.current && (isEmpty || ocrDetected)) {
      contentRef.current.innerHTML = newValue
    }

    // run the thoughtChangeHandler immediately if superscript changes or it's a url (also when it changes true to false)
    if (transient || contextLengthChange || urlChange || isEmpty || isDivider(newValue)) {
      // update new supercript value and url boolean
      throttledChangeRef.current.flush()
      thoughtChangeHandler(newValue, { rank, simplePath })
    } else throttledChangeRef.current(newValue, { rank, simplePath })
  }

  /** Imports text that is pasted onto the thought. */
  const onPaste = (e: React.ClipboardEvent) => {
    // mobile Safari copies URLs as 'text/uri-list' when the share button is used
    const plainText = e.clipboardData.getData('text/plain') || e.clipboardData.getData('text/uri-list')
    const htmlText = e.clipboardData.getData('text/html')

    // import raw thoughts: confirm before overwriting state
    if (
      typeof window !== 'undefined' &&
      plainText.startsWith(`{
  "thoughtIndex": {
    "__ROOT__": {`) &&
      !window.confirm('Import raw thought state? Current state will be overwritten.')
    ) {
      e.preventDefault()
      return
    }

    // pasting from mobile copy (e.g. Choose "Share" in Twitter and select "Copy") results in blank plainText and htmlText
    // the text will still be pasted if we do not preventDefault, it just won't get stripped of html properly
    // See: https://github.com/cybersemics/em/issues/286
    if (plainText || htmlText) {
      e.preventDefault()
      throttledChangeRef.current.flush()

      // import into the live thoughts
      // neither ref.current is set here nor can newValue be stored from onChange
      // not sure exactly why, but it appears that the DOM node has been removed before the paste handler is called
      const { cursor } = store.getState()
      const path = cursor && equalPath(cursor, simplePath) ? cursor : simplePath

      // text/plain may contain text that ultimately looks like html (contains <li>) and should be parsed as html
      // pass the untrimmed old value to importText so that the whitespace is not loss when combining the existing value with the pasted value
      const rawDestValue = strip(contentRef.current!.innerHTML, { preventTrim: true })

      // If transient first add new thought and then import the text
      if (transient) {
        dispatch(
          newThought({
            at: rootedParentOf(state, path),
            value: '',
          }),
        )
      }

      dispatch(
        importText({
          path,
          text: isHTML(plainText) ? plainText : htmlText || plainText,
          rawDestValue,
          // pass selection start and end for importText to replace (if the imported thoughts are one line)
          ...(selection.isActive() && !selection.isCollapsed()
            ? {
                replaceStart: selection.offsetStart()!,
                replaceEnd: selection.offsetEnd()!,
              }
            : null),
          // pass caret position to correctly track the last navigated point for caret
          // calculated on the basis of node type we are currently focused on. `state.cursorOffset` doesn't really keeps track of updated caret position when navigating within single thought. Hence selection.offset() is also used depending upon which node type we are on.
          caretPosition: (selection.isText() ? selection.offset() || 0 : state.cursorOffset) || 0,
        }),
      )

      // TODO: When importText was converted to a reducer, it no longer reducers newValue
      // if (newValue) oldValueRef.current = newValue
    }
  }

  /** Flushes edits and updates certain state variables on blur. */
  const onBlur: FocusEventHandler<HTMLElement> = useCallback(e => {
    blurring = true

    if (isTouch && isSafari()) {
      resetToolbarPosition()
    }

    const { invalidState } = state
    throttledChangeRef.current.flush()

    // update the ContentEditable if the new scrubbed value is different (i.e. stripped, space after emoji added, etc)
    // they may intentionally become out of sync during editing if the value is modified programmatically (such as trim) in order to avoid reseting the caret while the user is still editing
    // oldValueRef.current is the latest value since throttledChangeRef was just flushed
    if (contentRef.current?.innerHTML !== oldValueRef.current) {
      // remove the invalid state error, remove invalid-option class, and reset editable html
      if (invalidState) {
        invalidStateError(null)
      }
      contentRef.current!.innerHTML = oldValueRef.current
    }

    // if we know that the focus is changing to another editable or note then do not set editing to false
    // (does not work when clicking a bullet as it is set to null)
    const isRelatedTargetEditableOrNote =
      e.relatedTarget &&
      ((e.relatedTarget as Element).classList.contains('editable') ||
        (e.relatedTarget as Element).classList.contains('note-editable'))

    if (isRelatedTargetEditableOrNote) return

    // check for separate lines created via speech-to-text newlines
    // only after blur can we safely convert newlines to new thoughts without interrupting speeach-to-text
    const lines = (e.target as HTMLInputElement).value
      .split(/<div>/g)
      .map(line => line.replace('</div>', ''))
      .slice(1)

    // insert speech-to-text lines
    if (lines.length > 1) {
      // edit original thought to first line
      dispatch([
        editThought({
          oldValue: value,
          newValue: lines[0],
          rankInContext: rank,
          path: simplePath,
        }),
        // insert remaining lines
        insertMultipleThoughts({ simplePath, lines: lines.slice(1) }),
        // set editing to false again, since inserting thoughts enables edit mode
        // TODO: There is a call to setCursor with editing: true that invalidates this line
        editingAction({ value: false }),
      ])
    }

    // if related target is not editable wait until the next render to determine if we have really blurred
    // otherwise editing may be incorrectly set to false when clicking on another thought from edit mode (which results in a blur and focus in quick succession)
    setTimeout(() => {
      if (blurring) {
        blurring = false
        // reset editingValue on mobile if we have really blurred to avoid a spurious duplicate thought error (#895)
        // if enabled on desktop, it will break "clicking a bullet, the caret should move to the beginning of the thought" test)
        if (isTouch) {
          dispatch(setEditingValue(null))
        }
        // temporary states such as duplicate error states and cursorCleared are reset on blur
        dispatch(cursorCleared({ value: false }))
      }

      if (isTouch) {
        // Set editing value to false if user exits editing mode by tapping on a non-editable element.
        if (!selection.isThought()) {
          dispatch(editingAction({ value: false }))
        }
      }
    })
  }, [])

  /**
   * Sets the cursor on focus.
   * Prevented by mousedown event above for hidden thoughts.
   */
  const onFocus = useCallback(() => {
    // do not allow blur to setEditingValue when it is followed immediately by a focus
    blurring = false

    if (isTouch && isSafari()) {
      makeToolbarPositionFixed()
    }

    // get new state
    const { dragHold, dragInProgress } = store.getState()

    if (!dragHold && !dragInProgress) {
      setCursorOnThought({ editing: true })
      dispatch(setEditingValue(value))
    }
  }, [value, setCursorOnThought])

  /** Sets the cursor on the thought on mousedown or tap. Handles hidden elements, drags, and editing mode. */
  const onTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // stop propagation to prevent clickOnEmptySpace onClick handler in Content component
      if (e.nativeEvent instanceof MouseEvent) {
        e.stopPropagation()
      }
      // when the MultiGesture is below the gesture threshold it is possible that onTap and onMouseDown are both triggered
      // in this case, we need to prevent onTap from being called a second time via onMouseDown
      // https://github.com/cybersemics/em/issues/1268
      else if (globals.touching && e.cancelable) {
        e.preventDefault()
      }

      const state = store.getState()

      const editingOrOnCursor = state.editing || equalPath(path, state.cursor)

      if (
        disabled ||
        // dragInProgress: not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
        (!globals.touching && !state.dragInProgress && (!editingOrOnCursor || !isVisible))
      ) {
        // do not set cursor on hidden thought
        e.preventDefault()

        if (!isVisible) {
          selection.clear()

          if (state.showColorPicker) {
            dispatch(toggleColorPicker({ value: false }))
          }
        } else {
          // prevent focus to allow navigation with mobile keyboard down
          setCursorOnThought()
        }
      } else {
        // We need to know that user clicked the editable to not set caret programmatically, because caret will be already set by browser. Issue: #981
        setIsTapped(true)
      }
    },
    [disabled, isVisible, path],
  )

  // strip formatting tags for clearThought placeholder
  const valueStripped = isCursorCleared ? unescape(strip(value, { preserveFormatting: false })) : null
  const styleMemo = useMemo(
    () => ({
      // must match marginLeft of ThoughtAnnotation
      marginLeft: fontSize - 18,
      ...style,
    }),
    [fontSize, style],
  )

  return (
    <ContentEditable
      disabled={disabled}
      innerRef={contentRef}
      className={classNames({
        multiline,
        preventAutoscroll: true,
        editable: true,
        ['editable-' + headId(path)]: true,
        empty: value.length === 0,
      })}
      forceUpdate={editableNonceRef.current !== state.editableNonce}
      html={
        value === EM_TOKEN
          ? '<b>em</b>'
          : // render as empty string during temporary clear state
          // see: /reducers/cursorCleared
          isCursorCleared
          ? ''
          : isEditing
          ? value
          : childrenLabel.length > 0
          ? childrenLabel[0].value
          : ellipsizeUrl(value)
      }
      placeholder={
        isCursorCleared
          ? valueStripped || 'This is an empty thought'
          : isTableColumn1
          ? ''
          : lexeme && Date.now() - new Date(lexeme.lastUpdated).getTime() > EMPTY_THOUGHT_TIMEOUT
          ? 'This is an empty thought'
          : 'Add a thought'
      }
      // stop propagation to prevent default content onClick (which removes the cursor)
      onClick={stopPropagation}
      onTouchEnd={onTap}
      // must call onMouseDown on mobile since onTap cannot preventDefault
      // otherwise gestures and scrolling can trigger cursorBack (#1054)
      onMouseDown={onTap}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={onChangeHandler}
      onPaste={onPaste}
      style={styleMemo}
    />
  )
}

// Use connect to prevent Editable from being re-rendered when its parent Thought re-rerenders.
// TODO: Is there a better way?
export default connect()(Editable)
