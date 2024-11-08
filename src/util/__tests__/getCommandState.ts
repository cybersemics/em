import getCommandState from '../getCommandState'

it('empty thought', () => {
  expect(getCommandState('')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
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
    foreColor: undefined,
    backColor: undefined,
  })
})

it('partially styled thought', () => {
  expect(getCommandState('<b>Bold</b><i>Italic</i><u>Underline</u><strike>strikethrough</strike>')).toStrictEqual({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
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
    foreColor: undefined,
    backColor: 'rgb(0, 0, 255)',
  })
})

it('fully styled thought', () => {
  expect(
    getCommandState(
      '<b><i><u><strike><font color="rgb(255, 0, 0)"><span style="background-color: rgb(0, 0, 255)">text</span></font></strike></u></i></b>',
    ),
  ).toStrictEqual({
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    foreColor: 'rgb(255, 0, 0)',
    backColor: 'rgb(0, 0, 255)',
  })
})
