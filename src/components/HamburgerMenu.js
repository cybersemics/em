import React from "react"
import ReactHamburger from "react-hamburger-menu"
import { useSelector, useDispatch } from "react-redux"
import { isMobile } from "../browser"


const HamburgerMenu = () => {

  const showSidebar = useSelector(state => (state.showSidebar))
  const dispatch = useDispatch()

  return (
    <div className="hamburgerMenu" style={{ padding: isMobile ? "5%" : "2% 3%" }}>
      <ReactHamburger
        isOpen={showSidebar}
        menuClicked={() => {
          dispatch({ type: "toggleSidebar" })
        }}
        width={20}
        height={15}
        strokeWidth={1.5}
        rotate={0}
        color='white'
        borderRadius={0}
        animationDuration={0.8}
      />
    </div>
  )
}

export default HamburgerMenu
