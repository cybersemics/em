import { Page } from 'puppeteer'

/** Renders a simulated mouse pointer that tracks the actual mouse movements. */
async function showMousePointer(page: Page) {
  await page.evaluate(() => {
    const pointer = document.createElement('puppeteer-mouse-pointer')
    pointer.innerHTML = `
      <svg viewBox="8 3 24 24" width="30">
        <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6 "/>
        <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5 "/>
        <rect x="12.5" y="13.6" transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)" width="2" height="8"/>
        <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5 "/>
      </svg>
    `
    pointer.style.pointerEvents = 'none'
    pointer.style.position = 'absolute'
    pointer.style.top = '0'
    pointer.style.left = '0'
    pointer.style.zIndex = '999999'
    // the origin should not include the white contrast border, so nudge it up and left
    pointer.style.marginLeft = '-1px'
    pointer.style.marginTop = '-5px'

    document.body.appendChild(pointer)
    document.addEventListener('mousemove', e => {
      pointer.style.left = e.pageX + 'px'
      pointer.style.top = e.pageY + 'px'
    })
  })
}

export default showMousePointer
