import { createGlobalStyle } from 'styled-components'
import tw from 'twin.macro'

const GlobalStyle = createGlobalStyle`
 * {
   box-sizing: border-box;
 }

 body {
  ${tw`
      text-base
   `}
 }
`

export default GlobalStyle
