import resolveSelectionColors from '../resolveSelectionColors'

describe('resolveSelectionColors', () => {
  it('sets a foreground color and clears the background', () => {
    expect(resolveSelectionColors('foreColor', '#00c7e6', '#ffffff', '#000000')).toEqual({
      color: '#00c7e6',
      background: null,
    })
  })

  it('clears a foreground color when it matches the default', () => {
    expect(resolveSelectionColors('foreColor', '#ffffff', '#ffffff', '#000000')).toEqual({
      color: null,
      background: null,
    })
  })

  it('sets a background color with contrasting black text', () => {
    expect(resolveSelectionColors('backColor', 'rgba(0, 214, 136, 1)', '#ffffff', '#000000')).toEqual({
      color: '#000000',
      background: 'rgba(0, 214, 136, 1)',
    })
  })

  it('clears a background color when it matches the default background', () => {
    expect(resolveSelectionColors('backColor', '#000000', '#ffffff', '#000000')).toEqual({
      color: null,
      background: null,
    })
  })

  it('distinguishes opaque white from translucent note white', () => {
    expect(resolveSelectionColors('foreColor', '#ffffff', 'rgba(255, 255, 255, 0.5)', '#000000')).toEqual({
      color: '#ffffff',
      background: null,
    })
  })
})
