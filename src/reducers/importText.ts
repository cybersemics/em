import _ from 'lodash'
import { unescape } from 'html-escaper'
import {
  htmlToJson,
  createId,
  head,
  importJSON,
  initialState,
  isRoot,
  parentOf,
  pathToContext,
  textToHtml,
  reducerFlow,
  roamJsonToBlocks,
  strip,
  unroot,
  validateRoam,
} from '../util'
import { editThought, setCursor, updateThoughts, editingValue } from '../reducers'
import { getAllChildren, simplifyPath, rootedParentOf, getThoughtById } from '../selectors'
import { Path, SimplePath, State, Timestamp } from '../@types'
import newThought from './newThought'
import collapseContext from './collapseContext'
import sanitize from 'sanitize-html'
import { getSessionId } from '../util/sessionManager'
import { ALLOWED_ATTRIBUTES, ALLOWED_TAGS, HOME_PATH } from '../constants'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getTextContentFromHTML from '../device/getTextContentFromHTML'

// a list item tag
const regexpListItem = /<li(?:\s|>)/gim
export interface ImportTextPayload {
  path?: Path

  // Set the lastUpdated timestamp on the imported thoughts. Default: now.
  lastUpdated?: Timestamp

  // Prevents the default behavior of setting the cursor to the last thought at the first level.
  preventSetCursor?: boolean

  // When pasting after whitespace, e.g. Pasting "b" after "a ", the normal destValue has already been trimmed, which would result in "ab". We need to pass the untrimmed.destination value in so that it can be trimmed after concatenation.
  rawDestValue?: string

  // the character offset to end replacing text if the import is not multiline, such as the end of the selection
  replaceEnd?: number

  // the character offset to start replacing text if the import is not multiline, such as the start of the selection
  replaceStart?: number

  skipRoot?: boolean

  // text or HTML that will be inserted below the thought (if multiline) or inside the thought (singl line only)
  text: string

  // A user session id to associate with the update. Defaults to the current session.
  updatedBy?: string
}

/** Imports thoughts from html or raw text. */
const importText = (
  state: State,
  {
    path,
    text,
    lastUpdated,
    preventSetCursor,
    rawDestValue,
    replaceEnd,
    replaceStart,
    skipRoot,
    updatedBy = getSessionId(),
  }: ImportTextPayload,
): State => {
  const isRoam = validateRoam(text)

  path = path || HOME_PATH
  const simplePath = simplifyPath(state, path)
  const context = pathToContext(state, simplePath)
  const convertedText = isRoam ? text : textToHtml(text)
  const numLines = (convertedText.match(regexpListItem) || []).length
  const thoughtId = head(path)
  const destThought = getThoughtById(state, thoughtId)
  const destValue = rawDestValue || destThought.value

  // import raw thoughts
  // overwrite all state
  if (
    text.startsWith(`{
  "thoughtIndex": {
    "__ROOT__": {`)
  ) {
    const thoughts = JSON.parse(text)
    const stateNew = initialState()
    return {
      ...stateNew,
      thoughts: {
        ...stateNew.thoughts,
        ...thoughts,
      },
    }
  }

  // if we are only importing a single line of html, then simply modify the current thought
  if (numLines <= 1 && !isRoam && !isRoot(path)) {
    // TODO: textToHtml already strips the text, but one test fails if we remove it
    // See: "single-line nested html tags" in importText test
    const textNormalized = strip(convertedText, { preserveFormatting: true })

    // insert the textNormalized into the destValue in the correct place
    // trim after concatenating in case destValue has whitespace
    const left = (destValue.slice(0, replaceStart ?? 0) + textNormalized).trimLeft()
    // if cursorCleared is true i.e. clearThought is enabled we don't have to use existing thought to be appended
    const right = state.cursorCleared ? '' : destValue.slice(replaceEnd ?? 0).trimRight()
    const newValue = left + right

    const offset = getTextContentFromHTML(left).length

    return reducerFlow([
      editThought({
        oldValue: destValue,
        newValue,
        context: rootedParentOf(state, pathToContext(state, path)),
        path: simplePath,
      }),

      editingValue({
        value: newValue,
      }),

      !preventSetCursor && path
        ? setCursor({
            path: [...parentOf(path), thoughtId],
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
     * Returns the Path where thoughts will be imported. It may be the simplePath passed to importText, or it may be a dummy Path that is used to paste into an empty thought.
     */
    const getDestinationPath = (): SimplePath => {
      if (!shouldImportIntoDummy) return simplePath
      const newDummyThought = getAllChildrenAsThoughts(updatedState, context).find(child => child.value === uuid)
      return (newDummyThought ? [...simplePath, newDummyThought.id] : simplePath) as SimplePath
    }

    const newDestinationPath = getDestinationPath()

    const imported = importJSON(updatedState, newDestinationPath, json, { lastUpdated, skipRoot, updatedBy })

    /** Set cursor to the last imported path. */
    const setLastImportedCursor = (state: State) => {
      const lastImportedContext = imported.lastImported

      /** Get last iumported cursor after using collapse. */
      const getLastImportedAfterCollapse = () => {
        const cursorContextHead = lastImportedContext.slice(0, newDestinationPath.length - (destEmpty ? 2 : 1))
        const cursorContextTail = lastImportedContext.slice(newDestinationPath.length)
        return unroot([...cursorContextHead, ...cursorContextTail]) as SimplePath
      }

      const newCursor = shouldImportIntoDummy ? getLastImportedAfterCollapse() : lastImportedContext

      return setCursor(state, {
        path: newCursor,
      })
    }

    const parentOfDestination = parentOf(newDestinationPath)

    return reducerFlow([
      updateThoughts(imported),
      // set cusor to destination path's parent after collapse unless it's em or cusor set is prevented.
      shouldImportIntoDummy ? collapseContext({ deleteCursor: true, at: unroot(newDestinationPath) }) : null,
      // if original destination has empty then collapse once more.
      shouldImportIntoDummy && destEmpty ? collapseContext({ deleteCursor: true, at: parentOfDestination }) : null,
      // restore the cursor to the last imported thought on the first level
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
