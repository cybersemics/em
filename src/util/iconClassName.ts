import { cx } from '../../styled-system/css'
import { iconRecipe } from '../../styled-system/recipes'

/** Returns the class name for an icon: the icon recipe plus the caller's style overrides. The caller generates the overrides with `css({ … })`, which PandaCSS extracts statically, and they win over the recipe because the utilities cascade layer comes after recipes. */
const iconClassName = (className?: string) => cx(iconRecipe(), className)

export default iconClassName
