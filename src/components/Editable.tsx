import _ from 'lodash'
import React, { useEffect, useRef } from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import { unescape } from 'html-escaper'
import classNames from 'classnames'
import { alert, cursorBack, editing, error, existingThoughtChange, importText, render, setCursor, setEditingValue, setInvalidState, tutorialNext, newThought } from '../action-creators'
import { isTouch, isSafari } from '../browser'
import globals from '../globals'
import { store } from '../store'
import ContentEditable, { ContentEditableEvent } from './ContentEditable'
import { shortcutEmitter } from '../shortcuts'
import { Connected, Context, Path, SimplePath, TutorialChoice } from '../types'

// constants
import {
  EDIT_THROTTLE,
  EM_TOKEN,
  MODIFIER_KEYS,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../constants'

// util
import {
  addEmojiSpace,
  asyncFocus,
  clearSelection,
  parentOf,
  ellipsize,
  ellipsizeUrl,
  equalPath,
  hashContext,
  head,
  headValue,
  isDivider,
  isElementHiddenByAutoFocus,
  isHTML,
  isURL,
  pathToContext,
  setSelection,
  strip,
} from '../util'

// selectors
import {
  attributeEquals,
  getContexts,
  getSetting,
  getStyle,
  getThought,
  getAllChildren,
  hasChild,
  isContextViewActive,
  rootedParentOf,
} from '../selectors'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

// eslint-disable-next-line jsdoc/require-jsdoc
const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

const asyncFocusThrottled = _.throttle(asyncFocus, 100)

/** Add position:absolute to toolbar elements in order to fix Safari position:fixed browser behavior when keyboard is up. */
const makeToolbarPositionFixed = () => {
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  const rightArrow = document.getElementById('right-arrow') as HTMLElement
  const leftArrow = document.getElementById('left-arrow') as HTMLElement
  Array.from([hamburgerMenu, toolbar, rightArrow, leftArrow]).forEach(el => {
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
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  const rightArrow = document.getElementById('right-arrow') as HTMLElement
  const leftArrow = document.getElementById('left-arrow') as HTMLElement
  Array.from([hamburgerMenu, toolbar, rightArrow, leftArrow]).forEach(el => {
    if (!el) return // hamburger menu and toolbar are not rendered during tutorial
    el.style.position = 'fixed'
    el.style.overflowX = ''
    el.style.top = ''
  })
}
/** Update position of toolbar elements while scrolling in order to show them always on top. */
const updateToolbarPositionOnScroll = () => {
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  Array.from([hamburgerMenu, toolbar]).forEach(el => {
    if (!el) return // hamburger menu and toolbar are not rendered during tutorial
    el.style.top = `${window.scrollY}px`
  })
}

interface EditableProps {
  path: Path,
  cursorOffset?: number | null,
  disabled?: boolean,
  isEditing?: boolean,
  rank: number,
  showContexts?: boolean,
  style?: React.CSSProperties,
  simplePath: SimplePath,
  /* If transient is true:
    1. Instead of calling exisitingThoughtChange, it calls newThought to add the given child to the state.
    2. It also sets focus to itself on render.
  */
  transient?: boolean,
  onKeyDownAction?: () => void,
}

interface Alert {
  type: 'alert',
  value: string | null,
  alertType: string,
}

/** Toggle duplication alert. Use closure for storing timeoutId in order to cancel dispatching alert if it's necessary. */
const duplicateAlertToggler = () => {
  let timeoutId: number | undefined // eslint-disable-line fp/no-let
  return (show: boolean, dispatch: Dispatch<Alert>) => {
    if (show) {
      timeoutId = window.setTimeout(() => {
        dispatch(alert('Duplicate thoughts are not allowed within the same context.', { alertType: 'duplicateThoughts' }))
        timeoutId = undefined
      }, 2000)
      return
    }
    if (timeoutId) {
      window.clearTimeout(timeoutId)
      timeoutId = undefined
    }

    setTimeout(() => {
      if (store.getState().alert && store.getState().alert?.alertType === 'duplicateThoughts') {
        dispatch(alert(null, { alertType: 'duplicateThoughts' }))
      }
    })
  }
}

const showDuplicationAlert = duplicateAlertToggler()

/**
 * An editable thought with throttled editing.
 * Use rank instead of headRank(simplePath) as it will be different for context view.
 */
const Editable = ({ disabled, isEditing, simplePath, path, cursorOffset, showContexts, rank, style, onKeyDownAction, dispatch, transient }: Connected<EditableProps>) => {
  const state = store.getState()
  const thoughts = pathToContext(simplePath)
  const value = head(showContexts ? parentOf(thoughts) : thoughts) || ''
  const readonly = hasChild(state, thoughts, '=readonly')
  const uneditable = hasChild(state, thoughts, '=uneditable')
  const context = showContexts && thoughts.length > 2 ? parentOf(parentOf(thoughts))
    : !showContexts && thoughts.length > 1 ? parentOf(thoughts)
    : state.rootContext
  const childrenOptions = getAllChildren(state, [...context, '=options'])
  const options = childrenOptions.length > 0 ?
    childrenOptions.map(child => child.value.toLowerCase())
    : null
  const isTableColumn1 = attributeEquals(store.getState(), context, '=view', 'Table')
  // store the old value so that we have a transcendental head when it is changed
  const oldValueRef = useRef(value)
  const editableNonceRef = useRef(state.editableNonce)

  useEffect(() => {
    editableNonceRef.current = state.editableNonce
  }, [state.editableNonce])

  const thought = getThought(state, value)
  const childrenLabel = getAllChildren(state, [...thoughts, '=label'])

  // store ContentEditable ref to update DOM without re-rendering the Editable during editing
  const contentRef = React.useRef<HTMLInputElement>(null)
  if (contentRef.current) {
    contentRef.current.style.opacity = '1.0'
  }

  // =style attribute on the thought itself
  const styleAttr = getStyle(state, thoughts)

  /** Toggle invalid-option class using contentRef. */
  const setContentInvalidState = (value: boolean) =>
    contentRef.current && contentRef.current.classList[value ? 'add' : 'remove']('invalid-option')

  // side effect to set old value ref to head value from updated simplePath.
  useEffect(() => {
    oldValueRef.current = headValue(simplePath)
  }, [headValue(simplePath)])

  useEffect(() => {
    // set value to old value
    oldValueRef.current = value
  }, [simplePath])

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

    const pathLive = cursor && isEditing
      ? parentOf(path).concat(head(showContexts ? parentOf(cursor) : cursor))
      : path

    dispatch(setCursor({
      cursorHistoryClear: true,
      editing,
      // set offset to null to prevent setSelection on next render
      // to use the existing offset after a user clicks or touches the screent
      // when cursor is changed through another method, such as cursorDown, offset will be reset
      offset: null,
      path: pathLive,
    }))
  }

  /**
   * Dispatches existingThoughtChange and has tutorial logic.
   * Debounced from onChangeHandler.
   * Since variables inside this function won't get updated between re-render so passing latest context, rank etc as params.
   */
  const thoughtChangeHandler = (newValue: string, { context, showContexts, rank, simplePath }: { context: Context, showContexts?: boolean, rank: number, simplePath: Path }) => {
    // Note: Don't update innerHTML of contentEditable here. Since thoughtChangeHandler may be debounced, it may cause cause contentEditable to be out of sync.
    invalidStateError(null)

    // make sure to get updated state
    const state = store.getState()

    const oldValue = oldValueRef.current

    const thought = getThought(state, oldValue)

    if (transient) {
      dispatch(newThought({
        at: rootedParentOf(state, path),
        value: newValue,
      }))
      return
    }

    if (thought) {

      dispatch(existingThoughtChange({
        context,
        showContexts,
        oldValue,
        newValue,
        rankInContext: rank,
        path: simplePath as SimplePath
      }))

      // rerender so that triple dash is converted into divider
      // otherwise nothing would be rerendered because the thought is still being edited
      if (isDivider(newValue)) {
        dispatch(render())

        // remove selection so that the focusOffset does not cause a split false positive in newThought
        clearSelection()
      }

      // store the value so that we have a transcendental head when it is changed
      oldValueRef.current = newValue

      const tutorialChoice = +(getSetting(state, 'Tutorial Choice') || 0) as TutorialChoice
      const tutorialStep = +(getSetting(state, 'Tutorial Step') || 1)
      if (newValue && (
        (
          Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1_PARENT &&
          newValue.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()
        ) || (
          Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2_PARENT &&
          newValue.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()
        ) || (
          (
            Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1 ||
            Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2
          ) &&
          newValue.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()
        )
      )) {
        dispatch(tutorialNext({}))
      }
    }
  }

  // using useRef hook to store throttled function so that it can persist even between component re-renders, so that throttle.flush method can be used properly
  const throttledChangeRef = useRef(_.throttle(thoughtChangeHandler, EDIT_THROTTLE, { leading: false }))

  /** Set the selection to the current Editable at the cursor offset. */
  const setSelectionToCursorOffset = () => {
    if (contentRef.current) {
      setSelection(contentRef.current, { offset: cursorOffset || state.cursorOffset || 0 })
    }
  }

  useEffect(() => {
    const { editing, noteFocus, dragHold } = state

    // focus on the ContentEditable element if editing os on desktop
    const editMode = !isTouch || editing

    // if there is no browser selection, do not manually call setSelection as it does not preserve the cursor offset. Instead allow the default focus event.
    const cursorWithoutSelection = state.cursorOffset !== null || !window.getSelection()?.focusNode

    // if the selection is at the beginning of the thought, ignore cursorWithoutSelection and allow the selection to be set
    // otherwise clicking on empty space to activate cursorBack will not set the selection properly on desktop
    // disable on mobile to avoid infinite loop (#908)
    const isAtBeginning = !isTouch && window.getSelection()?.focusOffset === 0

    /**
     * Note: There are a lot of different values that determine if setSelection is called!
     * You may need to inspect them if something goes wrong.
     */
    // if (isEditing) {
    //   const { isCollapsed, focusOffset, focusNode } = window.getSelection() || {}
    //   console.info({
    //     thoughts,
    //     transient,
    //     editMode,
    //     isEditing,
    //     contentRef: !!contentRef.current,
    //     noFocusNode: !noteFocus && (cursorOffset !== null || !window.getSelection()?.focusNode) && !dragHold,
    //     '!dragHold': dragHold,
    //     '!noteFocus': noteFocus,
    //     cursorOffset: cursorOffset !== null,
    //     isCollapsed,
    //     focusOffset,
    //     focusNode: !!focusNode,
    //   })
    // }

    // allow transient editable to have focus on render
    if (transient || (
      isEditing &&
      editMode &&
      !noteFocus &&
      contentRef.current &&
      (cursorWithoutSelection || isAtBeginning) &&
      !dragHold
    )) {
      /*
        When a new thought is created, the Shift key should be on when Auto-Capitalization is enabled.
        On Mobile Safari, Auto-Capitalization is broken if the selection is set synchronously (#999).
        Only breaks on Enter or Backspace, not gesture. Even stranger, the issue only showed up when newThought was converted to a reducer (ecc3b3be).
        For some reason, setTimeout fixes it.
      */
      if (isTouch && isSafari()) {
        // asyncFocus needs to be throttled otherwise it causes an infinite loop (#908).
        asyncFocusThrottled()
        setTimeout(setSelectionToCursorOffset)
      }
      else {
        setSelectionToCursorOffset()
      }
    }

    /** Flushes pending edits. */
    const flush = () => throttledChangeRef.current.flush()
    shortcutEmitter.on('shortcut', flush)

    // flush edits and remove handler on unmount
    return () => {
      throttledChangeRef.current.flush()
      shortcutEmitter.off('shortcut', flush)
      showDuplicationAlert(false, dispatch)
    }
  }, [isEditing, cursorOffset, state.dragInProgress])

  /** Performs meta validation and calls thoughtChangeHandler immediately or using throttled reference. */
  const onChangeHandler = (e: ContentEditableEvent) => {

    // make sure to get updated state
    const state = store.getState()

    // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
    const oldValue = oldValueRef.current
    const newValue = e.target ? addEmojiSpace(unescape(strip(e.target.value, { preserveFormatting: true }))) : oldValue

    // TODO: Disable keypress
    // e.preventDefault() does not work
    // disabled={readonly} removes contenteditable property

    dispatch(setEditingValue(newValue))

    if (newValue === oldValue) {
      if (contentRef.current) {
        contentRef.current.style.opacity = '1.0'
      }
      showDuplicationAlert(false, dispatch)

      if (readonly || uneditable || options) invalidStateError(null)

      // if we cancel the edit, we have to cancel pending its
      // this can occur for example by editing a value away from and back to its
      throttledChangeRef.current.cancel()

      return
    }

    const oldValueClean = oldValue === EM_TOKEN ? 'em' : ellipsize(oldValue)

    const thoughtsInContext = getAllChildren(state, context)
    const hasDuplicate = newValue !== '' && thoughtsInContext.some(thought => thought.value === newValue)
    if (hasDuplicate) {
      showDuplicationAlert(true, dispatch)
      throttledChangeRef.current.cancel() // see above
      if (contentRef.current) {
        contentRef.current.style.opacity = '0.5'
      }
      return
    }
    else {
      if (contentRef.current) {
        contentRef.current.style.opacity = '1.0'
      }
      showDuplicationAlert(false, dispatch)
    }

    if (readonly) {
      dispatch(error({ value: `"${ellipsize(oldValueClean)}" is read-only and cannot be edited.` }))
      throttledChangeRef.current.cancel() // see above
      return
    }
    else if (uneditable) {
      dispatch(error({ value: `"${ellipsize(oldValueClean)}" is uneditable.` }))
      throttledChangeRef.current.cancel() // see above
      return
    }
    else if (options && !options.includes(newValue.toLowerCase())) {
      invalidStateError(newValue)
      throttledChangeRef.current.cancel() // see above
      return
    }

    const newNumContext = getContexts(state, newValue).length
    const isNewValueURL = isURL(newValue)

    const contextLengthChange = newNumContext > 0 || newNumContext !== getContexts(state, oldValueRef.current).length - 1
    const urlChange = isNewValueURL || isNewValueURL !== isURL(oldValueRef.current)

    const isEmpty = newValue.length === 0

    // safari adds <br> to empty contenteditables after editing, so strip them out
    // make sure empty thoughts are truly empty'
    if (isEmpty && contentRef.current) {
      contentRef!.current.innerHTML = newValue
    }

    // run the thoughtChangeHandler immediately if superscript changes or it's a url (also when it changes true to false)
    if (transient || contextLengthChange || urlChange || isEmpty || isDivider(newValue)) {
      // update new supercript value and url boolean
      throttledChangeRef.current.flush()
      thoughtChangeHandler(newValue, { context, showContexts, rank, simplePath })
    }
    else throttledChangeRef.current(newValue, { context, showContexts, rank, simplePath })
  }

  /** Imports text that is pasted onto the thought. */
  const onPaste = (e: React.ClipboardEvent) => {

    const plainText = e.clipboardData.getData('text/plain')
    const htmlText = e.clipboardData.getData('text/html')

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
      const path = cursor && equalPath(cursor, simplePath)
        ? cursor
        : simplePath

      // text/plain may contain text that ultimately looks like html (contains <li>) and should be parsed as html
      // pass the untrimmed old value to importText so that the whitespace is not loss when combining the existing value with the pasted value
      const rawDestValue = strip(contentRef.current!.innerHTML, { preventTrim: true })

      // If transient first add new thought and then import the text
      if (transient) {
        dispatch(newThought({
          at: rootedParentOf(state, path),
          value: '',
        }))
      }

      dispatch(importText({
        path,
        text: isHTML(plainText)
          ? plainText
          : htmlText || plainText,
        rawDestValue,
      }))

      // TODO: When importText was converted to a reducer, it no longer reducers newValue
      // if (newValue) oldValueRef.current = newValue
    }
  }

  /** Flushes edits and updates certain state variables on blur. */
  const onBlur = () => {

    dispatch(setEditingValue(null))

    if (isTouch && isSafari()) {
      resetToolbarPosition()
      document.removeEventListener('scroll', updateToolbarPositionOnScroll)
    }

    const { invalidState } = state
    throttledChangeRef.current.flush()

    // reset rendered value to previous non-duplicate
    if (contentRef.current) {
      contentRef.current!.innerHTML = oldValueRef.current
      contentRef.current.style.opacity = '1.0'
      showDuplicationAlert(false, dispatch)
    }

    // on blur remove error, remove invalid-option class, and reset editable html
    if (invalidState) {
      invalidStateError(null)
      contentRef.current!.innerHTML = oldValueRef.current
    }

    // wait until the next render to determine if we have really blurred
    // otherwise editing may be incorrectly set to false when clicking on another thought from edit mode (which results in a blur and focus in quick succession)
    if (isTouch) {
      setTimeout(() => {
        // Set editing value to false if user exit editing mode by tapping on other elements other than editable.
        if (!window.getSelection()?.focusNode || !window.getSelection()?.focusNode?.parentElement?.classList.contains('editable')) {
          dispatch(editing({ value: false }))
        }
      })
    }
  }

  /**
   * Sets the cursor on focus.
   * Prevented by mousedown event above for hidden thoughts.
   */
  const onFocus = () => {

    if (isTouch && isSafari()) {
      makeToolbarPositionFixed()
      document.addEventListener('scroll', updateToolbarPositionOnScroll)
    }

    // get new state
    const { dragInProgress } = store.getState()

    if (!dragInProgress) {
      setCursorOnThought({ editing: true })
      dispatch(setEditingValue(value))
    }
  }

  /** Sets the cursor on the thought when the tap ends without a drag. */
  const onTap = (e: React.MouseEvent | React.TouchEvent) => {
    const state = store.getState()

    showContexts = showContexts || isContextViewActive(state, pathToContext(simplePath))

    const isHiddenByAutofocus = isElementHiddenByAutoFocus(e.target as HTMLElement)
    const editingOrOnCursor = state.editing || equalPath(path, state.cursor)

    if (disabled || (
      !globals.touching &&
      // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
      !state.dragInProgress &&
      !isHiddenByAutofocus &&
      !editingOrOnCursor
    )) {

      // prevent focus to allow navigation with mobile keyboard down
      e.preventDefault()
      setCursorOnThought()
    }
    else if (isHiddenByAutofocus) {
      e.preventDefault()
      dispatch(cursorBack())
    }
  }

  /**
   * Prevents onKeyDownAction call for shift, alt or ctrl keys.
   */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key in MODIFIER_KEYS) return
    onKeyDownAction!()
  }
  return <ContentEditable
    disabled={disabled}
    innerRef={contentRef}
    className={classNames({
      preventAutoscroll: true,
      editable: true,
      ['editable-' + hashContext(pathToContext(path), rank)]: true,
      empty: value.length === 0
    })}
    forceUpdate={editableNonceRef.current !== state.editableNonce}
    html={value === EM_TOKEN ? '<b>em</b>'
    : isEditing ? value
    : childrenLabel.length > 0
      ? childrenLabel[0].value
      : ellipsizeUrl(value)
    }
    placeholder={isTableColumn1 ? ''
    : thought && Date.now() - new Date(thought.lastUpdated).getTime() > EMPTY_THOUGHT_TIMEOUT ? 'This is an empty thought'
    : 'Add a thought'}
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
    onKeyDown={onKeyDownAction ? onKeyDown : undefined}
    style={{
      ...style, // style prop
      ...styleAttr, // style attribute
    }}
  />
}

export default connect()(Editable)
