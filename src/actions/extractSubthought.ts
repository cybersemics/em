import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import getThoughtById from '../selectors/getThoughtById'
import selectionOffsets from '../selectors/selectionOffsets'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import reducerFlow from '../util/reducerFlow'
import splitHtmlAtTextOffset from '../util/splitHtmlAtTextOffset'
import trimHtml from '../util/trimHtml'
import alert from './alert'
import editThought from './editThought'
import newThought from './newThought'

/** Extract the selection as child thought. */
export interface extractSubthoughtPayload {
  /** The character offset of the start of the selection within the cursor thought's value. */
  selectionStart: number
  /** The character offset of the end of the selection within the cursor thought's value. */
  selectionEnd: number
}

/** Returns true if two nodes are elements with the same tag name and identical attributes. */
const isMatchingElement = (a: ChildNode, b: ChildNode): boolean => {
  if (a.nodeType !== Node.ELEMENT_NODE || b.nodeType !== Node.ELEMENT_NODE) return false

  const elementA = a as HTMLElement
  const elementB = b as HTMLElement
  if (elementA.tagName !== elementB.tagName || elementA.attributes.length !== elementB.attributes.length) return false

  return Array.from(elementA.attributes).every(attribute => elementB.getAttribute(attribute.name) === attribute.value)
}

/** Recursively merges a node's adjacent children that have the same tag name and attributes. */
const mergeChildren = (parent: ChildNode): void => {
  let child = parent.firstChild

  while (child) {
    const next = child.nextSibling

    // move the next sibling's children into the current child, then re-check the current child against its new next sibling
    if (next && isMatchingElement(child, next)) {
      while (next.firstChild) child.appendChild(next.firstChild)
      next.remove()
      continue
    }

    mergeChildren(child)
    child = child.nextSibling
  }

  // merge adjacent text nodes
  parent.normalize()
}

/**
 * Merges adjacent tags that have the same tag name and attributes, e.g. `<b>Lorem </b><b>ipsum</b>` -> `<b>Lorem ipsum</b>`. Prevents duplicate formatting tags when HTML fragments are concatenated.
 *
 * @param htmlValue The source HTML.
 */
const mergeAdjacentTags = (htmlValue: string): string => {
  const div = document.createElement('div')
  div.innerHTML = htmlValue
  mergeChildren(div)
  return div.innerHTML
}

/** Splits a formatted value into the value with [selectionStart, removalEnd) removed and the extracted
 * [selectionStart, selectionEnd), with formatting tags re-balanced onto each part. */
const splitFormattedValue = (value: string, selectionStart: number, selectionEnd: number, removalEnd: number) => {
  // Split at an end offset first so that the left half can then be split at the start offset. The right half of a split cannot be re-split at the end offset, since its text offsets are relative to itself, not to the original value.
  const endSplit = splitHtmlAtTextOffset(value, selectionEnd)
  const removalSplit = removalEnd === selectionEnd ? endSplit : splitHtmlAtTextOffset(value, removalEnd)
  return {
    // merge the formatting tags that end up adjacent when the two halves are re-joined, e.g. <b>Lorem </b><b>dolor</b>
    newValue: trimHtml(mergeAdjacentTags(`${splitHtmlAtTextOffset(value, selectionStart).left}${removalSplit.right}`)),
    childValue: trimHtml(splitHtmlAtTextOffset(endSplit.left, selectionStart).right),
  }
}

/** Extract the given range of the cursor thought as a subthought. */
const extractSubthought = (state: State, { selectionStart, selectionEnd }: extractSubthoughtPayload): State => {
  const { cursor } = state
  if (!cursor) return state

  if (selectionStart === selectionEnd) {
    return alert(state, { value: 'No text selected to extract' })
  }

  const cursorThought = getThoughtById(state, head(cursor))

  if (!cursorThought) {
    console.warn('Cursor thought not found!')
    return state
  }

  const { value } = cursorThought
  const plainValue = getTextContentFromHTML(value)

  // Removing the selection would leave the whitespace on either side of it adjacent, rendering as a double space, so consume the trailing one along with the selection. The extracted child still ends at selectionEnd.
  const isPaddedBothSides = /\s/.test(plainValue[selectionStart - 1] ?? '') && /\s/.test(plainValue[selectionEnd] ?? '')
  const removalEnd = isPaddedBothSides ? selectionEnd + 1 : selectionEnd

  // A formatted value cannot be sliced by the selection offsets, since they are plain text offsets that do not line up with the indices of the markup, causing the slice to land in the middle of a tag (#4103). Split it as HTML instead. An unformatted value takes the fast path, avoiding the DOM entirely.
  const { newValue, childValue } =
    plainValue === value
      ? {
          newValue: `${value.slice(0, selectionStart)}${value.slice(removalEnd, value.length)}`.trim(),
          childValue: value.slice(selectionStart, selectionEnd),
        }
      : splitFormattedValue(value, selectionStart, selectionEnd, removalEnd)

  const reducers = [
    editThought({
      oldValue: value,
      newValue,
      path: simplifyPath(state, cursor),
      force: true,
      cursorOffset: state.cursorOffset != null ? selectionStart : undefined,
    }),
    newThought({ value: childValue, insertNewSubthought: true, preventSetCursor: true }),
  ]

  return reducerFlow(reducers)(state)
}

/**
 * Action-creator for extractSubthought. Reads the selection offsets and passes them to the reducer, which cannot read them
 * itself without reaching outside of state.
 */
export const extractSubthoughtActionCreator = (): Thunk => (dispatch, getState) => {
  const offsets = selectionOffsets(getState())
  if (!offsets) return

  dispatch({ type: 'extractSubthought', selectionStart: offsets.start, selectionEnd: offsets.end })
}

export default _.curryRight(extractSubthought)

// Register this action's metadata
registerActionMetadata('extractSubthought', {
  undoable: true,
})
