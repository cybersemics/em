import { expect, it } from 'vitest'
import textToHtml from '../textToHtml'

it('converts RTF formatting to supported inline tags', () => {
  const rtf =
    '{\\rtf1\\ansi plain \\b bold\\b0 \\i italic\\i0 \\ul underline\\ulnone \\strike strike\\strike0\\par next line}'

  const html = textToHtml(rtf)

  expect(html).toContain('<b>bold</b>')
  expect(html).toContain('<i>italic</i>')
  expect(html).toContain('<u>underline</u>')
  expect(html).toContain('<strike>strike</strike>')
  expect(html).toContain('<li>next line</li>')
})

it('strips RTF color and font size controls', () => {
  const rtf =
    '{\\rtf1\\ansi{\\fonttbl{\\f0\\fswiss Helvetica;}}{\\colortbl;\\red255\\green0\\blue0;}\\f0\\fs48\\cf1 Big\\cf0\\fs24 normal}'

  const html = textToHtml(rtf)

  expect(html).toContain('Big')
  expect(html).toContain('normal')
  expect(html).not.toContain('cf1')
  expect(html).not.toContain('fs48')
  expect(html).not.toContain('<font')
  expect(html).not.toContain('Helvetica')
})
