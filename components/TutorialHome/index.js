import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions } from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
import Carousel, { Pagination } from 'react-native-snap-carousel'; // 3.6.0
import { Button, Container, Header, Content } from 'native-base';
import styles from './styles'
import TutorialList from './TutorialList'
const { width, height } = Dimensions.get('window');

function TutorialHome({ ...props }) {
  // Declare a new state variable, which we'll call "count"
  const [count, setCount] = useState(0);
  const [thoughtList, setThoughtList] = useState([{}]);
  const [tutorial, setTutorial] = useState([...TutorialList]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thought, setThought] = useState('');
  const [focusedThought, setFocusedThought] = useState('');
  const [deleteItem, setDeleteItem] = useState(false);
  const [enableDotTapping, setDotTapping] = useState(false);
  const _carousel = useRef(null);

  const addThought = (myThoughtList, index) => {
    if (currentIndex == 1) {
      snapToNextSlide(1)
    }
    if (currentIndex == 3) {
      snapToNextSlide(3)
    }
    const obj = {
      thought: thought
    }
    if (focusedThought != myThoughtList[index].thought && !(myThoughtList[index].hasOwnProperty("subList"))) {
      myThoughtList[index] = obj
    }
    if (index == myThoughtList.length - 1) {
      myThoughtList.push({})
    }
    setCount(count + 1)
  }

  /// <summary>
  /// TODO : To create a subThought list in a Thought..
  /// </summary>
  /// <param name="myThoughtList">thought list in which data is to be added</param>
  /// <param name="index">To insert thought at particular postion</param>
  const addSubThought = (myThoughtList, index) => {
    if (currentIndex == 5) {
      snapToNextSlide(5)
    }
    const obj = {}
    if (myThoughtList[index].hasOwnProperty("subList")) {
      myThoughtList[index].subList.push(obj)
    }
    else {
      myThoughtList[index].subList = [obj]
      myThoughtList[index].isOpen = true
    }
    setCount(count + 1)
  }

  /// <summary>
  /// TODO : To Edit Thought..
  /// </summary>
  /// <param name="myThoughtList">thought list in which data is to be added</param>
  /// <param name="myThought">thought to be added</param>
  /// <param name="index">To insert thought at particular postion</param>
  const editThought = (myThoughtList, myThought, index) => {
    if (currentIndex == 2) {
      tutorialStep(2, myThought)
    }
    else if (currentIndex == 4) {
      tutorialStep(4, myThought)
    }
    else if (currentIndex == 6) {
      tutorialStep(6, myThought)
    }
    myThoughtList[index].thought = myThought
    setThought(myThought)
  }

  const selectThought = (thought) => {
    setFocusedThought(thought)
  }

  const deleteThought = (event, myThoughtList, index) => {
    if (event.nativeEvent.key == 'Backspace' && thought == '') {
      if (deleteItem) {
        if (myThoughtList.length > 1 && !(myThoughtList[index].hasOwnProperty('subList'))) {
          myThoughtList.splice(index, 1);
        }
      }
      setDeleteItem(!deleteItem)
    }
  }

  /// <summary>
  /// TODO : To hide or show the subthought list ..
  /// </summary>
  /// <param name="myThoughtList">thought list in which data is to be added</param>
  /// <param name="index">To insert thought at particular postion</param>
  const handleHideShow = (myThoughtList, index) => {
    if (currentIndex == 7 && myThoughtList[index].isOpen) {
      snapToNextSlide(7)
    }
    if (currentIndex == 8 && !myThoughtList[index].isOpen) {
      snapToNextSlide(8)
    }
    myThoughtList[index].isOpen = !(myThoughtList[index].isOpen)
    setCount(count + 1)
  }

  /// <summary>
  /// TODO : To show hint in step 4 of tutorial..
  /// </summary>
  const showThoughtHint = (tutorial) => {
    tutorial[3].showHint = true
    setCount(count + 1)
  }

  /// <summary>
  /// TODO : To Complete the Step 3 5 & 7 of the tutorial..
  /// </summary>
  /// <param name="tutorialIndex">current index of the slider or tutorial</param>
  /// <param name="myThought">thought to be added</param>
  const tutorialStep = (tutorialIndex, myThought) => {
    let myTutorialList = []
    myTutorialList = tutorial;
    if (myThought != '' && !myTutorialList[tutorialIndex].goToNext) {
      myTutorialList[tutorialIndex].goToNext = true
      setTutorial(myTutorialList)
    }
    else if (myThought == '' && myTutorialList[tutorialIndex].goToNext) {
      myTutorialList[tutorialIndex].goToNext = false
      setTutorial(myTutorialList)
    }
  }

  /// <summary>
  /// TODO : set current index when slider changes..
  /// </summary>
  /// <param name="index">current index of the slider</param>
  /// <param name="currentIndex">current value of the currentIndex state</param>
  const handleSnapToItem = (index, currentIndex) => {
    if (currentIndex != index) {
      setCurrentIndex(index)
    }
  }

  /// <summary>
  /// TODO : Go to next slider..
  /// </summary>
  /// <param name="index">current index of the slider</param>
  const snapToNextSlide = (index) => {
    if (tutorial.length - 1 > index) {
      setCurrentIndex(index + 1)
      _carousel.snapToItem(index + 1)
    }
    else {
      setCurrentIndex(tutorial.length - 1)
    }
    if (!enableDotTapping) {
      setDotTapping(true)
    }
  }

  /// <summary>
  /// TODO : Go to previous slider..
  /// </summary>
  /// <param name="index">current index of the slider</param>
  const snapToPrevSlide = (index) => {
    if (index != 0) {
      setCurrentIndex(index - 1)
      _carousel.snapToItem(index - 1);
    }
  }

  /// <summary>
  /// TODO : To display all thoughts and subthoughts..
  /// </summary>
  /// <param name="data">list of all thoughts</param>
  const ThoughtList = (data) => {
    return (
      <View style={styles.thoughtListWrapper}>
        {data.length > 0 && data.map((item, index) => {
          return (<View key={index}><View style={{ flexDirection: 'row' }} >
            {item.hasOwnProperty("thought") && <TouchableOpacity style={styles.dotIconWrapper} onPress={() => {
              item.hasOwnProperty("subList") ? handleHideShow(data, index) : addSubThought(data, index)
            }} >
              {item.hasOwnProperty("subList") ?
                <Ionicons
                  name={item.isOpen ? 'md-arrow-dropdown' : 'md-arrow-dropright'}
                  size={20}
                  style={styles.listItemIcon}
                  color='white'
                /> : <Octicons
                  name='primitive-dot'
                  size={20}
                  style={styles.listItemIcon}
                  color='white'
                />}
            </TouchableOpacity>
            }
            {!(item.hasOwnProperty("thought")) && <TouchableOpacity style={styles.addIconWrapper} onPress={() => { }} >
              <MaterialIcons
                name='add'
                size={20}
                style={styles.listItemIcon}
                color='white'
              />
            </TouchableOpacity>
            }
            <TextInput style={styles.thoughtText} placeholder='Add a thought' value={item.thought}
              onChangeText={(thought) => { editThought(data, thought, index) }}
              onKeyPress={(event) => { deleteThought(event, data, index) }}
              onFocus={() => { selectThought(item.thought) }}
              onBlur={() => { setFocusedThought('') }}
              onSubmitEditing={() => { addThought(data, index) }}>
            </TextInput>
          </View>
            {item.hasOwnProperty("subList") && item.isOpen && ThoughtList(item.subList)}
          </View>)
        })}
      </View>
    );
  }

  const pagination = () => {
    return (
      <Pagination
        dotElement={
          <CarouselPaginationBar
            carouselRef={_carousel} />}
        inactiveDotElement={
          <CarouselPaginationBar
            carouselRef={_carousel} inactive />}
        dotsLength={10}
        containerStyle={styles.paginationContainer}
        dotContainerStyle={styles.paginationDotContainer}
        activeDotIndex={currentIndex}
        tappableDots={!!_carousel}
      />
    );
  }

  const CarouselPaginationBar = props => {
    return (
      <TouchableOpacity
        onPress={() => {
          if (props.inactive) {
            _carousel.snapToItem(props.index);
          }
        }}
      >
        <View
          style={props.inactive ? styles.paginationDot : styles.paginationDotActive}
        ></View>
      </TouchableOpacity>
    );
  };

  /// <summary>
  /// TODO : Display the text in slider description..
  /// </summary>
  /// <param name="index">current index of the slider</param>
  const renderItem = ({ item, index }, props) => {
    return (
      <View style={styles.sliderTextWrapper}>
        <Text style={styles.infoText}>{item.title}</Text>
        {item.description != "" && <Text style={styles.infoText}>{item.description}</Text>}
        <View style={{ flexDirection: 'row' }}>
          <Text style={styles.infoText}>{item.goToNext ? item.descriptionOnTrue : item.descriptionOnFalse}</Text>
          {currentIndex == 3 && !item.showHint && <Button style={styles.hintButton} onPress={() => { showThoughtHint(tutorial) }}>
            <Text style={styles.sliderButtonText}>hint</Text>
          </Button>}
          {currentIndex == 3 && item.showHint && <Text style={styles.infoText}>{item.hint}</Text>}
        </View>
      </View>
    );
  }

  const carouselView = () => {
    return (<View style={styles.carouselWrapper}>
      <Carousel
        ref={(c) => { _carousel = c; }}
        lockScrollWhileSnapping={true}
        data={tutorial}
        renderItem={(params) => renderItem(params)}
        onSnapToItem={(index) => handleSnapToItem(index, currentIndex)}
        sliderWidth={width}
        activeSlideOffset={2}
        itemWidth={width}
        layout={'default'}
        firstItem={0}
        enableMomentum={true}
      />
      {pagination()}
      <View style={styles.sliderButtonWrapper}>
        {currentIndex != tutorial.length - 1 ?
          <Button style={currentIndex == 0 ? styles.sliderButtonDisablePrev : styles.sliderButton} onPress={() => { snapToPrevSlide(currentIndex) }}>
            <Text style={styles.sliderButtonText}>Prev</Text>
          </Button> : <Button style={styles.buttonLearnMore} onPress={() => { props.navigation.navigate('LearnMore') }} >
            <Text style={styles.sliderButtonText}>Learn More</Text>
          </Button>}
        {currentIndex != tutorial.length - 1 ?
          tutorial[currentIndex].goToNext ?
            <Button style={styles.sliderButton} onPress={() => { snapToNextSlide(currentIndex) }}>
              <Text style={styles.sliderButtonText}>Next</Text>
            </Button> :
            <Text style={styles.instructionText}>Complete the instructions to continue</Text> :
          <Button style={styles.buttonPlayOnMyOwn} onPress={() => { props.navigation.navigate('ThoughtList') }}>
            <Text style={styles.sliderButtonText}>Play On My Own</Text>
          </Button>}
      </View>
    </View>)
  }

  return (
    <Container>
      <Header style={{ height: 0 }} androidStatusBarColor='#1B1B1A'></Header>
      <View style={styles.container}>
        {carouselView()}
        <Content>
          <View style={styles.thoughtsBody}>
            {currentIndex == 0 ?
              <View style={styles.welcomeTextWrapper}>
                <Text style={styles.welcomeText}>Ahhh. Open space. Unlimited possibilities.</Text>
              </View> :
              ThoughtList(thoughtList)}
          </View>
        </Content>
      </View>
    </Container>
  );
}
export default TutorialHome


