import markdownToText from '../markdownToText'

describe('markdownToText', () => {
  it('should import paragraphs', () => {
    const markdown = `
p1

p2

p3
`

    expect(markdownToText(markdown)).toBe(`
- p1
- p2
- p3
`)
  })

  // TODO: This test is skipped while we're evaluating whether to
  // import separate lines as separate thoughts.
  it.skip('should import separate lines as separate thoughts', () => {
    const markdown = `
p1
p2
p3
`

    expect(markdownToText(markdown)).toBe(`
- p1
- p2
- p3
`)
  })

  it('should import mixed paragraphs and lists', () => {
    const markdown = `
p1

p2

- a
  - b
    - c

p3
`

    expect(markdownToText(markdown)).toBe(`
- p1
- p2
- ::
  - =scope
  - a
    - b
      - c
- p3
`)
  })

  it('should import an unscoped ordered list in the root', () => {
    const markdown = `
1. First
2. Second
3. Third
`
    expect(markdownToText(markdown)).toBe(`
- =ordered
- First
- Second
- Third
`)
  })

  it('should import a heading with an unscoped ordered list followed by a heading at the same level', () => {
    const markdown = `
# Heading 1

1. a
2. b
3. c

# Heading 1 again
`

    expect(markdownToText(markdown)).toBe(`
- Heading 1
  - =ordered
  - a
  - b
  - c
- Heading 1 again
`)
  })

  // TODO: This test is skipped while we're evaluating whether to
  // import separate lines as separate thoughts.
  it.skip('should import mixed text and lists', () => {
    const markdown = `
p1
p2
- a
  - b
    - c
p3
`

    expect(markdownToText(markdown)).toBe(`
- p1
- p2
- a
  - b
    - c
- p3
`)
  })

  it('should import headings', () => {
    const markdown = `
# H1
## H2
### H3
#### H4
##### H5
###### H6
`

    expect(markdownToText(markdown)).toBe(`
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
    expect(markdownToText(markdown)).toBe(`
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

  it('should handle headings in lists', () => {
    const markdown = `
- List Item 1
- ## List Item 2
- List Item 3
`
    expect(markdownToText(markdown)).toBe(`
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
    expect(markdownToText(markdown)).toBe(`
- <i>italic</i> <i>italic</i> <b>bold</b> <b>bold</b> <i><b>bold italic</b></i> <strike>strikethrough</strike>
`)
  })

  it('should import lists', () => {
    const markdown = `
1. First ordered item
2. Second ordered item
   * Unordered sub-list that collapses
* Unordered item
- Another unordered item
+ Yet another unordered item

# The next list will collapse to this heading
1. First ordered item
2. Second ordered item
`
    expect(markdownToText(markdown)).toBe(`
- ::
  - =scope
  - =ordered
  - First ordered item
  - Second ordered item
    - Unordered sub-list that collapses
- Unordered item
- Another unordered item
- Yet another unordered item
- The next list will collapse to this heading
  - =ordered
  - First ordered item
  - Second ordered item
`)
  })

  it('should import links and resolve reference links', () => {
    const markdown = `
[Inline link](https://example.com)
[Inline link with title](https://example.com "Example")

[Reference link][ref]

[ref]: https://example.com
`
    expect(markdownToText(markdown)).toBe(`
- <a href="https://example.com">Inline link</a> <a href="https://example.com">Inline link with title</a>
- <a href="https://example.com">Reference link</a>
`)
  })

  it('should import images', () => {
    const markdown = `
![Alt text](https://example.com/image.jpg)

![Alt text with title](https://example.com/image.jpg "Image title")
`
    expect(markdownToText(markdown)).toBe(`
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
    expect(markdownToText(markdown)).toBe(`
- Here's an inline image <img src="https://example.com/image.jpg" alt="Alt text" title="Image" />.
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
    expect(markdownToText(markdown)).toBe(`
- Inline <code>code</code> has <code>back-ticks around</code> it.
- var s = "JavaScript";&#10;alert(s);
  - =code
`)
  })

  it('should import an unscoped two-column table at the root', () => {
    const markdown = `
| Column 1 | Column 2 |
|----------|:--------:|
| Left     | Right    |
| 1        | 2        |
| apple    | orange   |
`
    expect(markdownToText(markdown)).toBe(`
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

  it('should import a scoped table', () => {
    const markdown = `
p

| Column 1 | Column 2 |
|----------|:--------:|
| Left     | Right    |
| 1        | 2        |
| apple    | orange   |
`
    expect(markdownToText(markdown)).toBe(`
- p
- ::
  - =scope
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

  it('should import an unscoped table with a heading', () => {
    const markdown = `
p

# heading

| Column 1 | Column 2 |
|----------|:--------:|
| Left     | Right    |
| 1        | 2        |
| apple    | orange   |
`
    expect(markdownToText(markdown)).toBe(`
- p
- heading
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
    expect(markdownToText(markdown)).toBe(`
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
    expect(markdownToText(markdown)).toBe(`
- This is a blockquote&#10;with multiple lines
  - =blockquote
- Nested blockquotes
  - =blockquote
  - are also possible
    - =blockquote
`)
  })

  it('should import horizontal rules', () => {
    const markdown = `
---
***
___
`
    expect(markdownToText(markdown)).toBe(`
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
    expect(markdownToText(markdown)).toBe(`
- Main Topic
  - Subtopic 1
    - List item 1
    - List item 2
      - =ordered
      - Nested ordered item
      - Another nested item
        - Code block inside list
          - =code
  - Subtopic 2
    - ::
      - =scope
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
