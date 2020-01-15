import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import Home from '../components/Home'
import ThoughtList from '../components/ThoughtList'
import WelcomeScreen from '../components/WelcomeScreen'
import TutorialHome from '../components/TutorialHome'


const MainNavigator = createStackNavigator({
  Home: { screen: Home },
  ThoughtList: { screen: ThoughtList },
  WelcomeScreen: { screen: WelcomeScreen },
  TutorialHome: { screen: TutorialHome },
},
  {
    initialRouteName: 'WelcomeScreen',
    headerMode: "none"
  });

const Routes = createAppContainer(MainNavigator);

export default Routes;