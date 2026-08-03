import morphHtml from '../morphHtml'

/** Creates a detached element containing the given HTML. */
const createElement = (html: string) => {
  const element = document.createElement('div')
  element.innerHTML = html
  return element
}

/** Returns the element's text nodes in document order. */
const textNodes = (element: HTMLElement) => {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const nodes: Node[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  return nodes
}

it('changes an element attribute without replacing the element or its text node', () => {
  const element = createElement('Hello <font color="#000000" style="background-color: rgb(0, 214, 136);">world</font>!')
  const font = element.querySelector('font')
  const world = textNodes(element)[1]

  morphHtml(element, 'Hello <font color="#ff573d">world</font>!')

  expect(element.innerHTML).toBe('Hello <font color="#ff573d">world</font>!')
  expect(element.querySelector('font')).toBe(font)
  expect(textNodes(element)[1]).toBe(world)
})

it('wraps existing text in a new element by splitting the text node rather than re-creating it', () => {
  const element = createElement('Hello world!')
  const text = element.firstChild as Text

  morphHtml(element, 'Hello <b>world</b>!')

  expect(element.innerHTML).toBe('Hello <b>world</b>!')
  // the original text node is split (which moves any selection offsets past the split point onto the new node), and
  // the remaining pieces are moved rather than replaced
  expect(textNodes(element)[0]).toBe(text)
  expect(text.data).toBe('Hello ')
})

it('unwraps an element', () => {
  const element = createElement('Hello <b>world</b>!')

  morphHtml(element, 'Hello world!')

  expect(element.innerHTML).toBe('Hello world!')
})

it('appends and removes children', () => {
  const element = createElement('<b>a</b>')
  morphHtml(element, '<b>a</b><i>b</i>')
  expect(element.innerHTML).toBe('<b>a</b><i>b</i>')

  morphHtml(element, '<b>a</b>')
  expect(element.innerHTML).toBe('<b>a</b>')
})

it('replaces an element of a different type', () => {
  const element = createElement('<b>a</b>')

  morphHtml(element, '<i>a</i>')

  expect(element.innerHTML).toBe('<i>a</i>')
})

it('preserves nested formatting when only the outer element changes', () => {
  const element = createElement('<font color="#000000"><b>bold</b> text</font>')
  const bold = element.querySelector('b')

  morphHtml(element, '<font color="#ff573d"><b>bold</b> text</font>')

  expect(element.innerHTML).toBe('<font color="#ff573d"><b>bold</b> text</font>')
  expect(element.querySelector('b')).toBe(bold)
})
