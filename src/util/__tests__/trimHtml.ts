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

// https://github.com/cybersemics/em/issues/5084
it.each(['&nbsp;', '&#160;', '&#xA0;', '&#32;', '&#x20;'])('trims boundary %s entities inside formatting', space => {
  expect(trimHtml(`${space}<b>${space}hello${space}</b>${space}`)).toBe('<b>hello</b>')
})

it('preserves interior entities, attributes, and line breaks', () => {
  expect(trimHtml(' <span style="color: red">one&nbsp; two<br>three</span> ')).toBe(
    '<span style="color: red">one&nbsp; two<br>three</span>',
  )
})

it('does not decode escaped entity text', () => {
  expect(trimHtml(' &amp;nbsp;hello&amp;nbsp; ')).toBe('&amp;nbsp;hello&amp;nbsp;')
})
