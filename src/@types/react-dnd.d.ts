import { DndProviderProps } from 'react-dnd'

declare module 'react-dnd' {
  export declare const DndProvider: React.FC<DndProviderProps<any, any> & { children?: React.ReactNode }>
}
