import visibleScrollRange from '../visibleScrollRange'

describe('visibleScrollRange', () => {
  it('keeps one viewport slack unit of the first thought visible at the upward limit', () => {
    expect(
      visibleScrollRange({
        visibleTop: 5000,
        visibleBottom: 5100,
        viewportHeight: 1000,
        topInset: 100,
        slackY: 10,
        documentHeight: 8000,
      }),
    ).toEqual({ minScroll: 4010, maxScroll: 4990 })
  })

  it('allows scrolling through a visible cluster taller than the viewport', () => {
    expect(
      visibleScrollRange({
        visibleTop: 1000,
        visibleBottom: 4000,
        viewportHeight: 1000,
        topInset: 100,
        slackY: 10,
        documentHeight: 5000,
      }),
    ).toEqual({ minScroll: 10, maxScroll: 3890 })
  })

  it('preserves the physical top of the document for root thoughts', () => {
    expect(
      visibleScrollRange({
        visibleTop: 100,
        visibleBottom: 2000,
        viewportHeight: 1000,
        topInset: 100,
        slackY: 10,
        documentHeight: 3000,
      }),
    ).toEqual({ minScroll: 0, maxScroll: 1890 })
  })

  it('accounts for fixed content at the top of the viewport', () => {
    expect(
      visibleScrollRange({
        visibleTop: 1000,
        visibleBottom: 1200,
        viewportHeight: 1000,
        topInset: 150,
        slackY: 10,
        documentHeight: 3000,
      }),
    ).toEqual({ minScroll: 10, maxScroll: 1040 })
  })

  it('clamps both limits to the physical document range', () => {
    expect(
      visibleScrollRange({
        visibleTop: 5000,
        visibleBottom: 6000,
        viewportHeight: 1000,
        topInset: 100,
        slackY: 10,
        documentHeight: 1500,
      }),
    ).toEqual({ minScroll: 500, maxScroll: 500 })
  })

  it('does not constrain scrolling when there is no valid visible cluster', () => {
    expect(
      visibleScrollRange({
        visibleTop: Infinity,
        visibleBottom: -Infinity,
        viewportHeight: 1000,
        topInset: 100,
        slackY: 10,
        documentHeight: 3000,
      }),
    ).toEqual({ minScroll: 0, maxScroll: 2000 })
  })
})
