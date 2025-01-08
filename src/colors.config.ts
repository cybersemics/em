const colors = {
  dark: {
    // Background colors in capacitor app needs to be in hexadecimal codes
    bg: '#000000',
    bgOverlay80: 'rgba(0, 0, 0, 0.8)',
    bgOverlay50: 'rgba(0, 0, 0, 0.5)',
    bgOverlay30: 'rgba(0, 0, 0, 0.3)',
    black: 'rgba(0, 0, 0, 1)',
    blue: 'rgba(0, 199, 230, 1)', // #00c7e6
    caret: 'rgba(0, 199, 230, 0.75)', // #00c7e6
    darkgray: 'rgba(17, 17, 17, 1)', // #111111
    fg85: 'rgba(217, 217, 217, 1)', // #d9d9d9
    fg: 'rgba(255, 255, 255, 1)',
    fgOverlay10: 'rgba(255, 255, 255, 0.1)',
    fgOverlay20: 'rgba(255, 255, 255, 0.2)',
    fgOverlay50: 'rgba(255, 255, 255, 0.5)',
    fgOverlay70: 'rgba(255, 255, 255, 0.7)',
    fgOverlay80: 'rgba(20, 20, 20, 0.8)',
    fgOverlay90: 'rgba(20, 20, 20, 0.9)',
    gray15: 'rgba(38, 38, 38, 1)', // #262626
    gray33: 'rgba(85, 85, 85, 1)',
    gray50: 'rgba(128, 128, 128, 1)', // #808080 (gray)
    gray66: 'rgba(169, 169, 169, 1)', // #a9a9a9
    gray: 'rgba(169, 169, 169, 1)', // #a9a9a9, this is used for disabled things + text color, unlike gray66 it is the same for both light and dark
    green: 'rgba(0, 214, 136, 1)', // #00d688
    highlight: 'rgba(173, 216, 230, 1)', // #add8e6 (lightblue)
    highlight2: 'rgba(155, 170, 220, 1)', // (slight variation on highlight color for alternating highlights)
    lightgreen: 'rgba(144, 238, 144)', // #90ee90 (lightgreen)
    orange: 'rgba(255, 136, 0, 1)', // #ff8800
    pink: 'rgba(238, 130, 238, 1)', // #ee82ee
    purple: 'rgba(170, 128, 255, 1)', // #aa80ff
    red: 'rgba(255, 87, 61, 1)', // #ff573d
    vividHighlight: '#63c9ea',
    white: 'rgba(255, 255, 255, 1)',
    yellow: 'rgba(255, 208, 20, 1)', // #ffd014
    inputBorder: 'rgba(153, 153, 153, 1)', // #999, also used in navBar
    breadcrumbs: 'rgba(153, 153, 153, 1)',
    activeBreadCrumb: 'rgba(144, 144, 144, 1)', // #909090
    link: 'rgba(135, 206, 235, 1)', // #87ceeb
    dim: 'rgba(255, 255, 255, 0.5)',
    dimInverse: 'rgba(7, 7, 7, 0.5)',
    bullet: 'rgba(217, 217, 217, 1)',
    codeBg: 'rgba(51, 51, 51, 1)', // #333333
    codeBgInverse: 'rgba(204, 204, 204, 1)', // #cccccc
    modalExportUnused: 'rgba(68, 68, 68, 1)', // #444, used in dropdown menu
    divider: 'rgba(204, 204, 204, 1)',
    bgMuted: 'rgba(51, 51, 51, 1)', // #333
    footerBg: 'rgba(26, 26, 26, 1)', // #1a1a1a
    gestureDiagramWrapper: 'rgba(94, 94, 94, 1)',
    pickerBg: 'rgba(20, 20, 20, 1)', // #141414
    sidebarBg: 'rgba(41, 42, 43, 1)', // #292a2b
    tutorialBg: 'rgba(33, 33, 33, 0.8)', // #212121
    thoughtAnnotation: 'rgba(34, 34, 34, 1)', // #222
    transparent: 'transparent',
    bgTransparent: 'rgba(0, 0, 0, 0)',
    fgTransparent: 'rgba(255, 255, 255, 0)',
    modalColor: 'rgba(227, 227, 227, 1)', // #e3e3e3
    quickDropBgHover: 'rgba(40,40,40,0.8)',
    quickDropBg: 'rgba(30,30,30,0.8)',
    bulletGray: 'rgba(102, 102, 102, 1)', // #666
    midPink: 'rgba(255, 123, 195, 1)', // #ff7bc3
    dropChildTarget: '#32305f', // purple-eggplant
    commandSelected: 'rgba(100, 199, 234, 0.15)', // #64c7ea26
    eggplant: 'rgba(82, 48, 95, 1)',
    checkboxForm: 'rgba(62, 62, 62, 1)', // #3e3e3e
    error: 'rgba(204, 34, 51, 1)',
    pinkAgainstFg: 'rgba(233, 12, 89, 1)',
    brightBlue: 'rgba(70, 223, 240, 1)', // #46dff0
    exportTextareaColor: 'rgba(170, 170, 170, 1)', // #aaa, also used in anchorButton
    panelBorder: 'rgba(36, 36, 36, 1)',
    panelBg: 'rgba(23, 23, 23, 1)', // #171717
  },
  light: {
    // Background colors in capacitor app needs to be in hexadecimal codes
    bg: '#FFFFFF',
    bgOverlay80: 'rgba(255, 255, 255, 0.8)',
    bgOverlay50: 'rgba(255, 255, 255, 0.5)',
    bgOverlay30: 'rgba(255, 255, 255, 0.3)',
    black: 'rgba(0, 0, 0, 1)',
    blue: 'rgba(0, 199, 230, 1)', // #00c7e6
    caret: 'rgba(0, 199, 230, 0.75)', // #00c7e6
    darkgray: 'rgba(237, 237, 237, 1)', // #ededed
    fg85: 'rgba(39, 39, 39, 1)', // #272727
    fg: 'rgba(0, 0, 0, 1)',
    fgOverlay10: 'rgba(0, 0, 0, 0.1)',
    fgOverlay20: 'rgba(0, 0, 0, 0.2)',
    fgOverlay50: 'rgba(0, 0, 0, 0.5)',
    fgOverlay70: 'rgba(0, 0, 0, 0.7)',
    fgOverlay80: 'rgba(235, 235, 235, 0.8)',
    fgOverlay90: 'rgba(235, 235, 235, 0.9)',
    gray15: 'rgba(217, 217, 217, 1)', // #262626
    gray33: 'rgba(170, 170, 170, 1)',
    gray50: 'rgba(128, 128, 128, 1)', // #808080 (gray)
    gray66: 'rgba(86, 86, 86, 1)', // #a9a9a9 (darkgray)
    gray: 'rgba(169, 169, 169, 1)', // #a9a9a9
    green: 'rgba(0, 214, 136, 1)', // #00d688
    highlight: 'rgba(65, 105, 225, 1)', // #4169e1 (royalblue)
    highlight2: 'rgba(155, 170, 220, 1)', // (slight variation on highlight color for alternating highlights)
    lightgreen: 'rgba(0, 214, 136, 1)', // #00d688 (same as green in the light theme)
    orange: 'rgba(255, 136, 0, 1)', // #ff8800
    pink: 'rgba(238, 130, 238, 1)', // #ee82ee
    purple: 'rgba(170, 128, 255, 1)', // #aa80ff
    red: 'rgba(255, 87, 61, 1)', // #ff573d
    vividHighlight: '#63c9ea',
    white: 'rgba(255, 255, 255, 1)',
    yellow: 'rgba(255, 208, 20, 1)', // #ffd014
    inputBorder: 'rgba(238, 238, 238, 1)', // #eeeeee
    breadcrumbs: 'rgba(102, 102, 102, 1)',
    activeBreadCrumb: 'rgba(111, 111, 111, 1)', // #909090
    link: 'rgba(27, 111, 154, 1)', // #1b6f9a
    dim: 'rgba(7, 7, 7, 0.5)',
    dimInverse: 'rgba(255, 255, 255, 0.5)',
    bullet: 'rgba(39, 39, 39, 1)',
    codeBg: 'rgba(204, 204, 204, 1)', // #cccccc
    codeBgInverse: 'rgba(51, 51, 51, 1)', // #333333
    modalExportUnused: 'rgba(204, 204, 204, 1)', // #ccc
    divider: 'rgba(193, 193, 193, 1)',
    bgMuted: 'rgba(221, 221, 221, 1)', // #ddd
    footerBg: 'rgba(228, 228, 228, 1)', // #e4e4e4
    gestureDiagramWrapper: 'rgba(180, 180, 180, 1)',
    pickerBg: 'rgba(235, 235, 235, 1)', // #ebebeb
    sidebarBg: 'rgba(245, 245, 245, 1)', // #f5f5f5
    tutorialBg: 'rgba(221, 221, 221, 1)', // #ddd
    thoughtAnnotation: 'rgba(221, 221, 221, 1)', // #ddd
    transparent: 'transparent',
    fgTransparent: 'rgba(0, 0, 0, 0)',
    bgTransparent: 'rgba(255, 255, 255, 0)',
    modalColor: 'rgba(28, 28, 28, 1)', // #1c1c1c
    quickDropBgHover: 'rgba(215, 215, 215, 0.8)',
    quickDropBg: 'rgba(225, 225, 225, 0.8)',
    bulletGray: 'rgba(153, 153, 153, 1)', // #999999
    midPink: 'rgba(255, 123, 195, 1)',
    dropChildTarget: '#a4a2cd',
    commandSelected: 'rgba(222, 222, 222, 1)',
    eggplant: 'rgb(85, 51, 98)',
    checkboxForm: 'rgba(193, 193, 193, 1)',
    error: 'rgba(204, 34, 51, 1)',
    pinkAgainstFg: 'rgba(227, 179, 196, 1)',
    brightBlue: 'rgba(70, 223, 240, 1)', // #46dff0
    exportTextareaColor: 'rgba(85, 85, 85, 1)',
    panelBorder: 'rgba(219, 219, 219, 1)',
    panelBg: 'rgba(232, 232, 232, 1)', // #171717
  },
} as const

export type ColorToken = keyof typeof colors.dark

export default colors
