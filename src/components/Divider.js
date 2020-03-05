import React from 'react'
import classNames from 'classnames'

import {
  hashContext,
  headRank
} from '../util.js'

export const Divider = ({ thoughtsRanked }) => {

  const dividerSetWidth = React.createRef();

  // get max width of nearby for divider list child elements, add 30 px and set this width for divider
  const setStyle = () => {
    if(dividerSetWidth.current) {
      const parentUl = dividerSetWidth.current.closest("ul");
      const children = parentUl.childNodes;
      let maxWidth = 0;
      children.forEach((child) => {
        if(!child.classList.contains('child-divider')) {
          const subs = child.getElementsByClassName('subthought');
          if(subs.length && subs[0].offsetWidth > maxWidth) maxWidth = subs[0].offsetWidth;
        }
      });
      maxWidth += 30;
      dividerSetWidth.current.style.width = `${maxWidth}px`
    }
  }

  setTimeout(() => {setStyle()}, 300)

  return (<div ref={dividerSetWidth} style={{width: '100px', transition: 'width 800ms'}} className='divider-container'>
    <div className={classNames({
      divider: true,
      // requires editable-hash className to be selected by the cursor navigation via editableNode
      ['editable-' + hashContext(thoughtsRanked, headRank(thoughtsRanked))]: true,
    })} />
  </div>)
}
