import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions } from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
import Carousel, { Pagination } from 'react-native-snap-carousel'; // 3.6.0
import { Button, Container, Header, Content } from 'native-base';
import styles from './styles'
import { showTutorialList, setContentTypeValue } from './TutorialList'
const { width, height } = Dimensions.get('window');

function LearnMore({ ...props }) {
  const [count, setCount] = useState(0);
  const [thoughtList, setThoughtList] = useState([{}]);
  const [tutorial, setTutorial] = useState([...showTutorialList(0)]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [thought, setThought] = useState('');
  const [focusedThought, setFocusedThought] = useState('');
  const [deleteItem, setDeleteItem] = useState(false);
  const [enableDotTapping, setDotTapping] = useState(false);
  const values = {
    contentItem1: 'Home',
    contentItem2: 'Work',
    contentSublist: 'To Do'
  }
  const [contentTypeValues, setContentType] = useState(values)
  let tempList = []
  const _carousel = useRef(null);

  /// <summary>
  /// TODO : To add a thought..
  /// </summary>
  /// <param name="myThoughtList">thoughtList in which thought  is to be added</param>
  /// <param name="index">index where thought is to be added</param>	
  const addThought = (myThoughtList, index) => {
    tempList = []
    const content = contentTypeValues
    if ((currentIndex == 2 && thought == content.contentItem1) || (currentIndex == 5 && thought == content.contentItem2)) {
      snapToNextSlide(currentIndex)
    }
    else if (currentIndex == 3 || currentIndex == 4) {
      tutorialStep(currentIndex, content.contentItem1)
    }
    else if (currentIndex == 6 || currentIndex == 7) {
      tutorialStep(currentIndex, content.contentItem2)
    }
    const obj = {
      thought: thought,
      count: 1
    }
    if (focusedThought != myThoughtList[index].thought && !(myThoughtList[index].hasOwnProperty("subList"))) {
      myThoughtList[index] = obj
    }
    if (index == myThoughtList.length - 1) {
      myThoughtList.push({})
    }
    setInitialList(thoughtList)

    const occurrences = tempList.filter((val) => {
      return val === thought;
    }).length;

    if (occurrences > 1) {
      setUpdatedCount(thoughtList, thought, occurrences)
    }
    setCount(count + 1)
  }

  /// <summary>
  /// TODO : To convert the nested thought list to single list..
  /// </summary>
  /// <param name="myList">thought list or subthought list</param>
  const setInitialList = (myList) => {
    myList.forEach((item) => {
      if (item.hasOwnProperty('thought')) {
        tempList.push(item.thought)
      }
      if (item.hasOwnProperty('subList')) {
        setInitialList(item.subList)
      }
    })
  }

  /// <summary>
  /// TODO : Update the list with count of each thought..
  /// </summary>
  /// <param name="myList">thought list or subthought list</param>
  /// <param name="thought">thought to be added</param>
  /// <param name="occurrences">total ocurrences of the thought in thoughtList</param>
  const setUpdatedCount = (myList, thought, occurrences) => {
    myList.forEach((item) => {
      if (item.hasOwnProperty('thought')) {
        if (item.thought == thought) {
          item.count = occurrences
          setCount(count + 1)
        }
      }
      if (item.hasOwnProperty('subList')) {
        setUpdatedCount(item.subList, thought, occurrences)
      }
    })
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
    const initialThought = myThoughtList[index].thought
    myThoughtList[index].thought = myThought
    if (myThoughtList[index].count > 1) {
      const count = myThoughtList[index].count - 1
      myThoughtList[index].count = 1
      setUpdatedCount(myThoughtList, initialThought, count)
    }
    setThought(myThought)
  }

  /// <summary>
  /// TODO : To set value of selected thought in focusedThought variable..
  /// </summary>
  /// <param name="thought">thought which is selected</param>
  const selectThought = (thought) => {
    setFocusedThought(thought)
  }

  /// <summary>
  /// TODO : To delete a thought from thoughtList..
  /// </summary>
  /// <param name="event">thought which is selected</param>
  /// <param name="myThoughtList">list from which thought is to be deleted</param>	
  /// <param name="index">index of thought to be deleted</param>		
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
    myThoughtList[index].isOpen = !(myThoughtList[index].isOpen)
    setCount(count + 1)
  }


  /// <summary>
  /// TODO : To show hint in tutorial..
  /// </summary>
  /// <param name="tutorial">list of tutorial</param>
  /// <param name="index">position where hint is to be shown</param>
  const showThoughtHint = (tutorial, index) => {
    tutorial[index].showHint = true
    setCount(count + 1)
  }

  /// <summary>
  /// TODO : To complete tutorial step..
  /// </summary>
  /// <param name="tutorialIndex">current index of the tutorial</param>
  /// <param name="categoryName">name of category i.e. Home,Work,Journal</param>
  const tutorialStep = (tutorialIndex, categoryName) => {
    thoughtList.forEach((item) => {
      if (item.hasOwnProperty("thought") && item.thought == categoryName && item.hasOwnProperty("subList")) {
        item.subList.forEach((subList) => {
          if (subList.hasOwnProperty("thought") && subList.thought == contentTypeValues.contentSublist) {
            if (tutorialIndex == 3 || tutorialIndex == 6) {
              snapToNextSlide(tutorialIndex)
            }
            else {
              if (subList.hasOwnProperty("subList")) {
                subList.subList.forEach((subList1) => {
                  if (subList1.hasOwnProperty("thought")) {
                    snapToNextSlide(tutorialIndex)
                  }
                })
              }
            }
          }
        })
      }
    });
  }

  /// <summary>
  /// TODO : To select the content type for tutorial..
  /// </summary>
  /// <param name="contentType">content type i.e. Home,Work,Journal</param>	
  const selectContentType = (contentType) => {
    const tutorialList = showTutorialList(contentType)
    setTutorial(tutorialList)
    const contentTypeValues = setContentTypeValue(contentType)
    setContentType(contentTypeValues)
    snapToNextSlide(currentIndex)
  }

  /// <summary>
  /// TODO : set current index when slider changes..
  /// </summary>
  /// <param name="index">current index of the slider</param>
  /// <param name="currentIndex">current value of the currentIndex state</param>
  const handleSnapToItem = (index) => {
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
            {item.hasOwnProperty("count") && item.count != 1 && <Text style={styles.count}>{item.count}</Text>}
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
        {currentIndex == 7 && superScriptText(index, item.ocurrenceText)}
        {tutorial[currentIndex].title != "" && <Text style={index == 7 ? styles.tutorialCountText : styles.tutorialText}>{item.title}</Text>}
        {currentIndex == 0 && superScriptText(index, item.ocurrenceText)}
        {tutorial[currentIndex].description != "" && <Text style={styles.tutorialText}>{item.description}</Text>}
        {tutorial[currentIndex].descriptionOnFalse != "" &&
          <Text style={styles.tutorialText}>{item.goToNext ? item.descriptionOnTrue : item.descriptionOnFalse}</Text>}
        {currentIndex > 1 && currentIndex < 8 && !item.showHint && <Button style={styles.hintButton} onPress={() => { showThoughtHint(tutorial, index) }}>
          <Text style={styles.sliderButtonText}>hint</Text>
        </Button>}
        {currentIndex > 1 && currentIndex < 8 && item.showHint && <Text style={styles.hintText}>{item.hint1}{item.hint2}</Text>}
      </View>
    );
  }

  const superScriptText = (index, text) => {
    return (<View style={index != 0 ? styles.superScriptView : { ...styles.superScriptView, marginTop: 0 }}>
      <Text style={styles.tutorialCountText}>{text}(</Text>
      <Text style={styles.tutorialCount}>{index == 0 ? '3' : '2'}</Text>
      <Text style={styles.tutorialCountText}>)</Text>
    </View>)
  }

  const carouselView = () => {
    return (<View style={styles.carouselWrapper}>
      <Carousel
        ref={(c) => { _carousel = c; }}
        lockScrollWhileSnapping={true}
        data={tutorial}
        renderItem={(params) => renderItem(params)}
        onSnapToItem={(index) => handleSnapToItem(index)}
        sliderWidth={width}
        activeSlideOffset={2}
        itemWidth={width}
        layout={'default'}
        firstItem={0}
        enableMomentum={true}
      />
      {pagination()}
      {currentIndex == 1 ?
        <View style={styles.contentTypeButtonWrapper}>
          <Button style={styles.contentTypeButton} onPress={() => { selectContentType(0) }}>
            <Text style={styles.contentTypeButtonText}>To-Do List</Text>
          </Button>
          <Button style={styles.contentTypeButton} onPress={() => { selectContentType(1) }}>
            <Text style={styles.contentTypeButtonText}>Journal Theme</Text>
          </Button>
          <Button style={styles.contentTypeButton} onPress={() => { selectContentType(2) }}>
            <Text style={styles.contentTypeButtonText}>Book/Podcast Notes</Text>
          </Button>
        </View>
        : <View style={styles.sliderButtonWrapper}>
          <Button style={styles.sliderButton} onPress={() => { snapToPrevSlide(currentIndex) }}>
            <Text style={styles.sliderButtonText}>Prev</Text>
          </Button>
          {tutorial[currentIndex].goToNext ?
            <Button style={styles.sliderButton} onPress={() => { snapToNextSlide(currentIndex) }}>
              <Text style={styles.sliderButtonText}>Next</Text>
            </Button> :
            <Text style={styles.instructionText}>Complete the instructions to continue</Text>}
        </View>}
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
export default LearnMore


