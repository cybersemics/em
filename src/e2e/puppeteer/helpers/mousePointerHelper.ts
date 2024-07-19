import { Page } from 'puppeteer'

/**
 * Installs mouse helper on the page to display the mouse pointer.
 */
async function installMouseHelper(page: Page) {
  await page.evaluateOnNewDocument(() => {
    // Install mouse helper only for top-level frame.
    if (window !== window.parent) return
    window.addEventListener(
      'DOMContentLoaded',
      () => {
        const box = document.createElement('puppeteer-mouse-pointer')
        const styleElement = document.createElement('style')
        styleElement.innerHTML = `
          puppeteer-mouse-pointer {
            pointer-events: none;
            position: absolute;
            top: 0;
            z-index: 10000;
            left: 0;
            width: 30px;
            height: 30px;
            background-image: url('https://cursor.in/assets/cursor.svg');
            background-size: cover;
            border: none;
            margin: -10px 0 0 -10px;
            padding: 0;
            transition: background .2s, border-radius .2s, border-color .2s;
          }
          puppeteer-mouse-pointer.button-1 {
            transition: none;
            background: rgba(0,0,0,0.9);
          }
          puppeteer-mouse-pointer.button-2 {
            transition: none;
            border-color: rgba(0,0,255,0.9);
          }
          puppeteer-mouse-pointer.button-3 {
            transition: none;
            border-radius: 4px;
          }
          puppeteer-mouse-pointer.button-4 {
            transition: none;
            border-color: rgba(255,0,0,0.9);
          }
          puppeteer-mouse-pointer.button-5 {
            transition: none;
            border-color: rgba(0,255,0,0.9);
          }
        `
        document.head.appendChild(styleElement)
        document.body.appendChild(box)
        document.addEventListener(
          'mousedown',
          event => {
            updateButtons(event.buttons)
            box.classList.add('button-' + event.button)
          },
          true,
        )
        document.addEventListener(
          'mouseup',
          event => {
            updateButtons(event.buttons)
            box.classList.remove('button-' + event.button)
          },
          true,
        )
        document.addEventListener(
          'mousemove',
          event => {
            box.style.left = event.pageX + 'px'
            box.style.top = event.pageY + 'px'

            updateButtons(event.buttons)
          },
          true,
        )
        /**
         *
         */
        function updateButtons(buttons: number) {
          for (let i = 0; i < 5; i++) box.classList.toggle('button-' + i, buttons & (1 << i))
        }
      },
      false,
    )
  })
}

export default installMouseHelper
