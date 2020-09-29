import _ from 'lodash'
import { Element, HimalayaNode, Text, parse } from 'himalaya'
import { Block } from '../action-creators/importText'

interface PreBlock extends Block {
  partOfThought?: boolean,
}

/** Parses input HTML and saves in JSON array using Himalaya. */
export const convertHTMLtoJSON = (html: string) => {

  /** Retrieve attribute from Element node by key. */
  const getAttribute = (key: string, node: Element) => {
    const { attributes } = node
    if (!attributes) return
    const attribute = attributes.find(attr => attr.key === key)
    return attribute ? attribute.value : undefined
  }

  /** */
  const isFormattingTag = (node: Element | Text) => node.type === 'element'
    && (node.tagName === 'i' || node.tagName === 'b' || (node.tagName === 'span' && getAttribute('class', node) !== 'note'))

  /** */
  const hasFormattingsTags = (nodes: (Element | Text)[]) =>
    nodes.some(node => isFormattingTag(node))

  /** */
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

  /** Retrive content of Text element and return PreBlock. */
  const convertText = (node: Text, wrappedTag?: string) => {
    const content = node.content.includes('\n') ? node.content.trim() : node.content
    return {
      scope: wrappedTag ? `<${wrappedTag}>${content}</${wrappedTag}>` : content,
      children: []
    } as PreBlock
  }

  /** */
  const convertWorkflowy = (node: Element) => {
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

  /** */
  const handleFormattingTags = (nodes: (Element | Text)[]): (Element | Text)[] => {
    if (nodes.length === 0) return []
    const beforeFormattingTags = _.takeWhile(nodes, node => !(isFormattingTag(node) || node.type === 'text'))
    if (beforeFormattingTags.length !== 0) return [...beforeFormattingTags, ...handleFormattingTags(nodes.slice(beforeFormattingTags.length))]

    const tagsToMerge = _.takeWhile(nodes, node => isFormattingTag(node) || node.type === 'text')
    const merged = tagsToMerge.reduce((acc: Text, current: Element | Text) => {
      const accContent = acc.content
      const appendContent = current.type === 'text'
        ? (current as Text).content
        : retrieveContentFromFormattingTag(current)
      return {
        type: 'text',
        content: accContent + appendContent
      }
    }, {
      type: 'text',
      content: ''
    })
    const afterFormattingTags = nodes.slice(tagsToMerge.length)
    return afterFormattingTags.length === 0 ? [merged] : [merged, ...handleFormattingTags(afterFormattingTags)]
  }

  /** */
  const handleBr = (nodes: (Element | Text)[], brIndex: number) : (Element | Text)[] => {
    const beforeBr = nodes.slice(0, brIndex)
    const afterBr = nodes.slice(brIndex + 1)
    const ul = {
      type: 'element',
      tagName: 'ul',
      children: Array.isArray(afterBr) ? afterBr : [afterBr]
    } as Element
    return [...beforeBr, ul]
  }

  /** Append children to parent as children property if it's necessary. */
  const joinChildren = (nodes: (PreBlock[] | PreBlock)[]): PreBlock[] | PreBlock => {
    // split by chunk with size of 2, first element in chunk is PreBlock - parent, the second is PreBlock[] - children
    const chunks = _.chunk(nodes, 2)
    const [firstChunk] = chunks
    // check if both items in chunk are Arrays
    if (firstChunk.every(item => Array.isArray(item))) return nodes.flat()

    const parentsWithChildren = chunks.map(chunk => chunk.reduce((acc, node, index) => {
      if (index === 0) return node as PreBlock
      else return { ...acc, children: [...(acc as PreBlock).children, ...Array.isArray(node) ? node : [node]] } as PreBlock
    }) as PreBlock)
    return parentsWithChildren.length === 1 ? parentsWithChildren[0] : parentsWithChildren
  }

  /** Converts each Array of HimalayaNodes to PreBlock. */
  const convert = (nodes: (Element | Text)[]): PreBlock[] | PreBlock => {
    if (hasFormattingsTags(nodes)) {
      const merged = handleFormattingTags(nodes)
      if (merged.length === 1) return convertText(_.head(merged) as Text)
      return convert(merged)
    }
    const brIndex = nodes.findIndex(node => node.type === 'element' && node.tagName === 'br')
    if (brIndex !== -1) {
      return convert(handleBr(nodes, brIndex))
    }
    const blocks = nodes.map((node, index) => {
      // convert Text directly to PreBlock
      if (node.type === 'text') {
        return convertText(node)
      }
      if (getAttribute('class', node) === 'note') {
        const workFlowy = convertWorkflowy(node)
        return workFlowy
      }
      // convert children of ul
      if (node.tagName === 'ul') {
        const converted = convert(node.children as (Element | Text)[]) as PreBlock[]
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
          } as PreBlock
        }
        else if (childNode.type === 'element' && childNode.tagName === 'ul') {
          return {
            scope: '',
            children: convert(childNode.children as (Element | Text)[])
          } as PreBlock
        }
      }
      else return convert(node.children as (Element | Text)[])
    }) as (PreBlock | PreBlock[])[]
    return blocks.every(block => !Array.isArray(block))
      ? blocks as PreBlock[]
      : blocks.every(block => Array.isArray(block))
        ? blocks.flat()
        : joinChildren(blocks)
  }

  /** Convert PreBlock array to Block array. */
  const convertToBlock = (nodes: PreBlock[]): Block[] => nodes.map(node => {
    if (node.children.length > 0) return { ...node, children: convertToBlock(node.children) } as Block
    else return node as Block
  })

  /** Clear himalaya's output and converts to Block. */
  const convertHimalayaToBlock = (nodes: HimalayaNode[]) => {
    const preBlocks = convert(removeEmptyNodesAndComments(nodes))
    return Array.isArray(preBlocks) ? convertToBlock(preBlocks) : convertToBlock([preBlocks])
  }

  return convertHimalayaToBlock(parse(html))
}
