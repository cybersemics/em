import DragThoughtOrFiles from '../@types/DragThoughtOrFiles'

/** Returns true if the monitor.getItem() result is a native file. */
const isDraggedFile = (itemOrFiles: DragThoughtOrFiles): itemOrFiles is { files: File[] } => 'files' in itemOrFiles

export default isDraggedFile
