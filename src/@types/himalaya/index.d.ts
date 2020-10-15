declare module 'himalaya' {
  import { GenericObject } from '../../types'

  export interface Node {
    type: string,
  }

  export interface Element extends Node {
    type: 'element',
    tagName: string,
    attributes: GenericObject<string>[],
    children: HimalayaNode[],
  }

  export interface Comment extends Node {
    type: 'comment',
    content: string,
  }

  export interface Text extends Node {
    type: 'text',
    content: string,
  }

  export type HimalayaNode = Element | Comment | Text

  // eslint-disable-next-line
  export function parse(str: String, options?: GenericObject<string>): HimalayaNode[]

}
