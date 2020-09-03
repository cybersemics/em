import React, { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { isMobile } from '../browser'
import { store } from '../store.js'
import { attribute, hasChild, isContextViewActive } from '../selectors'
import { asyncFocus, selectNextEditable, setSelection, strip } from '../util'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { Child, Context, Path } from '../types'

/** Returns editable of the given node. */
const editableOfNode = (nodeKey: string) => {
  // @ts-ignore
  return document.getElementById(nodeKey).querySelector('.editable') as HTMLElement
}

/** Renders an editable note that modifies the content of the hidden =note attribute. */
const Note = ({ nodeKey, focusOnMount, context, thoughtsRanked, contextChain }: { nodeKey: string, focusOnMount?: boolean, context: Context, thoughtsRanked: Path, contextChain: Child[][] }) => {

  const state = store.getState()
  const hasNote = hasChild(state, context, '=note')

  if (!hasNote || isContextViewActive(state, context)) return null

  const dispatch = useDispatch()
  const noteRef: { current: HTMLElement | null } = useRef(null)
  const [justPasted, setJustPasted] = useState(false)
  const note = attribute(state, context, '=note')

  // side effect to handle first mount focus
  useEffect(() => {
    if (noteRef.current && focusOnMount) {
      setSelection(noteRef.current, { end: true })
      // set focus id back to null
      dispatch({
        type: 'setNoteFocusThoughtId',
        value: null
      })
    }
  }, [])

  /** Handles note keyboard shortcuts. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    // delete empty note
    // need to get updated note attribute (not the note in the outside scope)
    const note = attribute(store.getState(), context, '=note')

    // select thought
    if (e.key === 'Escape' || e.key === 'ArrowUp' || (e.metaKey && e.altKey && e.keyCode === 'N'.charCodeAt(0))) {
      e.stopPropagation()
      editableOfNode(nodeKey).focus()
      setSelection(editableOfNode(nodeKey), { end: true })
    }
    // delete empty note
    // (delete non-empty note is handled by delete shortcut, which allows mobile gesture to work)
    // note may be '' or null if the attribute child was deleted
    else if (e.key === 'Backspace' && !note) {
      e.stopPropagation() // prevent delete thought
      e.preventDefault()

      if (isMobile) {
        asyncFocus()
      }
      editableOfNode(nodeKey).focus()
      setSelection(editableOfNode(nodeKey), { end: true })

      dispatch({ type: 'deleteAttribute', context, key: '=note' })
    }
    else if (e.key === 'ArrowDown') {
      e.stopPropagation()
      e.preventDefault()
      selectNextEditable(editableOfNode(nodeKey))
    }
  }

  /** Updates the =note attribute when the note text is edited. */
  const onChange = (e: ContentEditableEvent) => {
    const value = justPasted
      // if just pasted, strip all HTML from value
      ? (setJustPasted(false), strip(e.target.value))
      // Mobile Safari inserts <br> when all text is deleted
      // Strip <br> from beginning and end of text
      : e.target.value.replace(/^<br>|<br>$/gi, '')

    dispatch({
      type: 'setAttribute',
      context,
      key: '=note',
      value
    })
  }

  /** Sets the cursor on the note's thought when then note is focused. */
  const onFocus = () => {
    dispatch({ type: 'setCursor', thoughtsRanked, contextChain, cursorHistoryClear: true, editing: false, noteFocus: true })
  }

  return <div className='note children-subheading text-note text-small' style={{ top: '4px' }}>
    <ContentEditable
      html={note || ''}
      innerRef={noteRef}
      placeholder='Enter a note'
      onKeyDown={onKeyDown}
      onChange={onChange}
      onPaste={() => {
        // set justPasted so onChange can strip HTML from the new value
        // the default onPaste behavior is maintained for easier caret and selection management
        setJustPasted(true)
      }}
      onFocus={onFocus}
    />
  </div>
}

export default Note
