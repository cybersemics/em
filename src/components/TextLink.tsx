import tw, { styled } from 'twin.macro'

const TextLink = styled.a<{ grayed?: boolean }>`
  ${tw`
    cursor-pointer
    underline outline-none
    text-blue-400
    font-normal
    text-base
  `}

  ${props => props.grayed && tw`opacity-50 text-gray-300`}
`

export default TextLink
