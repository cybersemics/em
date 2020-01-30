import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
	searchButtonText: {
		fontSize: 18,color:'black'
	},
	searchButton: {
		backgroundColor: 'white',
		width: width * 0.35,
		justifyContent: 'center',
		borderRadius: 40,
		height: height * 0.05,
		marginHorizontal: width * 0.04,
    alignSelf:'center'
  },
  count:{ color: 'white', textAlign: 'center' },
  escape:{color:'white'}
});
export default styles