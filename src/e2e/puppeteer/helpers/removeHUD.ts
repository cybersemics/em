import remove from './remove'

/** Removes the heads-up-display (header, footer, menu, navbar, and toolbar) so that only the thoughts are shown. */
const removeHUD = async () => {
  await remove('[aria-label="footer"]')
  await remove('[aria-label="menu"]')
  await remove('[aria-label="nav"]')
  await remove('[aria-label="toolbar"]')
}

export default removeHUD
