import _ from 'lodash'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import Timestamp from '../@types/Timestamp'
import editThought from '../actions/editThought'
import setCursor from '../actions/setCursor'
import updateThoughts from '../actions/updateThoughts'
import { EXTERNAL_FORMATTING_TAGS, HOME_PATH } from '../constants'
import { clientId } from '../data-providers/thoughtspaceSession'
import getTextContentFromHTML from '../device/getTextContentFromHTML'
import { anyChild, findAnyChild, getAllChildren } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import addEmojiSpace from '../util/addEmojiSpace'
import appendToPath from '../util/appendToPath'
import createId from '../util/createId'
import head from '../util/head'
import htmlToJson from '../util/htmlToJson'
import importJson from '../util/importJson'
import insertHtmlAtTextOffset from '../util/insertHtmlAtTextOffset'
import isMarkdown from '../util/isMarkdown'
import isRoot from '../util/isRoot'
import markdownToText from '../util/markdownToText'
import mergeAdjacentTags from '../util/mergeAdjacentTags'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import roamJsonToBlocks, { RoamPage } from '../util/roamJsonToBlocks'
import splitHtmlAtTextOffset from '../util/splitHtmlAtTextOffset'
import textToHtml from '../util/textToHtml'
import unroot from '../util/unroot'
import validateRoam from '../util/validateRoam'
import editableRender from './editableRender'
import newThought from './newThought'
import uncategorize from './uncategorize'

// a list item tag
const REGEX_LIST_ITEM = /<li(?:\s|>)/gim

/** Elements that separate the text on either side of them, so their text must not run into that of their siblings when they are unwrapped. */
const SEPARATING_ELEMENTS =
  'address, article, aside, blockquote, br, dd, div, dl, dt, figcaption, figure, footer, h1, h2, h3, h4, h5, h6, header, hr, li, ol, p, pre, section, table, td, th, tr, ul'

/** Returns the descendants of a node in document order. */
const descendants = (node: Node): Node[] => [...node.childNodes].flatMap(child => [child, ...descendants(child)])

/**
 * Sanitizes single-line HTML copied from outside em, such as from a web page, before it is inserted inside a thought (#4161). Only the basic formatting tags in EXTERNAL_FORMATTING_TAGS are kept, without their attributes, and every other element is unwrapped to its contents. A formatting tag that covers all of the text, such as a heading's bold or the <b style="font-weight:normal"> that Google Docs wraps around every copy, is unwrapped too, since it is unlikely to be intentional. Formatting within the text, such as a bold word, is kept.
 *
 * The HTML is parsed into an inert template, so that its scripts do not run and its images do not load, and it is sanitized on the parsed nodes rather than matched out of the markup.
 *
 * In the import pipeline (#4988) this is the external sanitization profile, which belongs in the shared funnel (htmlToJson). It lives here because the single-line splice does not run through the funnel yet. Once parse-then-route (#5175) has the splice consume the funnel's output, it moves there.
 */
