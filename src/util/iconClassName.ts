/* eslint-disable @pandacss/file-not-included, @pandacss/extraction-diagnostics -- This file is excluded from the Panda config on purpose; see the comment on iconClassName below. */
import { css, cx } from '../../styled-system/css'
import { iconRecipe } from '../../styled-system/recipes'
import { SystemStyleObject } from '../../styled-system/types'

/**
 * Returns the class name for an icon: the icon recipe plus the caller's style overrides.
 *
 * The overrides are merged at runtime, so PandaCSS cannot extract this call. The CSS it needs is generated at the call site instead, where `cssRaw={css.raw({ … })}` is statically extractable — which is why callers must always wrap overrides in `css.raw` rather than passing a bare object literal.
 *
 * This file is listed in `exclude` in panda.config.ts so that the single unextractable call does not emit a `panda_call_unextractable` warning on every dev server start. PandaCSS therefore never parses this file: any static styles added here would be silently dropped from the stylesheet, so keep it free of them.
 */
const iconClassName = (cssRaw?: SystemStyleObject) => cx(iconRecipe(), css(cssRaw))

export default iconClassName
