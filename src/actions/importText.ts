import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import Timestamp from '../@types/Timestamp'
import editThought from '../actions/editThought'
import setCursor from '../actions/setCursor'
import updateThoughts from '../actions/updateThoughts'
import { HOME_PATH } from '../constants'
import { clientId } from '../data-providers/yjs'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import { anyChild, findAnyChild, getAllChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import head from '../util/head'
import htmlToJson from '../util/htmlToJson'
import importJson from '../util/importJson'
import isMarkdown from '../util/isMarkdown'
import isRoot from '../util/isRoot'
import markdownToText from '../util/markdownToText'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import roamJsonToBlocks, { RoamPage } from '../util/roamJsonToBlocks'
import textToHtml from '../util/textToHtml'
import unroot from '../util/unroot'
import validateRoam from '../util/validateRoam'
import editableRender from './editableRender'
import newThought from './newThought'
import uncategorize from './uncategorize'

// a list item tag
const REGEX_LIST_ITEM = /<li(?:\s|>)/gim

/** Converts a plain text offset to the corresponding offset in an HTML string, skipping over HTML tags. Returns the HTML string length if the text offset exceeds the text content length. */
const textOffsetToHtmlOffset = (html: string, textOffset: number): number => {
  let textCount = 0
  let inTag = false
  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') {
      inTag = true
    } else if (html[i] === '>') {
      inTag = false
    } else if (!inTag) {
      if (textCount === textOffset) return i
      textCount++
    }
  }
  return html.length
}

export interface ImportTextPayload {
  caretPosition?: number

  /** Callback for when the updates have been synced with IDB. */
  idbSynced?: () => void

  path?: Path

  /** Set the lastUpdated timestamp on the imported thoughts. Default: now. */
  lastUpdated?: Timestamp

  /** Prevents pasting a single line of text into the destination thought, and always pastes as a child. */
  preventInline?: boolean

  /** Prevents the default behavior of setting the cursor to the last thought at the first level. */
  preventSetCursor?: boolean

  /** When pasting after whitespace, e.g. Pasting "b" after "a ", the normal destValue has already been trimmed, which would result in "ab". We need to pass the untrimmed.destination value in so that it can be trimmed after concatenation. */
  rawDestValue?: string

  /* The character offset to end replacing text if the import is not multiline, such as the end of the selection. */
  replaceEnd?: number

  /* The character offset to start replacing text if the import is not multiline, such as the start of the selection. */
  replaceStart?: number

  skipRoot?: boolean

  /** Text or HTML that will be inserted below the thought (if multiline) or inside the thought (singl line only). */
  text: string

  /** A user session id to associate with the update. Defaults to the current session. */
  updatedBy?: string
}

