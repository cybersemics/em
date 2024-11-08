declare module 'text-block-parser' {
  import { Block } from '../../@types'
  // eslint-disable-next-line import/prefer-default-export
  export function parse(text: string, maxNodes?: number): Block[]
}
