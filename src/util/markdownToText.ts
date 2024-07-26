import { Token, Tokens, marked } from 'marked'

/**
 * Collapse sibling-less scoped thoughts to the respective parent.
 *
 * NOTE: This function should only be used within the scope of `markdownToText`
 * in order to ensure that `=scope` is always the first child of thought.
 * */
const collapse = (text: string): string => {
  /**
   * This function takes in plain-text thoughts and collapses sibling-less scoped
   * thoughts to the respective parent (if any exists).
   *
   * ```
   * - Parent
   *   - {" "}
   *     - =scope
   *     - Child
   *     - Child2
   * - Parent with multiple children that can't be collapsed
   *   - ${" "}
   *     - =scope
   *     - Child
   *     - Child2
   *   - Another child
   * ```
   *
   * becomes:
   *
   * ```
   * - Parent
   *   - =scope
   *   - Child
   *   - Child2
   * - Parent with multiple children that can't be collapsed
   *   - ${" "}
   *     - =scope
   *     - Child
   *     - Child2
   *   - Another child
   * ```
   */

  // Split lines, will be mutated as we iterate over.
  const lines = text.split('\n')

  // Iterate over the lines while splicing collapsed thoughts.
  // This is necessary to account for nested collapsing thoughts.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]
    const previousLine = lines[i - 1]

    /** Find the indentation of a line. */
    const getIndent = (line: string) => line.search(/\S|$/) / 2

    // Current line's indentation
    const indent = getIndent(line)

    if (
      // Empty thought
      line.trim() === '-' &&
      // with a nested scope attribute
      nextLine?.trimEnd() === `${'  '.repeat(indent + 1)}- =scope` &&
      // as first child of the previous thought
      previousLine &&
      getIndent(previousLine) === indent - 1
    ) {
      // Accumulate all lines to outdent
      const outdentedChildren = [nextLine.slice(2)]

      // Iterate over the rest of the lines and outdent children until we either:
      // - Find a sibling -> can't collapse; break
      // - Find a next parent -> no sibling, commit all outdented children; break
      // - Reach the end of the list -> commit all outdented children
      for (let j = i + 2; j < lines.length; j++) {
        const lineIndent = getIndent(lines[j])

        if (lineIndent === indent) {
          // We found a sibling and can't collapse
          break
        } else if (lineIndent < indent || j === lines.length - 1) {
          // We've found the next parent or reached the end, commit all outdented lines
          lines.splice(i, 1 + outdentedChildren.length, ...outdentedChildren)
          break
        } else {
          // Outdent the child and add it to the accumulator
          outdentedChildren.push(lines[j].slice(2))
        }
      }
    }
  }

  return lines.join('\n')
}

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

    for (const token of tokens) {
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
        case 'list':
          result += `${indent(stack.length)}- ${' '}\n`
          result += `${indent(stack.length + 1)}- =scope\n`

          if (token.ordered) {
            result += `${indent(stack.length + 1)}- =numbered\n`
          }

          processTokens(token.items, parentDepth + stack.length + 1)
          break
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
          result += `${indent(stack.length)}- ${' '}\n`
          result += `${indent(stack.length + 1)}- =scope\n`
          result += `${indent(stack.length + 1)}- =view\n`
          result += `${indent(stack.length + 2)}- Table\n`

          // Handle 2-column tables separately
          if (token.header.length === 2) {
            for (const [left, right] of token.rows) {
              result += `${indent(stack.length + 1)}- ${processInlineTokens(left.tokens)}\n`
              result += `${indent(stack.length + 2)}- ${processInlineTokens(right.tokens)}\n`
            }
            break
          }

          // Handle other tables
          const headers = token.header
            .slice(1)
            .map((header: Tokens.TableCell) => processInlineTokens(header.tokens ?? header.text))

          for (const [left, ...cells] of token.rows) {
            result += `${indent(stack.length + 1)}- ${processInlineTokens(left.tokens)}\n`
            for (const [i, cell] of cells.entries()) {
              result += `${indent(stack.length + 2)}- ${headers[i]}\n`
              result += `${indent(stack.length + 3)}- ${processInlineTokens(cell.tokens)}\n`
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

  return collapse(result)
}
