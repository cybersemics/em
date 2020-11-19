declare module 'jex-block-parser' {
  import { Block } from '../../types'
  export function parse(text: string): Block[]
}
