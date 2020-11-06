declare module 'roam' {
  interface RoamBlock {
    uid: string,
    string: string,
    'create-email': string,
    'create-time': number,
    children?: RoamBlock[],
    'edit-time'?: number,
    'edit-email'?: string,
  }

  interface RoamPage {
    title: string,
    children: RoamBlock[],
  }

}
