import path from 'path'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import screenshot from '../helpers/screenshot'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

describe('categorize', () => {
  it('should handle multiple categorizations/uncategorizations with long text and wide window', async () => {
    await page.setViewport({
      width: 1200,
      height: 800,
    })

    const topParagraphText =
      'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo.'
    await paste(`
      - ${topParagraphText}
        - Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet.
        - Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc, quis gravida magna mi a libero.
        - Fusce vulputate eleifend sapien. Vestibulum purus quam, scelerisque ut, mollis sed, nonummy id, metus. Nullam accumsan lorem in dui. Cras ultricies mi eu turpis hendrerit fringilla. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia.
    `)

    // Perform multiple categorize operations
    await waitForEditable(topParagraphText)
    await clickThought(topParagraphText)

    // Perform 1st categorization
    await press(']', { meta: true })
    await press('1')
    await sleep(300)
    const image1 = await screenshot()
    expect(image1).toMatchImageSnapshot()

    // Perform 2nd categorization
    await press(']', { meta: true })
    await press('2')
    await sleep(300)
    const image2 = await screenshot()
    expect(image2).toMatchImageSnapshot()

    // Perform 3rd categorization
    await press(']', { meta: true })
    await press('3')
    await sleep(300)
    const image3 = await screenshot()
    expect(image3).toMatchImageSnapshot()

    // Perform 4th categorization
    await press(']', { meta: true })
    await press('4')
    await sleep(300)
    const image4 = await screenshot()
    expect(image4).toMatchImageSnapshot()

    // Perform 5th categorization
    await press(']', { meta: true })
    await press('5')
    await sleep(300)
    const image5 = await screenshot()
    expect(image5).toMatchImageSnapshot()

    // Perform 6th categorization
    await press(']', { meta: true })
    await press('6')
    await sleep(300)
    const image6 = await screenshot()
    expect(image6).toMatchImageSnapshot()

    // Perform 7th categorization
    await press(']', { meta: true })
    await press('7')
    await sleep(300)
    const image7 = await screenshot()
    expect(image7).toMatchImageSnapshot()

    // Perform 8th categorization
    await press(']', { meta: true })
    await press('8')
    await sleep(300)
    const image8 = await screenshot()
    expect(image8).toMatchImageSnapshot()

    // Perform 9th categorization
    await press(']', { meta: true })
    await press('9')
    await sleep(300)
    const image9 = await screenshot()
    expect(image9).toMatchImageSnapshot()

    // Perform 10th categorization
    await press(']', { meta: true })
    await press('1')
    await press('0')
    await sleep(300)
    const image10 = await screenshot()
    expect(image10).toMatchImageSnapshot()

    // Perform 11th categorization
    await press(']', { meta: true })
    await press('1')
    await press('1')
    await sleep(300)
    const image11 = await screenshot()
    expect(image11).toMatchImageSnapshot()

    // Perform 12th categorization
    await press(']', { meta: true })
    await press('1')
    await press('2')
    await sleep(300)
    const image12 = await screenshot()
    expect(image12).toMatchImageSnapshot()

    // Perform 13th categorization
    await press(']', { meta: true })
    await press('1')
    await press('3')
    await sleep(300)
    const image13 = await screenshot()
    expect(image13).toMatchImageSnapshot()

    // Perform 14th categorization
    await press(']', { meta: true })
    await press('1')
    await press('4')
    await sleep(300)
    const image14 = await screenshot()
    expect(image14).toMatchImageSnapshot()

    // Perform 1st un-categorization
    await press('c', { meta: true, alt: true })
    const image15 = await screenshot()
    expect(image15).toMatchImageSnapshot()

    // Perform 2nd un-categorization
    await press('c', { meta: true, alt: true })
    const image16 = await screenshot()
    expect(image16).toMatchImageSnapshot()

    // Perform 3rd un-categorization
    await press('c', { meta: true, alt: true })
    const image17 = await screenshot()
    expect(image17).toMatchImageSnapshot()

    // Perform 4th un-categorization
    await press('c', { meta: true, alt: true })
    const image18 = await screenshot()
    expect(image18).toMatchImageSnapshot()

    // Perform 5th un-categorization
    await press('c', { meta: true, alt: true })
    const image19 = await screenshot()
    expect(image19).toMatchImageSnapshot()

    // Perform 6th un-categorization
    await press('c', { meta: true, alt: true })
    const image20 = await screenshot()
    expect(image20).toMatchImageSnapshot()

    // Perform 7th un-categorization
    await press('c', { meta: true, alt: true })
    const image21 = await screenshot()
    expect(image21).toMatchImageSnapshot()

    // Perform 8th un-categorization
    await press('c', { meta: true, alt: true })
    const image22 = await screenshot()
    expect(image22).toMatchImageSnapshot()

    // Perform 9th un-categorization
    await press('c', { meta: true, alt: true })
    const image23 = await screenshot()
    expect(image23).toMatchImageSnapshot()

    // Perform 10th un-categorization
    await press('c', { meta: true, alt: true })
    const image24 = await screenshot()
    expect(image24).toMatchImageSnapshot()
  })
})
