import getCommandState from '../getCommandState'

it('empty thought', () => {
  expect(getCommandState('')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('bold thought', () => {
  expect(getCommandState('<b>text</b>')).toStrictEqual({
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('italic thought', () => {
  expect(getCommandState('<i>text</i>')).toStrictEqual({
    bold: false,
    italic: true,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('underline thought', () => {
  expect(getCommandState('<u>text</u>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: true,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('strikethrough thought', () => {
  expect(getCommandState('<strike>text</strike>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: true,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('code thought', () => {
  expect(getCommandState('<code>text</code>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: true,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('partially styled thought', () => {
  expect(
    getCommandState('<b>Bold</b><i>Italic</i><u>Underline</u><strike>strikethrough</strike><code>code</code>'),
  ).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('text color thought', () => {
  expect(getCommandState('<font color="rgb(255, 0, 0)">text</font>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: 'rgb(255, 0, 0)',
    backColor: undefined,
  })
})

it('background color thought', () => {
  expect(getCommandState('<span style="background-color: rgb(0, 0, 255)">text</span>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: 'rgb(0, 0, 255)',
  })
})

it('text and background color on font tag', () => {
  expect(getCommandState('<font color="#000000" style="background-color: rgb(0, 0, 255);">a</font>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: '#000000',
    backColor: 'rgb(0, 0, 255)',
  })
})

// NOT IMPLEMENTED
it.skip('text and background color on span tag', () => {
  expect(getCommandState('<span style="color: #000000; background-color: rgb(0, 0, 255);">a</span>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: '#000000',
    backColor: 'rgb(0, 0, 255)',
  })
})

it('partially styled thought with color and background color', () => {
  expect(
    getCommandState(
      '<b><i><u><strike><code><font color="#000000" style="background-color: rgb(0, 0, 255)">text</font> but only partly</code></strike></u></i></b>',
    ),
  ).toStrictEqual({
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: true,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('fully styled thought', () => {
  expect(
    getCommandState(
      '<b><i><u><strike><code><font color="rgb(255, 0, 0)"><span style="background-color: rgb(0, 0, 255)">text</span></font></code></strike></u></i></b>',
    ),
  ).toStrictEqual({
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: true,
    foreColor: 'rgb(255, 0, 0)',
    backColor: 'rgb(0, 0, 255)',
  })
})

it('fully styled thought without text content', () => {
  expect(
    getCommandState(
      '<b><i><u><strike><code><font color="rgb(255, 0, 0)"><span style="background-color: rgb(0, 0, 255)"></span></font></code></strike></u></i></b>',
    ),
  ).toStrictEqual({
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: true,
    foreColor: 'rgb(255, 0, 0)',
    backColor: 'rgb(0, 0, 255)',
  })
})

it('nested colors should use the inner one', () => {
  expect(getCommandState('<font color="rgb(255, 0, 0)"><font color="rgb(0, 0, 255)">text</font></font>')).toStrictEqual(
    {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      code: false,
      foreColor: 'rgb(0, 0, 255)',
      backColor: undefined,
    },
  )
})

it('nested background colors should use the inner one', () => {
  expect(
    getCommandState(
      '<span style="background-color: rgb(255, 0, 0)"><span style="background-color: rgb(0, 0, 255)">text</span></span>',
    ),
  ).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: 'rgb(0, 0, 255)',
  })
})

// selection.html() returns the outer editable <div> wrapper when the caret is collapsed on the editable element
// itself (e.g. when the cursor is moved to a thought by tapping its bullet). The wrapper must not clear the command
// state (#3912).
it('bold thought wrapped in the editable div', () => {
  expect(getCommandState('<div aria-label="editable-123"><b>text</b></div>')).toStrictEqual({
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('bold thought wrapped in the editable div with empty text', () => {
  expect(getCommandState('<div aria-label="editable-123"><b></b></div>')).toStrictEqual({
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

it('partially bold thought wrapped in the editable div', () => {
  expect(getCommandState('<div aria-label="editable-123"><b>one</b> two</div>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})

// The editable div carries a placeholder attribute whose value contains raw HTML with '>' characters. Skipping
// the wrapper tag must respect quoted attribute values so the inner formatting is still parsed (#3912).
it('bold thought wrapped in the editable div with an html placeholder attribute', () => {
  expect(
    getCommandState(
      '<div aria-label="editable-1" data-editable="true" class="editable" placeholder="<b>One</b>" role="button" contenteditable="true"><b>One</b></div>',
    ),
  ).toStrictEqual({
    bold: true,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
    foreColor: undefined,
    backColor: undefined,
  })
})
