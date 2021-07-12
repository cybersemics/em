import _ from 'lodash'
import { unescape } from 'html-escaper'
import {
  htmlToJson,
  createId,
  getTextContentFromHTML,
  head,
  importJSON,
  isRoot,
  parentOf,
  pathToContext,
  textToHtml,
  reducerFlow,
  roamJsonToBlocks,
  strip,
  validateRoam,
} from '../util'
import { editThought, setCursor, updateThoughts } from '../reducers'
import { getAllChildren, rankThoughtsFirstMatch, simplifyPath, rootedParentOf } from '../selectors'
import { Path, SimplePath, Timestamp } from '../types'
import { State } from '../util/initialState'
import newThought from './newThought'
import collapseContext from './collapseContext'
import sanitize from 'sanitize-html'
import { getSessionId } from '../util/sessionManager'
import { ALLOWED_ATTRIBUTES, ALLOWED_TAGS, HOME_PATH } from '../constants'

// a list item tag
const regexpListItem = /<li(?:\s|>)/gim

interface Options {
  path?: Path
  text: string
  lastUpdated?: Timestamp
  preventSetCursor?: boolean
  rawDestValue?: string
  skipRoot?: boolean
  updatedBy?: string
}

/** Imports thoughts from html or raw text.
 *
 * @param lastUpdated       Set the lastUpdated timestamp on the imported thoughts. Default: now.
 * @param preventSetCursor  Prevents the default behavior of setting the cursor to the last thought at the first level.
 * @param rawDestValue      When pasting after whitespace, e.g. Pasting "b" after "a ", the normal destValue has already been trimmed, which would result in "ab". We need to pass the untrimmed.destination value in so that it can be trimmed after concatenation.
 * @param skipRoot          See importHtml @param.
 */
const importText = (
  state: State,
  { path, text, lastUpdated, preventSetCursor, rawDestValue, skipRoot, updatedBy = getSessionId() }: Options,
): State => {
  const isRoam = validateRoam(text)

  path = path || HOME_PATH
  const simplePath = simplifyPath(state, path)
  const context = pathToContext(simplePath)
  const convertedText = isRoam ? text : textToHtml(text)
  const numLines = (convertedText.match(regexpListItem) || []).length
  const destThought = head(path)
  const destValue = rawDestValue || destThought.value

  // if we are only importing a single line of html, then simply modify the current thought
  if (numLines <= 1 && !isRoam && !isRoot(path)) {
    const textNormalized = strip(convertedText, { preserveFormatting: true })

    // get the range if there is one so that we can import over the selected html
    const selection = window.getSelection()
    const [startOffset, endOffset] =
      selection && selection.rangeCount > 0
        ? (() => {
            const range = selection.getRangeAt(0)
            const offsets = [range.startOffset, range.endOffset]
            range.collapse()
            return offsets
          })()
        : [0, 0]

    // insert the textNormalized into the destValue in the correct place
    // trim after concatenating in case destValue has whitespace

    const left = (destValue.slice(0, startOffset) + textNormalized).trimLeft()
    const right = destValue.slice(endOffset).trimRight()
    const newValue = left + right

    const offset = getTextContentFromHTML(left).length

    return reducerFlow([
      editThought({
        oldValue: destValue,
        newValue,
        context: rootedParentOf(state, pathToContext(path)),
        path: simplePath,
      }),

      !preventSetCursor && path
        ? setCursor({
            path: [...parentOf(path), { ...destThought, value: newValue }],
            offset,
          })
        : null,
    ])(state)
  } else {
    // Closed incomplete tags, preserve only allowed tags and attributes and decode the html.
    const sanitizedConvertedText = unescape(
      sanitize(convertedText, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: ALLOWED_ATTRIBUTES,
        disallowedTagsMode: 'recursiveEscape',
      }),
    )

    const json = isRoam ? roamJsonToBlocks(JSON.parse(sanitizedConvertedText)) : htmlToJson(sanitizedConvertedText)

    const uuid = createId()

    const isDestContextEmpty = getAllChildren(state, context).length === 0

    /** Check if destination's parent context has more than one children. */
    const isDestParentContextEmpty = () => getAllChildren(state, rootedParentOf(state, context)).length <= 1

    const destEmpty = destThought.value === '' && isDestContextEmpty

    const shouldImportIntoDummy = destEmpty ? !isDestParentContextEmpty() : !isDestContextEmpty

    // Note: Create a dummy thought and then import new thoughts into its context and then collpase it . Since collapse uses moveThought it merges imported thoughts.
    const updatedState = shouldImportIntoDummy
      ? newThought(state, {
          at: simplePath,
          insertNewSubthought: true,
          value: uuid,
        })
      : state

    /**
     * Returns destination path.
     */
    const getDestinationPath = () => {
      if (!shouldImportIntoDummy) return simplePath
      const newDummyThought = getAllChildren(updatedState, context).find(child => child.value === uuid)
      return (newDummyThought ? [...simplePath, newDummyThought] : simplePath) as SimplePath
    }

    const newDestinationPath = getDestinationPath()

    const imported = importJSON(updatedState, newDestinationPath, json, { lastUpdated, skipRoot, updatedBy })

    /** Set cursor to the last imported path. */
    const setLastImportedCursor = (state: State) => {
      const lastImportedContext = pathToContext(imported.lastImported)

      /** Get last iumported cursor after using collapse. */
      const getLastImportedAfterCollapse = () => {
        const cursorContextHead = lastImportedContext.slice(0, newDestinationPath.length - (destEmpty ? 2 : 1))
        const cursorContextTail = lastImportedContext.slice(newDestinationPath.length)
        return [...cursorContextHead, ...cursorContextTail]
      }

      const newCursor = rankThoughtsFirstMatch(
        state,
        shouldImportIntoDummy ? getLastImportedAfterCollapse() : lastImportedContext,
      )

      return setCursor(state, {
        path: newCursor,
      })
    }

    const parentOfDestination = parentOf(newDestinationPath)

    return reducerFlow([
      updateThoughts(imported),
      // set cusor to destination path's parent after collapse unless it's em or cusor set is prevented.
      shouldImportIntoDummy ? collapseContext({ deleteCursor: true, at: newDestinationPath }) : null,
      // if original destination has empty then collapse once more.
      shouldImportIntoDummy && destEmpty ? collapseContext({ deleteCursor: true, at: parentOfDestination }) : null,
      // restore the selection to the last imported thought on the first level
      // Note: Since collapseContext behavior sets cursor to the first children, we need to set cursor back to the old cursor if preventSetCursor is true.
      !preventSetCursor
        ? setLastImportedCursor
        : setCursor({
            path: state.cursor,
          }),
    ])(updatedState)
  }
}

export default _.curryRight(importText)
