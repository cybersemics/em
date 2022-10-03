/** Position fixed breaks in mobile Safari when the keyboard is up. This module provides functionality to emulate position:fixed by changing all top navigation to position:absolute and updating on scroll. */

/** Change position:fixed top nav to position:absolute in order to fix Safari position:fixed browser behavior when keyboard is up. */
export const start = () => {
  document.addEventListener('scroll', update)
  const alert = document.getElementsByClassName('alert')[0] as HTMLElement
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  const rightArrow = document.getElementById('right-arrow') as HTMLElement
  const leftArrow = document.getElementById('left-arrow') as HTMLElement
  Array.from([alert, hamburgerMenu, toolbar, rightArrow, leftArrow]).forEach(el => {
    if (!el) return // hamburger menu and toolbar are not rendered during tutorial
    el.style.position = 'absolute'
    el.style.overflowX = 'hidden'
    if (el !== rightArrow && el !== leftArrow) {
      el.style.top = `${window.scrollY}px`
    }
  })
}

/** Reset position:absolute of toolbar elements. */
export const stop = () => {
  document.removeEventListener('scroll', update)
  const alert = document.getElementsByClassName('alert')[0] as HTMLElement
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  const rightArrow = document.getElementById('right-arrow') as HTMLElement
  const leftArrow = document.getElementById('left-arrow') as HTMLElement
  Array.from([alert, hamburgerMenu, toolbar, rightArrow, leftArrow]).forEach(el => {
    if (!el) return // hamburger menu and toolbar are not rendered during tutorial
    el.style.position = 'fixed'
    el.style.overflowX = ''
    el.style.top = ''
  })
}

/** Update position of toolbar elements while scrolling in order to show them always on top. */
export const update = () => {
  const alert = document.getElementsByClassName('alert')[0] as HTMLElement
  const hamburgerMenu = document.getElementsByClassName('hamburger-menu')[0] as HTMLElement
  const toolbar = document.getElementsByClassName('toolbar-container')[0] as HTMLElement
  Array.from([alert, hamburgerMenu, toolbar]).forEach(el => {
    if (!el) return // hamburger menu and toolbar are not rendered during tutorial
    el.style.top = `${window.scrollY}px`
  })
}
