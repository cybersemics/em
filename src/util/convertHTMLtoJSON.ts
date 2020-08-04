import * as htmlparser from 'htmlparser2'
import _ from 'lodash'
import { JSONOutput, parse } from 'himalaya'
import { Context } from '../types'

/** Returns true if the given tagname is ul or ol. */
const isList = (tagname: string) => tagname === 'ul' || tagname === 'ol'

/** Returns true if the given tagname is li or p. */
const isListItem = (tagname: string) => tagname === 'li' || tagname === 'p'

/** Returns true if the given tagname is i, b, or u. */
const isFormattingTag = (tagname: string) => tagname === 'i' || tagname === 'b' || tagname === 'u'

interface ImportHtmlOptions {
  skipRoot? : boolean,
}
interface InsertThoughtOptions {
  indent?: boolean,
  outdent?: boolean,
  insertEmpty?: boolean,
}
interface ThoughtJSON {
  scope: string,
  children: ThoughtJSON[],
}

/** Parses input HTML and saves in JSON array using Himalaya. */
export const convertHTMLtoJSONwithHimalaya = (html: string) => {
  /** */
  const removeEmptyNodes = (nodes: JSONOutput[]) => {
    return nodes.filter(node => {
      if (node.type === 'element') {
        node.children = removeEmptyNodes(node.children)
        return true
      }
      return node.content.length
    })
  }

  /** */
  const stripWhitespace = (nodes: JSONOutput[]) => {
    return nodes.map(node => {
      if (node.type === 'element') {
        node.children = stripWhitespace(node.children)
      }
      else {
        !node.content && console.log(node)
        node.content = node.content.trim()
      }
      return node
    })
  }

  /** */
  const removeWhitespace = (nodes: JSONOutput[]) => {
    return removeEmptyNodes(stripWhitespace(nodes))
  }

  const json = removeWhitespace(parse(html))
  return json
}

/** Parses input HTML and saves in JSON array. */
export const convertHTMLtoJSON = (html: string, { skipRoot }: ImportHtmlOptions = { skipRoot: false }): ThoughtJSON[] => {
  /***********************************************
   * Constants
   ***********************************************/
  // allow importing directly into em context
  const thoughtsJSON: ThoughtJSON[] = []

  /***********************************************
   * Variables
   ***********************************************/
  // modified during parsing
  const currentContext: Context = []
  // the value may accumulate over several tags, e.g. <b>one</b> and <i>two</i>
  let valueAccum = '' // eslint-disable-line fp/no-let

  // import notes from WorkFlowy
  let isNote = false // eslint-disable-line fp/no-let

  // when skipRoot is true, keep track if the root has been skipped
  let rootSkipped = false // eslint-disable-line fp/no-let

  /***********************************************
   * Methods
   ***********************************************/

  /** Returns true if the import cursor is still at the starting level. */
  const importCursorAtStart = () => currentContext.length === 0

  /** Insert the accumulated value at the importCursor. Reset and advance rank afterwards. Modifies contextIndex and thoughtIndex. */
  const flushThought = (options?: InsertThoughtOptions) => {

    // do not insert the first thought if skipRoot
    if (skipRoot && !rootSkipped) {
      rootSkipped = true
    }
    // insert thought with accumulated text
    else {
      // insertThought(valueAccum, options)
      saveThoughtJSON(valueAccum, options)
    }

    valueAccum = ''
  }

  /** Saves the given value to JSON. */
  const saveThoughtJSON = (value: string, { indent, outdent, insertEmpty }: InsertThoughtOptions = {}) => {
    value = value.trim()
    if (!value && !insertEmpty) return

    appendToJSON({ scope: value, children: [] }, currentContext)
    if (indent) {
      currentContext.push(value) // eslint-disable-line fp/no-mutating-methods
    }
    else if (outdent) {
      // guard against going above the starting importCursor
      if (!importCursorAtStart()) {
        currentContext.pop() // eslint-disable-line fp/no-mutating-methods
      }
    }
  }

  /** Append a Thought to correct position in thoughtsJSON. */
  const appendToJSON = (thought: ThoughtJSON, context: Context) => {
    if (currentContext.length === 0) {
      thoughtsJSON.push(thought) // eslint-disable-line fp/no-mutating-methods
    }
    else {
      /** Recursively retrieve parent thought to append to. */
      const getParent = (context: Context, thoughts: ThoughtJSON[]): ThoughtJSON | null => {
        const scope = _.head(context)
        const parent = thoughts.find(thought => thought.scope === scope)
        if (!parent) return null
        if (_.tail(context).length === 0) return parent
        return getParent(_.tail(context), parent.children)
      }
      const parent = getParent(context, thoughtsJSON)
      parent && parent.children.push(thought) // eslint-disable-line fp/no-mutating-methods
    }
  }

  /***********************************************
   * Parser
   ***********************************************/

  const parser = new htmlparser.Parser({

    onopentag: (tagname, attributes) => {
      // store the last isNote (see usage below)
      const isNotePrev = isNote

      isNote = attributes.class === 'note'

      // turn on note flag so that it can be detected when flushThought is called on onclosetag
      // the additional =note category is added in onclosetag
      if (isNote) {
        flushThought({ indent: true })
      }
      // add the accumulated thought and indent if it is a list
      // If valueAccum is empty and the previous thought was a note, do not add an empty thought. The thought was already added when the note was added, so the importCursor is already in the right place for the children.
      else if (isList(tagname) && (valueAccum.trim() || (!isNotePrev && !importCursorAtStart()))) {
        flushThought({ indent: true, insertEmpty: true })
      }
      // insert the formatting tag and turn on the format flag so the closing formatting tag can be inserted
      else if (isFormattingTag(tagname)) {
        valueAccum += `<${tagname}>`
      }
    },

    ontext: text => {
      // append text for the next thought`
      valueAccum += text
      // console.log(text)
    },

    // @ts-ignore The function signature is different from its respective library definition
    onclosetag: tagname => {

      // insert the note into a =note subthought with proper indentation
      if (isNote) {
        saveThoughtJSON('=note', { indent: true })
        flushThought({ outdent: true })
      }
      // when a list ends, go up a level
      else if (isList(tagname)) {
        // guard against going above the starting importCursor
        if (!importCursorAtStart()) {
          currentContext.pop() // eslint-disable-line
        }
      }
      // when a list item is closed, add the thought
      // it may have already been added, e.g. if it was added in onopentag, before its children were added, in which case valueAccum will be empty and flushThought will exit without adding a thought
      else if (isListItem(tagname)) {
        flushThought()
      }
      // add the closing formatting tag
      else if (isFormattingTag(tagname)) {
        valueAccum += `</${tagname}>`
      }
    }

  })
  parser.write(html)
  parser.end()

  if (valueAccum) {
    flushThought()
  }

  return thoughtsJSON
}
