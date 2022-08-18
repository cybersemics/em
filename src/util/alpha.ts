/** Modifies the alpha value of an rgb or rgba color string. */
const alpha = (color: `rgb${string}`, alpha: number) =>
  color.startsWith('rgb')
    ? color.startsWith('rgba')
      ? color.replace(/\d* *\)/, `${alpha})`)
      : color.replace(/\)/, `, ${alpha})`)
    : (console.warn(`Cannot add alpha to non-rgb color: ${color}. Use rgba to ensure alpha transition.`) as any) ||
      color

export default alpha
