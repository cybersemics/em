import { DndProviderProps } from 'react-dnd'

declare module 'react-dnd' {
  // eslint-disable-next-line import/prefer-default-export, @typescript-eslint/no-explicit-any
  export declare const DndProvider: React.FC<DndProviderProps<any, any> & { children?: React.ReactNode }>
}
