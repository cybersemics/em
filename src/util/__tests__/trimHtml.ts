import trimHtml from '../trimHtml'

it('trims leading whitespace', () => {
  expect(trimHtml(' <b>Hello, world!</b>')).toBe('<b>Hello, world!</b>')
})

it('trims trailing whitespace', () => {
  expect(trimHtml('<b>Hello, world!</b> ')).toBe('<b>Hello, world!</b>')
})

it('trims leading whitespace within tags', () => {
  expect(trimHtml('<b> Hello, world!</b>')).toBe('<b>Hello, world!</b>')
})

it('trims trailing whitespace within tags', () => {
  expect(trimHtml('<b>Hello, world! </b>')).toBe('<b>Hello, world!</b>')
})

it('trims leading and trailing whitespace, including within tags', () => {
  expect(trimHtml(` <b> <i> Hello, world! </i> </b> `)).toBe('<b><i>Hello, world!</i></b>')
})

it('preserves formatting within the content', () => {
  expect(trimHtml(' <b> <i> Hello, <u>world!</u> </i> </b> ')).toBe('<b><i>Hello, <u>world!</u></i></b>')
})
