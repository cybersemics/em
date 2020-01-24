import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import ThoughtList from '../components/ThoughtList'
import WelcomeScreen from '../components/WelcomeScreen'
import TutorialHome from '../components/TutorialHome'
import LearnMoreTutorial from '../components/LearnMoreTutorial'

const MainNavigator = createStackNavigator({
  ThoughtList: { screen: ThoughtList },
  WelcomeScreen: { screen: WelcomeScreen },
  TutorialHome: { screen: TutorialHome },
  LearnMoreTutorial: { screen: LearnMoreTutorial },
},
  {
    initialRouteName: 'WelcomeScreen',
    headerMode: "none"
  });

const Routes = createAppContainer(MainNavigator);

export default Routes;