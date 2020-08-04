declare module 'himalaya' {
  import { GenericObject } from '../../utilTypes'

  export interface Node {
    type: string,
  }

  export interface Element extends Node {
    type: 'element',
    tagName: string,
    attributes: GenericObject<GenericObject<string>>,
    children: JSONOutput[],
  }

  export interface Comment extends Node {
    type: 'comment',
    content: string,
  }

  export interface Text extends Node {
    type: 'text',
    content: string,
  }

  export type JSONOutput = Element | Comment | Text

  // eslint-disable-next-line
  export function parse(str: String, options?: GenericObject<string>): JSONOutput[]

}
