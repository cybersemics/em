import { SemanticTokens, Tokens } from '@pandacss/dev'
import { colors } from '../selectors/themeColors'

/** Converts theme colors to PandaCSS tokens (function will be removed after the conversion to PandaCSS is complete). */
const convertColorsToPandaCSS = () => {
  const colorTokens: Tokens['colors'] = {}
  const colorSemanticTokens: SemanticTokens['colors'] = {}

  const tokenNames = Object.keys(colors.dark) as (keyof typeof colors.dark)[]

  for (const tokenName of tokenNames) {
    const tokenValueDark = colors.dark[tokenName]
    const tokenValueLight = colors.light[tokenName]
    if (tokenValueDark === tokenValueLight) {
      colorTokens[tokenName] = {
        value: tokenValueDark,
      }
      continue
    }

    colorSemanticTokens[tokenName] = {
      value: {
        base: tokenValueLight,
        _dark: tokenValueDark,
      },
    }
  }
  return {
    colorTokens,
    colorSemanticTokens,
  }
}

export default convertColorsToPandaCSS
