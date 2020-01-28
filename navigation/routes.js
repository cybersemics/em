import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import ThoughtList from '../components/ThoughtList'
import WelcomeScreen from '../components/WelcomeScreen'
import TutorialHome from '../components/TutorialHome'
import LearnMore from '../components/LearnMore'

const MainNavigator = createStackNavigator({
  ThoughtList: { screen: ThoughtList },
  WelcomeScreen: { screen: WelcomeScreen },
  TutorialHome: { screen: TutorialHome },
  LearnMore: { screen: LearnMore },
},
  {
    initialRouteName: 'WelcomeScreen',
    headerMode: "none"
  });

const Routes = createAppContainer(MainNavigator);

export default Routes;