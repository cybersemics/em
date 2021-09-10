import tw, { styled } from 'twin.macro'

const messageStyles = {
  info: tw`
    text-blue-700
    bg-blue-200
    border-blue-300
  `,
  error: tw`
    text-red-600
    bg-red-200
    border-red-300
  `,
  success: tw`
    text-green-700
    bg-green-200
    border-green-300
  `,
}

/** Message component. */
const Message = styled.div<{ type: 'info' | 'error' | 'success' }>`
  ${props => messageStyles[props.type]}
  ${tw`
    mx-auto
    rounded
    border border-solid 
    p-1
    text-base
    text-center
  `}
`

export default Message
