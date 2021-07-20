import { Platform, StyleSheet } from 'react-native'

export const commonStyles = StyleSheet.create({
  // container
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  directionRow: { flexDirection: 'row' },
  directionColumn: { flexDirection: 'column' },
  directionColumnReverse: { flexDirection: 'column-reverse' },
  alarmText: { color: 'red', fontWeight: 'bold' },
  fullHeight: { height: '100%' },
  fullWidth: { width: '100%' },
  absolute: { position: 'absolute' },
  spaceEvenly: { justifyContent: 'space-evenly' },
  spaceBetween: { justifyContent: 'space-between' },
  justifyContentCenter: { justifyContent: 'center' },
  justifyContentEnd: { justifyContent: 'flex-end' },
  alignItemsBaseline: { alignItems: 'baseline' },
  flexWrap: { flexWrap: 'wrap' },
  flexZero: { flex: 0 },
  flexHalf: { flex: 0.5 },
  flexOne: { flex: 1 },
  flexTwo: { flex: 2 },
  flexGrow: { flexGrow: 1 },
  flexEnd: { alignItems: 'flex-end' },
  flexItemsEndRow: { flexDirection: 'row', alignItems: 'flex-end' },
  textOpacityWhite: { color: 'white', opacity: 0.5 },
  spaceBetweenRow: { flexDirection: 'row', justifyContent: 'space-between' },
  centerAlignedRow: { flexDirection: 'row', alignItems: 'center' },
  alignItemsCenter: { alignItems: 'center' },
  alignItemsEnd: { alignItems: 'flex-end' },
  selfCenter: { alignSelf: 'center' },
  zeroHeight: { height: 0 },

  // text
  lightblueText: { color: 'lightblue' },
  whiteText: { color: 'white' },
  charcoalTextColor: { color: '#3F3F3f' },
  crimsonText: { color: 'crimson' },
  blackTextColor: { color: 'black' },
  headerText: {
    fontSize: 20,
    color: 'white',
  },
  headerTextBold: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  bold: { fontWeight: 'bold' },
  centeredText: { textAlign: 'center' },
  textAlignRight: { textAlign: 'right' },
  smallText: {
    fontSize: 12,
  },
  smallTitle: {
    fontSize: 14,
  },
  hyperlink: {
    textDecorationStyle: 'solid',
    textDecorationLine: 'underline',
  },
  largeSubheading: {
    fontSize: 70,
    fontWeight: 'bold',
    marginTop: 20,
  },
  italic: {
    fontStyle: 'italic',
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 10,
  },
  centerText: { textAlign: 'center' },
  underlineText: { textDecorationLine: 'underline' },

  // margin, padding
  noPadding: { padding: 0 },
  noMargin: { margin: 0 },
  noMarginTop: { marginTop: 0 },
  noMarginVertical: { marginVertical: 0 },
  margin: { margin: 15 },
  marginTop: { marginTop: 15 },
  marginBottom: { marginBottom: 15 },
  marginLeft: { marginLeft: 15 },
  marginRight: { marginRight: 15 },
  marginVertical: { marginVertical: 10 },
  verticalPadding: { paddingVertical: 40 },
  horizontalPadding: { paddingHorizontal: 15 },
  padding: { paddingVertical: 10, paddingHorizontal: 10 },
  smallVerticalPadding: { paddingVertical: 5 },
  containerPadding: { paddingVertical: 20, paddingHorizontal: 15 },

  // other (shadows, background colors, etc...)
  textInput: {
    padding: 15,
    borderColor: 'white',
    borderWidth: 1,
    width: '80%',
    alignSelf: 'center',
    margin: 5,
    opacity: 0.5,
    borderRadius: 8,
    color: 'white',
  },
  hidden: { display: 'none' },
  noOpacity: { opacity: 0 },
  halfOpacity: { opacity: 0.5 },
  whiteBackground: { backgroundColor: 'white' },
  darkBackground: { backgroundColor: '#000' },
  redBackground: { backgroundColor: '#CB2232' },
  shadow: {
    ...Platform.select({
      web: {
        shadowColor: 'rgba(192, 192, 192, 1)',
        shadowOffset: {
          width: 1,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 3.84,
      },
      ios: {
        shadowColor: 'rgba(192, 192, 192, 1)',
        shadowOffset: {
          width: 1,
          height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 1,
      },
    }),
  },
})
