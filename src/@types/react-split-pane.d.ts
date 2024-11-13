import { SplitPaneProps, SplitPaneState } from 'react-split-pane'

declare module 'react-split-pane' {
  // eslint-disable-next-line jsdoc/require-jsdoc
  export class SplitPane extends React.Component<SplitPaneProps & { children: React.ReactNode }, SplitPaneState> {
    render(): React.ReactNode
  }

  export default SplitPane
}
