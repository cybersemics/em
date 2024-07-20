import { Page } from 'puppeteer'

/**
 * Installs mouse helper on the page to display the mouse pointer.
 */
async function showMousePointer(page: Page) {
  await page.evaluate(() => {
    // Install mouse helper only for top-level frame.
    if (window !== window.parent) return

    const box = document.createElement('puppeteer-mouse-pointer')
    const styleElement = document.createElement('style')

    const svgElement = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" viewBox="16 7.4 28 28" enable-background="new 16 7.4 28 28" xml:space="preserve" style="pointer-events: none; position: absolute; top: 0; left: 0; width: 50px; height: 30px; z-index: 10000; margin: -10px 0 0 -10px; transition: background .2s, border-radius .2s, border-color .2s;">
        <polygon fill="#FFFFFF" points="8.2,20.9 8.2,4.9 19.8,16.5 13,16.5 12.6,16.6 "/>
        <polygon fill="#FFFFFF" points="17.3,21.6 13.7,23.1 9,12 12.7,10.5 "/>
        <rect x="12.5" y="13.6" transform="matrix(0.9221 -0.3871 0.3871 0.9221 -5.7605 6.5909)" width="2" height="8"/>
        <polygon points="9.2,7.3 9.2,18.5 12.2,15.6 12.6,15.5 17.4,15.5 "/>
      </svg>
    `

    const encodedSvg = encodeURIComponent(svgElement).replace(/'/g, '%27').replace(/"/g, '%22')

    const container = document.createElement('div')
    container.innerHTML = svgElement

    styleElement.innerHTML = `
      puppeteer-mouse-pointer {
        pointer-events: none;
        position: absolute;
        top: 0;
        z-index: 10000;
        left: 0;
        width: 50px;
        height: 30px;
        border: none;
        background-image: url("data:image/svg+xml,${encodedSvg}");
        background-size: contain;
        background-position: center;
        padding: 0;
        transition: background .2s, border-radius .2s, border-color .2s;
      }
    `
    document.head.appendChild(styleElement)
    box.appendChild(container)
    document.body.appendChild(box)
    document.addEventListener(
      'mousemove',
      event => {
        box.style.left = event.pageX + 'px'
        box.style.top = event.pageY + 'px'
      },
      true,
    )
  }, false)
}

export default showMousePointer