/** Imports thoughts from html or raw text. */
const importText = (
  state: State,
  {
    path,
    text,
    idbSynced,
    lastUpdated,
    preventInline,
    preventSetCursor,
    rawDestValue,
    replaceEnd,
    replaceStart,
    skipRoot,
    updatedBy = clientId,
    caretPosition = 0,
  }: ImportTextPayload,
): State => {
  const isRoam = validateRoam(text)

  path = path || HOME_PATH
  const simplePath = simplifyPath(state, path)
  const convertedText = isRoam ? text : isMarkdown(text) ? textToHtml(markdownToText(text)) : textToHtml(text)
  const numLines = (convertedText.match(REGEX_LIST_ITEM) || []).length
  const thoughtId = head(path)
  const destThought = getThoughtById(state, thoughtId)
  if (!destThought) {
    console.error({ path })
    throw new Error(`Thought does not exist: ${thoughtId}`)
  }

  const destValue = rawDestValue || destThought.value

  // if we are only importing a single line of html, then simply modify the current thought
  if (!preventInline && numLines <= 1 && !isRoam && !isRoot(path)) {
    // insert the text into the destValue in the correct place
    // if cursorCleared is true i.e. clearThought is enabled we don't have to use existing thought to be appended

    // Convert text offsets to HTML offsets since destValue may contain formatting tags.
    const htmlCaretPosition = textOffsetToHtmlOffset(destValue, caretPosition)
    const htmlReplaceStart = replaceStart != null ? textOffsetToHtmlOffset(destValue, replaceStart) : undefined
    const htmlReplaceEnd = replaceEnd != null ? textOffsetToHtmlOffset(destValue, replaceEnd) : undefined

    const replacedDestValue = state.cursorCleared
      ? ''
      : destValue.slice(0, htmlReplaceStart || 0) + destValue.slice(htmlReplaceEnd || 0)

    const insertPosition = htmlReplaceStart || htmlCaretPosition
    const newValue = `${replacedDestValue.slice(0, insertPosition)}${text}${replacedDestValue.slice(insertPosition)}`
    const offset = caretPosition + getTextContentFromHTML(text).length

    return reducerFlow([
      // Force the editable to re-render in order to trigger setSelectionToCursorOffset in useEditMode and restore the caret.
      // Otherwise on paste, innerHTML will be modified directly and the caret will move to the beginning of the thought due to default browser behavior.
      // See: https://github.com/cybersemics/em/issues/3277#issuecomment-3470718557
      editableRender,
      editThought({
        oldValue: destValue,
        newValue,
        path: simplePath,
      }),

      !preventSetCursor && path
        ? setCursor({
            path: [...parentOf(path), thoughtId],
            offset,
          })
        : null,
    ])(state)
  } else {
    const json = isRoam ? roamJsonToBlocks(JSON.parse(convertedText) as RoamPage[]) : htmlToJson(convertedText)

    const destIsLeaf = !anyChild(state, head(simplePath))

    /** Check if destination's parent context has more than one children. */
    const isDestParentContextEmpty = () => getAllChildren(state, head(rootedParentOf(state, simplePath))).length <= 1

    const destEmpty = destThought.value === '' && destIsLeaf

    // In order to merge the top-level imports with existing siblings, we need to trigger mergeThoughts through moveThought.
    // Rather than do this individually for each top level imported thought, we import into a dummy thought and then collapse it.
    // Since collapse uses moveThought it will merge the imported thoughts.
    const shouldImportIntoDummy = destEmpty ? !isDestParentContextEmpty() : !destIsLeaf
    const dummyValue = createId()
    const stateWithDummy = shouldImportIntoDummy
      ? newThought(state, {
          at: simplePath,
          insertNewSubthought: true,
          value: dummyValue,
        })
      : state

    /**
     * Returns the Path where thoughts will be imported. It may be the simplePath passed to importText, or it may be a dummy Path (see shouldImportIntoDummy above).
     */
    const getDestinationPath = (): SimplePath => {
      if (!shouldImportIntoDummy) return simplePath
      const dummyThought = findAnyChild(stateWithDummy, head(simplePath), child => child.value === dummyValue)
      return (dummyThought ? [...simplePath, dummyThought.id] : simplePath) as SimplePath
    }

    const newDestinationPath = getDestinationPath()

    const imported = importJson(stateWithDummy, newDestinationPath, json, { lastUpdated, skipRoot, updatedBy })

    /** Set cursor to the last thought on the first level of imports. */
    const setLastImportedCursor = (state: State): State => {
      /** Get last imported cursor after using collapse. */
      const getLastImportedAfterCollapse = () => {
        const pathStart = imported.lastImported!.slice(0, newDestinationPath.length - (destEmpty ? 2 : 1)) as Path
        const pathMiddle = imported.lastImported!.slice(newDestinationPath.length, imported.lastImported!.length - 1)
        const id = head(imported.lastImported!)
        const thought = getThoughtById(stateWithDummy, id)

        // if the last imported thought was merged into an existing thought, then the imported thought will no longer exist
        // find the sibling with the same value and use that to set the new cursor
        // otherwise this will return an invalid Path
        // (this seems fragile: is it guaranteed to be the merged thought?)

        /** Gets the id of a destination sibling with the same value as the last imported thought. */
        const idMerged = () => {
          const thoughtImported = imported.thoughtIndexUpdates[id]!
          const idMatchedValue = findAnyChild(
            state,
            destEmpty ? destThought.parentId : destThought.id,
            child => child.value === thoughtImported.value,
          )?.id
          if (!thought && !idMatchedValue) {
            throw new Error(
              'Last imported cursor after collapse and merge is wrong. Expected the destination thought to have a sibling that matches the value of the last imported thought. This is a bug and the logic needs to be updated to handle this case.',
            )
          }

          return idMatchedValue
        }

        return appendToPath(pathStart, ...pathMiddle, thought ? id : idMerged()!)
      }

      const newCursor = imported.lastImported
        ? shouldImportIntoDummy
          ? getLastImportedAfterCollapse()
          : imported.lastImported
        : // setCursor must still be called even if the cursor has not changed, as setCursor sets some other state, such as state.expanded. See the note about uncategorize below.
          // Note: Failing to call setCursor may not be noticeable in the app if expandThoughts gets triggered by another action, such as updateThoughts. However ommitting this will fail component tests that rely on the expanded state immediately after importText.
          state.cursor

      return setCursor(state, { path: newCursor })
    }

    const parentOfDestination = parentOf(newDestinationPath)

    return reducerFlow([
      // thoughts will be expanded by setCursor, so no need to expand them here
      updateThoughts({ ...imported, preventExpandThoughts: true, idbSynced }),
      // set cusor to destination path's parent after collapse unless it's em or cusor set is prevented.
      shouldImportIntoDummy ? uncategorize({ at: unroot(newDestinationPath) }) : null,
      // if original destination is empty then collapse once more.
      shouldImportIntoDummy && destEmpty ? uncategorize({ at: parentOfDestination }) : null,
      // restore the cursor to the last imported thought on the first level
      // Note: uncategorize may be executed as part of the import. Since uncategorize moves the cursor, we need to set cursor back to the old cursor if preventSetCursor is true.
      !preventSetCursor ? setLastImportedCursor : setCursor({ path: state.cursor }),
    ])(stateWithDummy)
  }
}

/** A Thunk that dispatches an 'importText` action. */
export const importTextActionCreator =
  (payload: Parameters<typeof importText>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'importText', ...payload })

export default _.curryRight(importText)

// Register this action's metadata
registerActionMetadata('importText', {
  undoable: true,
})
