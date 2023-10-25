declare module 'text-block-parser' {
  import { Block } from '../../@types'
  export function parse(text: string, maxNodes?: number): Block[]
}
