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
    const attribute = attributes.find(attr => attr.key === key)
    return attribute ? attribute.value : undefined
  }

  /** Removes empty nodes and comments from himalaya's JSON output. */
  const removeEmptyNodesAndComments = (nodes: HimalayaNode[]): (Element | Text)[] => {
    const filteredNodes = nodes.filter(node => {
      return node.type === 'element'
        ? node.tagName !== 'br'
        : node.type === 'comment' || (node.type === 'text' && /^[\n ]+$/g.test(node.content)) ? false : node.content.length
    })
    return filteredNodes.map(node => node.type === 'element' && node.children.length > 0 ? { ...node, children: removeEmptyNodesAndComments(node.children) } : node) as (Element | Text)[]
  }

  /** Append children to parent as children property if it's necessary. */
  const joinChildren = (nodes: (PreBlock[] | PreBlock)[]): PreBlock[] | PreBlock => {
    for (const node of nodes) { // eslint-disable-line fp/no-loops
      if (!Array.isArray(node)) {
        // in case of element with span tag around text (e.g. one <span>and</span> two)
        if (node.partOfThought) {
          // take all text elements
          const splittedText = _.takeWhile(nodes, node => !Array.isArray(node))
          // join their content in a single line
          const fullScope = splittedText.map(node => node && !Array.isArray(node) ? node.scope : '').join('')
          const children = _.dropWhile(nodes, node => !Array.isArray(node)).flat()
          return {
            scope: fullScope,
            children,
          } as PreBlock
        }
        // WorkFlowy import with notes
        if (node.scope === '=note') {
          const parent = _.first(nodes)
          const children = _.tail(nodes)
          return { ...parent, children: children.flat() } as PreBlock
        }
      }
      if (Array.isArray(node)) {
        // split by chunk with size of 2, first element in chunk is PreBlock - parent, the second is PreBlock[] - children
        const chunks = _.chunk(nodes, 2)
        const [firstChunk] = chunks
        // check if both items in chunk are Arrays
        if (firstChunk.every(item => Array.isArray(item))) return nodes.flat()

        const parentsWithChildren = chunks.map(chunk => chunk.reduce((acc, node, index) => {
          if (index === 0) return node as PreBlock
          else return { ...acc, children: node } as PreBlock
        }) as PreBlock)
        return parentsWithChildren.length === 1 ? parentsWithChildren[0] : parentsWithChildren
      }
    }
    return nodes as PreBlock[]
  }

  /** Retrive content of Text element and return PreBlock. */
  const convertText = (node: Text, wrappedTag?: string) => {
    const content = node.content.includes('\n') ? node.content.trim() : node.content
    return {
      scope: wrappedTag ? `<${wrappedTag}>${content}</${wrappedTag}>` : content,
      children: []
    } as PreBlock
  }

  /** Convert to PreBlock based on foramtting tag. */
  const convertFormattingTags = (node: Element) => {
    if (node.tagName === 'i' || node.tagName === 'b') {
      const [child] = node.children as Text[]
      return { ...convertText(child, node.tagName), partOfThought: true }
    }
    else if (node.tagName === 'span') {
      const attribute = getAttribute('class', node)
      // WorkFlowy import with notes
      if (attribute === 'note') {
        const [note] = node.children
        return {
          scope: '=note',
          children: [{
            scope: note.type === 'text' ? note.content : '',
            children: [],
          }]
        }
      }
      const [child] = node.children as Text[]
      return { ...convertText(child), partOfThought: true }
    }
    return null
  }

  /** Convert PreBlock array to Block array. */
  const convertToBlock = (nodes: PreBlock[]): Block[] => nodes.map(node => {
    if (node.children.length > 0) return { ...node, children: convertToBlock(node.children) } as Block
    else return node as Block
  })

  /** Converts each Array of HimalayaNodes to PreBlock. */
  const convert = (nodes: (Element | Text)[]): PreBlock[] | PreBlock => {
    const blocks = nodes.map(node => {
      // convert Text directly to PreBlock
      if (node.type === 'text') {
        return convertText(node)
      }
      // convert formatting tag
      if (node.tagName === 'i' || node.tagName === 'b' || node.tagName === 'span') {
        return convertFormattingTags(node)!
      }
      // convert children of ul
      if (node.tagName === 'ul') {
        return convert(node.children as (Element | Text)[])
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
    return blocks.length > 1 ? joinChildren(blocks) : blocks.flat()
  }

  /** Clear himalaya's output and converts to Block. */
  const convertHimalayaToBlock = (nodes: HimalayaNode[]) => {
    const preBlocks = convert(removeEmptyNodesAndComments(nodes))
    return Array.isArray(preBlocks) ? convertToBlock(preBlocks) : convertToBlock([preBlocks])
  }

  return convertHimalayaToBlock(parse(html))
}
