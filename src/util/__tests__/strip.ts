import strip from '../../util/strip'

it('self-closing tags', () => {
  expect(strip('a<br/>')).toBe('a')
})

it('self-closing tags with variable inner whitespace', () => {
  expect(strip('a<br   />')).toBe('a')
})

it('inline', () => {
  expect(strip('<span>b</span>five')).toBe('bfive')
})

it('tag with attribute', () => {
  expect(strip('<span style="color: blue">b</span>five')).toBe('bfive')
})

it('newlines', () => {
  expect(
    strip(`<l
  >b</li>five`),
  ).toBe('bfive')
})

it('preserve bold', () => {
  expect(strip('Hello <b>world</b>', { preserveFormatting: true })).toBe('Hello <b>world</b>')
})

it('preserve italic', () => {
  expect(strip('Hello <i>sun</i>', { preserveFormatting: true })).toBe('Hello <i>sun</i>')
})

it('preserve underline', () => {
  expect(strip('Hello <u>sky</u>', { preserveFormatting: true })).toBe('Hello <u>sky</u>')
})

it('preserve bold with value-less attribute', () => {
  expect(strip('Hello <b m>red</b> world!', { preserveFormatting: true })).toBe('Hello <b>red</b> world!')
})

it('preserve bold with attribute', () => {
  expect(strip('Hello <b style="color: red">red</b> world!', { preserveFormatting: true })).toBe(
    'Hello <b>red</b> world!',
  )
})

it('empty formatting tags', () => {
  expect(strip('<b></b>', { preserveFormatting: true })).toBe('')
})

it('empty formatting tags multiline', () => {
  expect(
    strip(
      `<b>
  
      </b>`,
      { preserveFormatting: true },
    ),
  ).toBe('')
})

it('preserve bold with newlines in attribute', () => {
  expect(
    strip(
      `Hello <b
  style="color: red">red</b> world!`,
      { preserveFormatting: true },
    ),
  ).toBe('Hello <b>red</b> world!')
})

it('strips spaces inside formatting tags', () => {
  expect(strip('<i><b> Hello, world! </b></i>', { preserveFormatting: true })).toBe('<i><b>Hello, world!</b></i>')
})

it('does not strip spaces between formatting tags', () => {
  expect(strip('<i><b> foo </b>bar<b> baz </b></i>', { preserveFormatting: true })).toBe(
    '<i><b>foo </b>bar<b> baz</b></i>',
  )
})

it('preserves nested formatting tags', () => {
  expect(strip('<b><i>Hello</i> world</b>', { preserveFormatting: true })).toBe('<b><i>Hello</i> world</b>')
})

it('preventTrim preserves leading and trailing whitespace', () => {
  expect(strip('   Hello   ', { preventTrim: true })).toBe('   Hello   ')
})

it('input with only whitespace', () => {
  expect(strip('   ')).toBe('')
})

it('empty input returns empty string', () => {
  expect(strip('')).toBe('')
})
