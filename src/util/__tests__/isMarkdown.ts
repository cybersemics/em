import isMarkdown from '../isMarkdown'

describe('isMarkdown', () => {
  it('should identify markdown with headings', () => {
    const markdown = `
plain text before heading

# Heading 1
    `
    expect(isMarkdown(markdown)).toBe(true)
  })

  it('should identify markdown with links', () => {
    const markdown = `
This is a [link](https://example.com)
    `
    expect(isMarkdown(markdown)).toBe(true)
  })

  it('should identify markdown with images', () => {
    const markdown = `
- List item 1
- List item 2
- List item 3

![Alt text](https://example.com/image.jpg)
    `
    expect(isMarkdown(markdown)).toBe(true)
  })

  it('should not identify plain text as markdown', () => {
    const plainText = `
This is just plain text.
It has no markdown elements.
    `
    expect(isMarkdown(plainText)).toBe(false)
  })

  it('should not identify HTML as markdown', () => {
    const html = `
<h1>This is HTML</h1>
<p>This is a paragraph with a <a href="https://example.com">link</a>.</p>
<img src="https://example.com/image.jpg" alt="Image">
    `
    expect(isMarkdown(html)).toBe(false)
  })
})
