import _ from 'lodash'
import { Element, HimalayaNode, Text, parse } from 'himalaya'
import { Block } from '../types'

/** Retrieve attribute from Element node by key. */
const getAttribute = (key: string, node: Element) => {
  const { attributes } = node
  if (!attributes) return
  return attributes.find(attr => attr.key === key)?.value
}

/** Check whether node is formatting tag element (<i>...</i>, <b>...</b> or <span>...</span>). */
const isFormattingTag = (node: HimalayaNode) => node.type === 'element'
  && (node.tagName === 'i' || node.tagName === 'b' || (node.tagName === 'span' && getAttribute('class', node) !== 'note'))

/** Strip span and encode a <i> or <b> element as HTML. */
const formattingNodeToHtml = (node: Element) => {
  const content = (_.head(node.children) as Text).content
  if (node.tagName === 'span') return content
  return `<${node.tagName}>${content}</${node.tagName}>`
}

/** Returns true if the text node is only whitespace. */
const isEmpty = (node: Text) => /^\s*$/g.test(node.content)

/** Removes empty nodes and comments from himalaya's JSON output. */
const removeEmptyNodesAndComments = (nodes: HimalayaNode[]): HimalayaNode[] => {
  const filteredNodes = nodes.filter(node =>
    node.type !== 'comment' &&
    !(node.type === 'text' && isEmpty(node))
  )
  return filteredNodes.map(node => node.type === 'element' && node.children.length > 0
    ? { ...node, children: removeEmptyNodesAndComments(node.children) }
    : node
  )
}

/** Retrieve content of Text element, optionally wrapped in a tag, and return Block. */
const textNodeToBlock = (node: Text): Block => ({
  scope: node.content.trim(),
  children: []
})

/** Returns true if the node is a <br> tag. */
const isBr = (node: HimalayaNode): boolean =>
  node.type === 'element' && node.tagName === 'br'

/** Returns true if the node is a WorkFlowy note. */
const isWorkflowyNote = (node: HimalayaNode) =>
  node.type === 'element' && getAttribute('class', node) === 'note'

/** Convert Workflowy tag to Block. */
const workflowyNoteToBlock = (node: Element): Block => {
  const workflowyContent = (_.head(node.children) as Text).content
  return {
    scope: '=note',
    children: [
      {
        scope: workflowyContent,
        children: []
      }
    ]
  }
}

/** Merge formatting tags content together if it's necessary. */
const handleFormattingTags = (nodes: HimalayaNode[]): HimalayaNode[] => {

  if (nodes.length === 0) return []

  const beforeFormattingTags = _.takeWhile(nodes, node => !(isFormattingTag(node) || node.type === 'text'))
  if (beforeFormattingTags.length !== 0) return [...beforeFormattingTags, ...handleFormattingTags(nodes.slice(beforeFormattingTags.length))]

  const tagsToMerge = _.takeWhile(nodes, node => isFormattingTag(node) || node.type === 'text')
  const mergedContent = tagsToMerge.reduce((accum: string, current: HimalayaNode) => {
    const appendContent = current.type === 'text' ? current.content
      : current.type === 'comment' ? ''
      : formattingNodeToHtml(current)
    return accum + appendContent
  }, '')

  const mergedBlock = {
    type: 'text',
    content: mergedContent,
  } as Text

  const afterFormattingTags = nodes.slice(tagsToMerge.length)
  return afterFormattingTags.length === 0
    ? [mergedBlock]
    : [mergedBlock, ...handleFormattingTags(afterFormattingTags)]
}

/** Create new <ul> Element instead of <br> element and put all nodes after <br> as children of <ul>. */
const handleBr = (nodes: HimalayaNode[], brIndex: number): HimalayaNode[] => {

  const nextNode = nodes[brIndex + 1]

  // if the child <br> is not part of a WorkFlowy note, filter out all <br>
  if (!nextNode || !isWorkflowyNote(nextNode)) return nodes.filter(node => !isBr(node))

  // otherwise add ul element with note
  const beforeBr = nodes.slice(0, brIndex)
  const afterBr = nodes.slice(brIndex + 1)
  const ul = {
    type: 'element',
    tagName: 'ul',
    children: afterBr
  } as Element

  return [...beforeBr, ul]
}

/** Append children to parent as children property if it's necessary. */
const joinChildren = (nodes: Block[]) => {

  // split by chunk with size of 2, first element in chunk is Block - parent, the second is Block[] - children
  const chunks = _.chunk(nodes, 2)
  const parentsWithChildren = chunks.map(chunk => chunk.reduce((accum, node, index) => {
    if (index === 0) return node
    return {
      ...accum,
      children: [
        ...accum.children,
        ...Array.isArray(node) ? node : [node]
      ]
    }
  }))

  return parentsWithChildren.length === 1 ? parentsWithChildren[0] : parentsWithChildren
}

/** Converts an <li> element to a Block. */
const liToBlock = (node: Element): (Block | Block[]) => {

  const [firstChild] = node.children
  return firstChild.type === 'text' ? {
    scope: firstChild.content,
    children: []
  }
  // only add empty parent if the li node is empty and has nested list
    : firstChild.type === 'element' && firstChild.tagName === 'ul' ? {
      scope: '',
      children: himalayaToBlock((firstChild as Element).children) as Block[]
    } : himalayaToBlock(node.children) as Block[]
}

/** Converts a <ul> element to a Block. */
const ulToBlock = (node: Element, prevNode: Element) => {
  const converted = himalayaToBlock(node.children) as Block[]
  return prevNode && prevNode.type === 'element' && getAttribute('class', prevNode) === 'note' ? converted[0] : converted
}

/** Converts array of HimalayaNodes to Block or array of Blocks. */
const himalayaToBlock = (nodes: HimalayaNode[]): Block | Block[] => {

  // check if nodes have formatting tag nodes. in this case merge formatting tags together.
  if (nodes.some(isFormattingTag)) {
    const merged = handleFormattingTags(nodes)
    return merged.length === 1
      ? textNodeToBlock(_.head(merged) as Text)
      : himalayaToBlock(merged)
  }

  // handle <br> tag (which may be a WorkFlowy note or a normal line break)
  const brIndex = nodes.findIndex(isBr)
  if (brIndex !== -1) {
    return himalayaToBlock(handleBr(nodes, brIndex))
  }

  const blocks = nodes.map((node, index) =>
    node.type === 'comment' ? []
    : node.type === 'text' ? textNodeToBlock(node)
    : isWorkflowyNote(node) ? workflowyNoteToBlock(node)
    : node.tagName === 'ul' ? ulToBlock(node, nodes[index - 1] as Element)
    : node.tagName === 'li' && node.children.length === 1 ? liToBlock(node)
    : himalayaToBlock(node.children)
  )

  if (Array.isArray(blocks[0])) return blocks.flat()

  // retrieve first chunk, if the first element is Block and the second is Block[], join children (Block[]) with parent (Block), else return blocks as is.
  const [first, rest] = blocks
  const result = !Array.isArray(first) && Array.isArray(rest)
    ? joinChildren(blocks as Block[])
    : blocks as Block[]

  return result
}

/** Parses input HTML and saves in JSON array using Himalaya. */
export const convertHTMLtoJSON = (html: string) => {
  const nodes = parse(html)
  const blocks = himalayaToBlock(removeEmptyNodesAndComments(nodes))
  return Array.isArray(blocks) ? blocks : [blocks]
}
