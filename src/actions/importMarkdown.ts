import _ from 'lodash'
import { Token, Tokens, marked } from 'marked'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import importText, { ImportTextPayload } from './importText'

export interface ImportMarkdownPayload extends ImportTextPayload {}

/** Converts markdown to text compatible with `importText`. */
export const convertMarkdownToText = (markdown: string): string => {
  const tokens = marked.lexer(markdown)

  // Accumulate the result
  let result = '\n'

  /** Converts and combines inline tokens to a string. */
  const processInlineTokens = (tokens: Token[] | string) => {
    // Convenience for allowing to pass in a string directly, allows skipping ternaries when calling recursively.
    if (typeof tokens === 'string') return tokens

    let str = ''

    for (const token of tokens) {
      switch (token.type) {
        case 'text':
          str += token.text.replace(/\n/g, '&#10;')
          break
        case 'em':
          str += `<i>${processInlineTokens(token.tokens ?? token.text)}</i>`
          break
        case 'strong':
          str += `<b>${processInlineTokens(token.tokens ?? token.text)}</b>`
          break
        case 'del':
          str += `<strike>${processInlineTokens(token.tokens ?? token.text)}</strike>`
          break
        case 'link':
          if (token.href === token.text) str += token.text
          else str += `<a href="${token.href}">${processInlineTokens(token.tokens ?? token.text)}</a>`
          break
        case 'image':
          str += `<img src="${token.href}" alt="${token.text}" title="${token.title}" />`
          break
        case 'codespan':
          str += `<code>${token.text}</code>`
          break

        default:
          console.warn('Unknown inline token:', token.type)
          break
      }
    }

    return str
  }

  /** Processes markdown tokens recursively and incrementally builds the result. */
  const processTokens = (tokens: Token[], parentDepth = 0) => {
    // Stack of depths to determine indentation, scoped to the current parent
    const stack: number[] = []

    /** Helper function to get the indentation for a given depth. */
    const getIndent = (depth: number) => '  '.repeat(depth + parentDepth)

    for (const token of tokens) {
      switch (token.type) {
        case 'space':
          // Ignore
          break
        case 'heading':
          while (stack.length && stack[stack.length - 1] >= token.depth) {
            stack.pop()
          }
          result += `${getIndent(stack.length)}- ${processInlineTokens(token.tokens ?? token.text)}\n`
          stack.push(token.depth)
          break
        case 'text':
          result += `${getIndent(stack.length)}- ${processInlineTokens(
            'tokens' in token && token.tokens?.length ? token.tokens : token.text,
          )}\n`
          break
        case 'paragraph':
          // Collapse image paragraphs. This supports multiple images within one paragraph, usually
          // separated by newline text blocks.
          if (
            // First block must be an image
            token.tokens?.[0].type === 'image' &&
            // All other blocks must be images or newlines
            token.tokens.every(token => token.type === 'image' || (token.type === 'text' && token.text === '\n'))
          ) {
            processTokens(
              token.tokens.filter(token => token.type === 'image'),
              parentDepth + stack.length,
            )
            break
          }

          result += `${getIndent(stack.length)}- ${processInlineTokens(
            token.tokens
              // Replace single newlines with spaces
              ?.map(token => (token.type === 'text' && token.text === '\n' ? { ...token, text: ' ' } : token)) ??
              token.text,
          )}\n`
          break
        case 'hr':
          result += `${getIndent(stack.length)}- ---\n`
          break
        case 'list':
          processTokens(token.items, parentDepth + stack.length)
          break
        case 'list_item': {
          if (!token.tokens?.length) {
            result += `${getIndent(stack.length)}- ${processInlineTokens(token.text)}\n`
            break
          }

          const [first, ...rest] = token.tokens

          // Process the first token with the same depth as the list item
          processTokens([first], parentDepth + stack.length)

          // Process the rest with an increased depth
          processTokens(rest, parentDepth + stack.length + 1)
          break
        }
        case 'blockquote': {
          if (!token.tokens?.length) {
            result += `${getIndent(stack.length)}- ${token.text}\n`
            result += `${getIndent(stack.length + 1)}- =blockquote\n`
            break
          }

          const [first, ...rest] = token.tokens

          // Process the first token with the same depth as the list item
          processTokens([first], parentDepth + stack.length)

          // Insert the blockquote meta attribute as first child
          result += `${getIndent(stack.length + 1)}- =blockquote\n`

          // Process the rest with an increased depth
          processTokens(rest, parentDepth + stack.length + 1)
          break
        }
        case 'image':
          result += `${getIndent(stack.length)}- =image\n`
          result += `${getIndent(stack.length + 1)}- ${token.href}\n`
          if (token.title?.length && token.title !== token.href)
            result += `${getIndent(stack.length + 2)}- ${token.title}\n`
          break
        case 'code':
          result += `${getIndent(stack.length)}- ${token.text.replace(/\n/g, '&#10;')}\n`
          result += `${getIndent(stack.length + 1)}- =code\n`
          break
        case 'table': {
          result += `${getIndent(stack.length)}- Table\n`
          result += `${getIndent(stack.length + 1)}- =view\n`
          result += `${getIndent(stack.length + 2)}- Table\n`

          // Handle 2-column tables separately
          if (token.header.length === 2) {
            for (const [left, right] of token.rows) {
              result += `${getIndent(stack.length + 1)}- ${processInlineTokens(left.tokens)}\n`
              result += `${getIndent(stack.length + 2)}- ${processInlineTokens(right.tokens)}\n`
            }
            break
          }

          // Handle other tables
          const headers = token.header
            .slice(1)
            .map((header: Tokens.TableCell) => processInlineTokens(header.tokens ?? header.text))

          for (const [left, ...cells] of token.rows) {
            result += `${getIndent(stack.length + 1)}- ${processInlineTokens(left.tokens)}\n`
            for (const [i, cell] of cells.entries()) {
              result += `${getIndent(stack.length + 2)}- ${headers[i]}\n`
              result += `${getIndent(stack.length + 3)}- ${processInlineTokens(cell.tokens)}\n`
            }
          }

          break
        }

        default:
          console.warn('unknown token', token.type, token)
          break
      }
    }
  }

  processTokens(tokens)

  return result
}

/** Imports thoughts from markdown. */
const importMarkdown = (state: State, payload: ImportMarkdownPayload): State => {
  const parsed = convertMarkdownToText(payload.text)
  return importText(state, { ...payload, text: parsed })
}

/** Action creator for importing markdown. */
export const importMarkdownActionCreator =
  (payload: ImportTextPayload): Thunk =>
  dispatch =>
    dispatch({ type: 'importMarkdown', ...payload })

export default _.curryRight(importMarkdown)
