import { SemanticTokens, Tokens } from '@pandacss/dev'
import colors from '../colors.config'

/** Converts theme colors to PandaCSS tokens. */
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
