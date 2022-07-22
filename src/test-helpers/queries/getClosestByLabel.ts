/** Gets the closest ancestor with the aria-label text. */
export const getClosestByLabel = (container: HTMLElement | null, label: string): HTMLElement | null => {
  if (!container) return null
  return container.closest(`[aria-label="${label}"]`)
}
