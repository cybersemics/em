import { DndProviderProps } from 'react-dnd'

declare module 'react-dnd' {
  // eslint-disable-next-line import/prefer-default-export
  export declare const DndProvider: React.FC<DndProviderProps<any, any>>
}
