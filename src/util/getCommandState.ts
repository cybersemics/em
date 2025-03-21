import CommandState from '../@types/CommandState'

/**
 * Detects inline styles from HTML-wrapped thought value.
 */
const getCommandState = (html: string): CommandState => {
  const container = document.createElement('div')
  container.innerHTML = html

  const node = container.firstElementChild as HTMLElement | null

  return {
    bold: node?.style.fontWeight === 'bold' || node?.style.fontWeight === '700',
    italic: node?.style.fontStyle === 'italic',
    underline: node?.style.textDecoration.includes('underline'),
    strikethrough: node?.style.textDecoration.includes('line-through'),
    code: node?.style.fontFamily?.toLowerCase().includes('monospace') ?? false,
    foreColor: node?.style.color || undefined,
    backColor: node?.style.backgroundColor || undefined,
  }
}

export default getCommandState
