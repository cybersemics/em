import { encodeThoughtPayload } from '../thoughtspace'

it('keeps em rank out of the serialized TreeCRDT thought payload', () => {
  const encoded = encodeThoughtPayload({
    value: 'a',
    created: 1,
    lastUpdated: 2,
    updatedBy: 'test',
  })

  expect(JSON.parse(new TextDecoder().decode(encoded))).toEqual({
    value: 'a',
    created: 1,
    lastUpdated: 2,
    updatedBy: 'test',
  })
})
