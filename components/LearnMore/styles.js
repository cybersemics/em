import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');
import TutorialHomeStyles from '../TutorialHome/styles'

const styles = {
	...TutorialHomeStyles,
	contentTypeButton: {
		backgroundColor: 'white',
		width: width * 0.57,
		justifyContent: 'center',
		borderRadius: 40,
		height: height * 0.048,
		marginBottom: height * 0.02,
		marginLeft: width * 0.04,
		marginRight: width * 0.04
	},
	contentTypeButtonWrapper: {
		alignItems: 'center'		
	},
	contentTypeButtonText: {
		fontSize: 17,
	},
	paginationContainerContentType: {
		paddingVertical: 0,
		marginBottom: height * 0.0
	},
	tutorialText: {
		color: 'white',
		fontSize: 17,
		marginTop: height * 0.01,
		marginBottom: height * 0.01
	},
	hintText: {
		color: 'white',
		fontSize: 17,
		marginTop: height * 0.02,
	},
	tutorialCountText: {
		color: 'white',
		fontSize: 17,
	},
	tutorialCount: {
		color: 'white',
		fontSize: 10,
	},
	superScriptView: {
		flexDirection: 'row',
		marginTop: height * 0.02
	}
};
export default styles