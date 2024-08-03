import { Token, Tokens, marked } from 'marked'

/** Converts markdown to text compatible with `importText`. */
export const markdownToText = (markdown: string): string => {
  const tokens = marked.lexer(markdown.trim())

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
    const indent = (depth: number) => '  '.repeat(depth + parentDepth)

    for (const [index, token] of tokens.entries()) {
      /** Checks if the current token needs to be added to a special ::/=scope thought to separate it from its siblings. Needed for tables and ordered lists that are to be rendered at the same level with other siblings. */
      const shouldScope = () => {
        const prevHeadingIndex = tokens
          .slice(0, index)
          .reverse()
          .findIndex(t => t.type === 'heading')
        const prevHeadingActualIndex = prevHeadingIndex === -1 ? -1 : index - 1 - prevHeadingIndex

        const nextHeadingIndex = tokens.slice(index + 1).findIndex(t => t.type === 'heading')
        const nextHeadingActualIndex = nextHeadingIndex === -1 ? -1 : index + 1 + nextHeadingIndex

        // Siblings are only considered at the same stack depth
        const siblings = tokens
          .slice(prevHeadingActualIndex + 1, nextHeadingActualIndex === -1 ? undefined : nextHeadingActualIndex)
          .filter(t => t.type !== 'space')

        if (token.type === 'list') {
          // If the list is ordered, we always need a scope if there are any other siblings or if we're at the top level.
          if (token.ordered) return siblings.length > 1 || (parentDepth === 0 && prevHeadingActualIndex === -1)

          // If the list is unordered, check if there are paragraph siblings
          return siblings.some(t => t.type === 'paragraph')
        } else if (token.type === 'table') {
          // If the table is the only sibling or at the top level, we don't need a scope. Otherwise, we do.
          return siblings.length > 1 || (parentDepth === 0 && prevHeadingActualIndex === -1)
        }

        return false
      }

      switch (token.type) {
        case 'space':
          // Ignore
          break
        case 'heading':
          while (stack.length && stack[stack.length - 1] >= token.depth) {
            stack.pop()
          }
          result += `${indent(stack.length)}- ${processInlineTokens(token.tokens ?? token.text)}\n`
          stack.push(token.depth)
          break
        case 'text':
          result += `${indent(stack.length)}- ${processInlineTokens(
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

          result += `${indent(stack.length)}- ${processInlineTokens(
            token.tokens
              // Replace single newlines with spaces
              ?.map(token => (token.type === 'text' && token.text === '\n' ? { ...token, text: ' ' } : token)) ??
              token.text,
          )}\n`
          break
        case 'hr':
          result += `${indent(stack.length)}- ---\n`
          break
        case 'list': {
          const scope = shouldScope()
          const currentIndent = scope ? stack.length + 1 : stack.length

          if (scope) {
            result += `${indent(stack.length)}- ::\n`
            result += `${indent(stack.length + 1)}- =scope\n`
          }

          if (token.ordered) {
            result += `${indent(currentIndent)}- =ordered\n`
          }

          processTokens(token.items, scope ? parentDepth + currentIndent : parentDepth + currentIndent)
          break
        }
        case 'list_item': {
          if (!token.tokens?.length) {
            result += `${indent(stack.length)}- ${processInlineTokens(token.text)}\n`
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
            result += `${indent(stack.length)}- ${token.text}\n`
            result += `${indent(stack.length + 1)}- =blockquote\n`
            break
          }

          const [first, ...rest] = token.tokens

          // Process the first token with the same depth as the list item
          processTokens([first], parentDepth + stack.length)

          // Insert the blockquote meta attribute as first child
          result += `${indent(stack.length + 1)}- =blockquote\n`

          // Process the rest with an increased depth
          processTokens(rest, parentDepth + stack.length + 1)
          break
        }
        case 'image':
          result += `${indent(stack.length)}- =image\n`
          result += `${indent(stack.length + 1)}- ${token.href}\n`
          if (token.title?.length && token.title !== token.href)
            result += `${indent(stack.length + 2)}- ${token.title}\n`
          break
        case 'code':
          result += `${indent(stack.length)}- ${token.text.replace(/\n/g, '&#10;')}\n`
          result += `${indent(stack.length + 1)}- =code\n`
          break
        case 'table': {
          const scope = shouldScope()
          const currentIndent = scope ? stack.length + 1 : stack.length

          if (scope) {
            result += `${indent(stack.length)}- ::\n`
            result += `${indent(stack.length + 1)}- =scope\n`
          }

          result += `${indent(currentIndent)}- =view\n`
          result += `${indent(currentIndent + 1)}- Table\n`

          // Handle 2-column tables separately
          if (token.header.length === 2) {
            for (const [left, right] of token.rows) {
              result += `${indent(currentIndent)}- ${processInlineTokens(left.tokens)}\n`
              result += `${indent(currentIndent + 1)}- ${processInlineTokens(right.tokens)}\n`
            }
            break
          }

          // Handle other tables
          const headers = token.header
            .slice(1)
            .map((header: Tokens.TableCell) => processInlineTokens(header.tokens ?? header.text))

          for (const [left, ...cells] of token.rows) {
            result += `${indent(currentIndent)}- ${processInlineTokens(left.tokens)}\n`
            for (const [i, cell] of cells.entries()) {
              result += `${indent(currentIndent + 1)}- ${headers[i]}\n`
              result += `${indent(currentIndent + 2)}- ${processInlineTokens(cell.tokens)}\n`
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
