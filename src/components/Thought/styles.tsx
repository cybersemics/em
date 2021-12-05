import { styled } from 'twin.macro'

export const ThoughtComponentWrapper = styled.li``

export const ThoughtContainerWrapper = styled.div`
  .distance-from-cursor-2.zoomCursor > ${ThoughtComponentWrapper}:not(.editing).cursor-parent > & {
    color: rgba(0, 0, 0, 0);
  }

  .distance-from-cursor-2.zoomParent > ${ThoughtComponentWrapper}:not(.editing).cursor-grandparent > & {
    color: rgba(0, 0, 0, 0);
  }

  /* =focus Zoom in table column 1 */
  /* hide nieces when cursor is in column 1 */
  .distance-from-cursor-1.zoomCursor > ${ThoughtComponentWrapper}:not(.editing) > & {
    color: rgba(0, 0, 0, 0);
  }
  /* Table view */
  .table-view > .children > ${ThoughtComponentWrapper} > & {
    display: table-cell;
    text-align: right;
    position: relative; /* used to constrain .drop-hover width */
    padding-bottom: 10px; /* padding must go on column 1 cell since it may be a leaf */
  }

  .publish > .children > ${ThoughtComponentWrapper} > & {
    font-size: 28px;
  }
`
