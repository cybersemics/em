import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import ThoughtList from '../components/ThoughtList'
import WelcomeScreen from '../components/WelcomeScreen'
import TutorialHome from '../components/TutorialHome'
import LearnMore from '../components/LearnMore'
import DrawerNavigatorScreen from '../components/DrawerFile';
import { createDrawerNavigator } from 'react-navigation-drawer';

const MainNavigator = createDrawerNavigator({
  ThoughtList: { screen: ThoughtList },
  WelcomeScreen: { screen: WelcomeScreen },
  TutorialHome: { screen: TutorialHome },
  LearnMore: { screen: LearnMore },
},
  navigationOptions = {
    initialRouteName: 'WelcomeScreen',
    headerMode: 'none',
    contentComponent: DrawerNavigatorScreen,
    drawerWidth: 200
  })



const Routes = createAppContainer(MainNavigator);

export default Routes;

