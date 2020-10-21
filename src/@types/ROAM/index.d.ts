declare module 'roam' {
  import { GenericObject } from '../../utilTypes'

  interface ROAMChild {
    uid: string,
    string: string,
    'create-email': string,
    'create-time': number,
    children?: ROAMChild[],
    'edit-time'?: number,
    'edit-email'?: string,
  }

  interface RoamNode {
    title: string,
    children: ROAMChild[],
  }

}
