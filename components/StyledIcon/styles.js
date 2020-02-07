import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  dotIconWrapper: {
    marginBottom: height * 0.01,
    marginRight: width * 0.03,
    marginLeft: width * 0.03
  },
  addIconWrapper: {
    marginBottom: height * 0.01,
    marginRight: width * 0.015,
    marginLeft: width * 0.015
  },
  listItemIcon: {
    marginTop: height * 0.01
  },
});
export default styles