const sanitizeExternalHtml = (html: string): string => {
  const template = document.createElement('template')
  template.innerHTML = html
  const fragment = template.content

  fragment.querySelectorAll('script, style, title').forEach(element => element.remove())
  descendants(fragment)
    .filter(node => node.nodeType === Node.COMMENT_NODE)
    .forEach(comment => comment.parentNode?.removeChild(comment))
  fragment.querySelectorAll(SEPARATING_ELEMENTS).forEach(element => element.after(' '))
  fragment
    .querySelectorAll('*')
    .forEach(element =>
      EXTERNAL_FORMATTING_TAGS.includes(element.localName)
        ? [...element.attributes].forEach(attribute => element.removeAttribute(attribute.name))
        : element.replaceWith(...element.childNodes),
    )

  // Collapse the whitespace that HTML collapses, including the newlines of a <pre> and across the boundaries of the
  // formatting tags, since a thought is a single line. Other Unicode spaces, such as an ideographic or narrow no-break
  // space, are text and are kept. Each no-break space becomes a normal space, as in strip.
  const textNodes = descendants(fragment).filter(node => node.nodeType === Node.TEXT_NODE) as Text[]
  textNodes.reduce((previousEndsWithSpace, node) => {
    const collapsed = node.data.replace(/[ \t\n\r\f]+/g, ' ')
    node.data = (previousEndsWithSpace ? collapsed.replace(/^ /, '') : collapsed).replaceAll('\u00a0', ' ')
    return collapsed ? collapsed.endsWith(' ') : previousEndsWithSpace
  }, false)
  // trim the text at both ends, which may span several text nodes when they are only whitespace
  const textNodesFromEnd = [...textNodes].reverse()
  textNodes.some(node => (node.data = node.data.replace(/^ +/, '')).length > 0)
  textNodesFromEnd.some(node => (node.data = node.data.replace(/ +$/, '')).length > 0)
  fragment.querySelectorAll('*').forEach(element => element.textContent === '' && element.remove())

  // Unwrap each formatting tag that covers all of the text. Unwrapping one does not change the text of the others.
  fragment
    .querySelectorAll(EXTERNAL_FORMATTING_TAGS.join(', '))
    .forEach(element => element.textContent === fragment.textContent && element.replaceWith(...element.childNodes))

  return template.innerHTML
}

export interface ImportTextPayload {
  caretPosition?: number

  /** Callback for when the updates have been synced with IDB. */
  idbSynced?: () => void

  path?: Path

  /** Set the lastUpdated timestamp on the imported thoughts. Default: now. */
  lastUpdated?: Timestamp

  /** Prevents the default behavior of setting the cursor to the last thought at the first level. */
  preventSetCursor?: boolean

  /** When pasting after whitespace, e.g. Pasting "b" after "a ", the normal destValue has already been trimmed, which would result in "ab". We need to pass the untrimmed.destination value in so that it can be trimmed after concatenation. */
  rawDestValue?: string

  /* The character offset to end replacing text if the import is not multiline, such as the end of the selection. */
  replaceEnd?: number

  /* The character offset to start replacing text if the import is not multiline, such as the start of the selection. */
  replaceStart?: number

  skipRoot?: boolean

  /** The text is HTML copied from outside em, such as from a web page. Its formatting is sanitized with sanitizeExternalHtml when it is inserted inside the thought (single line only). Multiline imports are unaffected. */
  isExternalHtml?: boolean

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
    preventSetCursor,
    rawDestValue,
    replaceEnd,
    replaceStart,
    isExternalHtml,
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
  if (numLines <= 1 && !isRoam && !isRoot(path)) {
    // insert the text into the destValue in the correct place
    // if cursorCleared is true i.e. clearThought is enabled we don't have to use existing thought to be appended

    // Both halves of the edit are addressed by plain text offset and resolved through the DOM. Indexing into the markup
    // instead cuts between two tag contexts, leaving a tag unclosed (#5154), and considers an entity to have as many characters
    // as its markup is long (#5297).
    const replacedDestValue = state.cursorCleared
      ? ''
      : replaceStart != null && replaceEnd != null
        ? mergeAdjacentTags(
            `${splitHtmlAtTextOffset(destValue, replaceStart).left}${splitHtmlAtTextOffset(destValue, replaceEnd).right}`,
          )
        : destValue

    const insertedText = isExternalHtml ? sanitizeExternalHtml(text) : text
    const insertOffset = replaceStart ?? caretPosition
    const combinedValue = insertHtmlAtTextOffset(replacedDestValue, insertOffset, insertedText)
    const newValue = addEmojiSpace(combinedValue)
    // the caret lands after the inserted text, which starts where the replaced range did rather than where it ended
    const offsetBeforeEmojiSpace = insertOffset + getTextContentFromHTML(insertedText).length
    const emojiSpaceInsertionOffset = newValue === combinedValue ? -1 : getTextContentFromHTML(newValue).indexOf(' ')
    const offset =
      emojiSpaceInsertionOffset >= 0 && offsetBeforeEmojiSpace >= emojiSpaceInsertionOffset
        ? offsetBeforeEmojiSpace + 1
        : offsetBeforeEmojiSpace

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
