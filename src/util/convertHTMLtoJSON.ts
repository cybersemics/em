import _ from 'lodash'
import { Element, HimalayaNode, Text, parse } from 'himalaya'
import { Block } from '../action-creators/importText'

/** Parses input HTML and saves in JSON array using Himalaya. */
export const convertHTMLtoJSON = (html: string) => {

  /** Retrieve attribute from Element node by key. */
  const getAttribute = (key: string, node: Element) => {
    const { attributes } = node
    if (!attributes) return
    const attribute = attributes.find(attr => attr.key === key)
    return attribute ? attribute.value : undefined
  }

  /** Check whether node is formatting tag element (<i>...</i>, <b>...</b> or <span>...</span>). */
  const isFormattingTag = (node: Element | Text) => node.type === 'element'
    && (node.tagName === 'i' || node.tagName === 'b' || (node.tagName === 'span' && getAttribute('class', node) !== 'note'))

  /** Retrieve content from node and wrap in tag, if it's <i> or <b>. */
  const retrieveContentFromFormattingTag = (node: Element) => {
    const content = (_.head(node.children) as Text).content
    if (node.tagName === 'span') return content

    return `<${node.tagName}>${content}</${node.tagName}>`
  }

  /** Removes empty nodes and comments from himalaya's JSON output. */
  const removeEmptyNodesAndComments = (nodes: HimalayaNode[]): (Element | Text)[] => {
    const filteredNodes = nodes.filter(node => {
      return node.type === 'element'
        ? true
        : node.type === 'comment' || (node.type === 'text' && /^[\n ]+$/g.test(node.content)) ? false : node.content.length
    })
    return filteredNodes.map(node => node.type === 'element' && node.children.length > 0 ? { ...node, children: removeEmptyNodesAndComments(node.children) } : node) as (Element | Text)[]
  }

  /** Retrive content of Text element and return Block. */
  const convertText = (node: Text, wrappedTag?: string): Block => {
    const content = node.content.includes('\n') ? node.content.trim() : node.content
    return {
      scope: wrappedTag ? `<${wrappedTag}>${content}</${wrappedTag}>` : content,
      children: []
    }
  }

  /** Convert Workflowy tag to Block. */
  const convertWorkflowy = (node: Element): Block => {
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
  const handleFormattingTags = (nodes: (Element | Text)[]): (Element | Text)[] => {
    if (nodes.length === 0) return []
    const beforeFormattingTags = _.takeWhile(nodes, node => !(isFormattingTag(node) || node.type === 'text'))
    if (beforeFormattingTags.length !== 0) return [...beforeFormattingTags, ...handleFormattingTags(nodes.slice(beforeFormattingTags.length))]

    const tagsToMerge = _.takeWhile(nodes, node => isFormattingTag(node) || node.type === 'text')
    const merged = tagsToMerge.reduce((acc: Text, current: Element | Text) => {
      const appendContent = current.type === 'text'
        ? (current as Text).content
        : retrieveContentFromFormattingTag(current)
      return {
        type: 'text',
        content: acc.content + appendContent
      }
    }, {
      type: 'text',
      content: ''
    })
    const afterFormattingTags = nodes.slice(tagsToMerge.length)
    return afterFormattingTags.length === 0 ? [merged] : [merged, ...handleFormattingTags(afterFormattingTags)]
  }

  /** Create new <ul> Element instead of <br> element and put all nodes after <br> as children of <ul>. */
  const handleBr = (nodes: (Element | Text)[], brIndex: number): (Element | Text)[] => {
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
  const joinChildren = (nodes: (Block[] | Block)[]): Block[] | Block => {
    // split by chunk with size of 2, first element in chunk is Block - parent, the second is Block[] - children
    const chunks = _.chunk(nodes, 2)
    const parentsWithChildren = chunks.map(chunk => chunk.reduce((acc, node, index) => {
      if (index === 0) return node as Block
      else return { ...acc, children: [...(acc as Block).children, ...Array.isArray(node) ? node : [node]] } as Block
    }) as Block)
    return parentsWithChildren.length === 1 ? parentsWithChildren[0] : parentsWithChildren
  }

  /** Converts each Array of HimalayaNodes to Block. */
  const convert = (nodes: (Element | Text)[]): Block[] | Block => {
    // check if nodes have formatting tag nodes. in this case merge formatting tags together.
    if (nodes.some(node => isFormattingTag(node))) {
      const merged = handleFormattingTags(nodes)
      if (merged.length === 1) return convertText(_.head(merged) as Text)
      return convert(merged)
    }
    // check if nodes include <br> tag. in this case replace <br> with <ul> and put all elements after <br> as children of <ul>
    const brIndex = nodes.findIndex(node => node.type === 'element' && node.tagName === 'br')
    if (brIndex !== -1) {
      return convert(handleBr(nodes, brIndex))
    }
    const blocks = nodes.map((node, index) => {
      // convert Text directly to Block
      if (node.type === 'text') {
        return convertText(node)
      }
      // convert Workflowy to Block
      if (getAttribute('class', node) === 'note') {
        const workFlowy = convertWorkflowy(node)
        return workFlowy
      }
      // convert ul, returns array of its children which later will be joined with parent (element before ul), if it's necessary
      if (node.tagName === 'ul') {
        const converted = convert(node.children as (Element | Text)[]) as Block[]
        const prevNode = nodes[index - 1]
        return prevNode && prevNode.type === 'element' && getAttribute('class', prevNode) === 'note' ? converted[0] : converted
      }
      // convert li
      const { children } = node
      if (children.length === 1) {
        const [childNode] = children as (Element | Text)[]
        if (childNode.type === 'text') {
          return {
            scope: childNode.content,
            children: []
          } as Block
        }
        else if (childNode.type === 'element' && childNode.tagName === 'ul') {
          return {
            scope: '',
            children: convert(childNode.children as (Element | Text)[])
          } as Block
        }
      }
      else return convert(node.children as (Element | Text)[])
    }) as (Block | Block[])[]
    if (blocks.length === 1 && Array.isArray(blocks[0])) return blocks.flat()
    // retrieve first chunk, if the first element is Block and the second is Block[], join children (Block[]) with parent (Block), else return blocks as is.
    const [first, second] = blocks
    return !Array.isArray(first) && Array.isArray(second)
      ? joinChildren(blocks)
      : blocks as Block[]
  }

  /** Clear himalaya's output and converts to Block. */
  const convertHimalayaToBlock = (nodes: HimalayaNode[]) => {
    const blocks = convert(removeEmptyNodesAndComments(nodes))
    return Array.isArray(blocks) ? blocks : [blocks]
  }

  return convertHimalayaToBlock(parse(html))
}
