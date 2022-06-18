declare module 'himalaya' {
  import Index from '../../@types/IndexType'

  export interface Node {
    type: string
  }

  export interface Element extends Node {
    type: 'element'
    tagName: string
    attributes: Index<string>[]
    children: HimalayaNode[]
  }

  export interface Comment extends Node {
    type: 'comment'
    content: string
  }

  export interface Text extends Node {
    type: 'text'
    content: string
  }

  export type HimalayaNode = Element | Comment | Text

  // eslint-disable-next-line
  export function parse(str: String, options?: Index<string>): HimalayaNode[]
}
