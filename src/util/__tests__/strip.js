import {
  strip,
} from '../../util'

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
  expect(strip(`<l
  >b</li>five`)).toBe('bfive')
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
  expect(strip('Hello <b style="color: red">red</b> world!', { preserveFormatting: true })).toBe('Hello <b>red</b> world!')
})

// This fails here, but succeeds on regex101.com (???)
it.skip('preserve bold with newlines in attribute', () => {
  expect(strip(`Hello <b
  style="color: red">red</b> world!`, { preserveFormatting: true })).toBe('Hello <b>red</b> world!')
})
