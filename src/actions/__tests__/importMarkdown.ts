import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'
import importMarkdown, { convertMarkdownToText } from '../importMarkdown'

describe('convertMarkdownToText', () => {
  it('should import headings', () => {
    const markdown = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
`

    expect(convertMarkdownToText(markdown)).toBe(`
- H1
  - H2
    - H3
      - H4
        - H5
          - H6
`)
  })

  it('should respect indentation when navigating up and down headings', () => {
    const markdown = `
# Heading 1
a
## Heading 2
b
### Heading 3
c
## Heading 2 again
d
#### Heading 4
e
# Heading 1 again
f
### Heading 3 again
g
`
    expect(convertMarkdownToText(markdown)).toBe(`
- Heading 1
  - a
  - Heading 2
    - b
    - Heading 3
      - c
  - Heading 2 again
    - d
    - Heading 4
      - e
- Heading 1 again
  - f
  - Heading 3 again
    - g
`)
  })

  it('should handle nested headings', () => {
    const markdown = `
- List Item 1
- ## List Item 2
- List Item 3
`
    expect(convertMarkdownToText(markdown)).toBe(`
- List Item 1
- List Item 2
- List Item 3
`)
  })

  it('should import emphasis', () => {
    const markdown = `
*italic*
_italic_
**bold**
__bold__
***bold italic***
~~strikethrough~~
`
    expect(convertMarkdownToText(markdown)).toBe(`
- <em>italic</em> <em>italic</em> <strong>bold</strong> <strong>bold</strong> <em><strong>bold italic</strong></em> <del>strikethrough</del>
`)
  })

  it('should import lists', () => {
    const markdown = `
1. First ordered item
2. Second ordered item
   * Unordered sub-list
* Unordered item
- Another unordered item
+ Yet another unordered item
`
    expect(convertMarkdownToText(markdown)).toBe(`
- First ordered item
- Second ordered item
  - Unordered sub-list
- Unordered item
- Another unordered item
- Yet another unordered item
`)
  })

  it('should import links and resolve reference links', () => {
    const markdown = `
[Inline link](https://example.com)
[Inline link with title](https://example.com "Example")

[Reference link][ref]

[ref]: https://example.com
`
    expect(convertMarkdownToText(markdown)).toBe(`
- <a href="https://example.com">Inline link</a> <a href="https://example.com">Inline link with title</a>
- <a href="https://example.com">Reference link</a>
`)
  })

  it('should import images', () => {
    const markdown = `
![Alt text](https://example.com/image.jpg)

![Alt text with title](https://example.com/image.jpg "Image title")
`
    expect(convertMarkdownToText(markdown)).toBe(`
- =image
  - https://example.com/image.jpg
- =image
  - https://example.com/image.jpg
    - Image title
`)
  })

  it('should import inline images as html tag', () => {
    const markdown = `
Here's an inline image ![Alt text](https://example.com/image.jpg "Image").
`
    expect(convertMarkdownToText(markdown)).toBe(`
- Here&#39;s an inline image <img src="https://example.com/image.jpg" alt="Alt text" title="Image" />.
`)
  })

  it('should import code', () => {
    const markdown = `
Inline \`code\` has \`back-ticks around\` it.

\`\`\`javascript
var s = "JavaScript";
alert(s);
\`\`\`
`
    expect(convertMarkdownToText(markdown)).toBe(`
- Inline <code>code</code> has <code>back-ticks around</code> it.
- =code
  - var s = "JavaScript";&#10;alert(s);
`)
  })

  it('should import two-column tables', () => {
    const markdown = `
| Column 1 | Column 2 |
|----------|:--------:|
| Left     | Right    |
| 1        | 2        |
| apple    | orange   |
`
    expect(convertMarkdownToText(markdown)).toBe(`
- Table
  - =view
    - Table
  - Left
    - Right
  - 1
    - 2
  - apple
    - orange
`)
  })

  it('should import multi-column tables', () => {
    const markdown = `
|          | Color  |    Type    |
|----------|:------:|-----------:|
| Apple    | Red    | Seed       |
| Banana   | Yellow | Tropical   |
| Tangerine| Orange | Citrus     |
`
    expect(convertMarkdownToText(markdown)).toBe(`
- Table
  - =view
    - Table
  - Apple
    - Color
      - Red
    - Type
      - Seed
  - Banana
    - Color
      - Yellow
    - Type
      - Tropical
  - Tangerine
    - Color
      - Orange
    - Type
      - Citrus
`)
  })

  it('should import blockquotes', () => {
    const markdown = `
> This is a blockquote
> with multiple lines

> Nested blockquotes
>> are also possible
`
    expect(convertMarkdownToText(markdown)).toBe(`
- =blockquote
  - This is a blockquote&#10;with multiple lines
- =blockquote
  - Nested blockquotes
  - =blockquote
    - are also possible
`)
  })

  it('should import horizontal rules', () => {
    const markdown = `
---
***
___
`
    expect(convertMarkdownToText(markdown)).toBe(`
- ---
- ---
- ---
`)
  })

  it('should import complex nested structures', () => {
    const markdown = `
# Main Topic
## Subtopic 1
* List item 1
* List item 2
  1. Nested ordered item
  2. Another nested item
     \`\`\`
     Code block inside list
     \`\`\`
## Subtopic 2
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

* List item 3
  * Nested list item 1
    ## Heading inside list
    nested
    # Heading inside list
    nested
  * Nested list item 2

---

* List item 4
`
    expect(convertMarkdownToText(markdown)).toBe(`
- Main Topic
  - Subtopic 1
    - List item 1
    - List item 2
      - Nested ordered item
      - Another nested item
        - =code
          - Code block inside list
  - Subtopic 2
    - Table
      - =view
        - Table
      - Cell 1
        - Cell 2
      - Cell 3
        - Cell 4
    - List item 3
      - Nested list item 1
        - Heading inside list
          - nested
        - Heading inside list
          - nested
      - Nested list item 2
    - ---
    - List item 4
`)
  })
})

describe('importMarkdown', () => {
  /**
   * The bulk of the tests are in convertMarkdownToText.
   * This test is just to ensure that the importMarkdown action
   * works as expected.
   */

  it('should import markdown', () => {
    const markdown = `
# Heading 1
a
## Heading 2
b
### Heading 3
c
## Heading 2 again
d
#### Heading 4
e
# Heading 1 again
f
### Heading 3 again
g
`

    const steps = [importMarkdown({ text: markdown })]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Heading 1
    - a
    - Heading 2
      - b
      - Heading 3
        - c
    - Heading 2 again
      - d
      - Heading 4
        - e
  - Heading 1 again
    - f
    - Heading 3 again
      - g`)
  })
})
