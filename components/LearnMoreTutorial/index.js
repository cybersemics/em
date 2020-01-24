import React, { Component, } from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions, Keyboard } from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
import Carousel, { Pagination } from 'react-native-snap-carousel'; // 3.6.0
import { Button, Container, Header, Content } from 'native-base';
import styles from './styles'
import { showTutorialList, setContentTypeValue } from './TutorialList'
const { width, height } = Dimensions.get('window');
let tempList = []
let contentItem1 = 'Home'
let contentItem2 = 'Work'
let contentSublist = 'To Do'
let deleteThought = false

export default class TutorialHome extends Component {
    constructor(props) {
        super(props);
        this._carousel = {};
        this.state = {
            tutorial: [...showTutorialList(0)],
            currentIndex: 0,
            thoughtsList: [{}],
            thought: '',
            focusedThought: '',
            enableDotTapping: false
        };
    }

    /// <summary>
    /// TODO : set current index when slider changes..
    /// </summary>
    /// <param name="index">current index of the slider</param>
    /// <param name="currentIndex">current value of the currentIndex state</param>
    handleSnapToItem = (index) => {
        if (this.state.currentIndex != index) {
            this.setState({
                currentIndex: index
            })
        }
    }

    /// <summary>
    /// TODO : Go to next slider..
    /// </summary>
    /// <param name="index">current index of the slider</param>
    snapToNextSlide = (index) => {
        if (this.state.tutorial.length - 1 > index) {
            this.setState({
                currentIndex: index
            }, () => {
                this._carousel.snapToItem(index + 1)
            })
        }
        else {
            this.setState({
                currentIndex: this.state.tutorial.length - 1
            })
        }
        if (!this.state.enableDotTapping) {
            this.setState({
                enableDotTapping: true
            })
        }
    }

    /// <summary>
    /// TODO : Go to previous slider..
    /// </summary>
    /// <param name="index">current index of the slider</param>
    snapToPrevSlide = (index) => {
        if (index != 0) {
            this.setState({
                currentIndex: index
            })
            this._carousel.snapToItem(index - 1);
        }
    }


    /// <summary>
    /// TODO : Display the text in slider description..
    /// </summary>
    /// <param name="index">current index of the slider</param>
    _renderItem = ({ item, index }) => {
        return (
            <View style={styles.sliderTextWrapper}>
                {this.state.currentIndex == 7 && this.superScriptText(index, item.ocurrenceText)}
                {this.state.tutorial[this.state.currentIndex].title != "" && <Text style={index == 7 ? styles.tutorialCountText : styles.tutorialText}>{item.title}</Text>}
                {this.state.currentIndex == 0 && this.superScriptText(index, item.ocurrenceText)}
                {this.state.tutorial[this.state.currentIndex].description != "" && <Text style={styles.tutorialText}>{item.description}</Text>}
                {item.descriptionOnFalse != "" &&
                    <Text style={styles.tutorialText}>{item.goToNext ? item.descriptionOnTrue : item.descriptionOnFalse}</Text>}
                {this.state.currentIndex > 1 && this.state.currentIndex < 8 && !item.showHint && <Button style={styles.hintButton} onPress={() => { this.showThoughtHint(index) }}>
                    <Text style={styles.sliderButtonText}>hint</Text>
                </Button>}
                {this.state.currentIndex > 1 && this.state.currentIndex < 8 && item.showHint && <Text style={styles.tutorialText}>{item.hint1}{item.hint2}</Text>}

            </View>
        );
    }

    /// <summary>
    /// TODO : To show hint in tutorial..
    /// </summary>
    showThoughtHint = (index) => {
        let myTutorialList = []
        myTutorialList = this.state.tutorial;
        myTutorialList[index].showHint = true
        this.setState({
            tutorial: myTutorialList
        })
    }

    /// <summary>
    /// TODO : To complete tutorial step..
    /// </summary>
    /// <param name="tutorialIndex">current index of the tutorial</param>
    /// <param name="categoryName">name of category i.e. Home,Work,Journal</param>
    tutorialStep = (tutorialIndex, categoryName) => {
        this.state.thoughtsList.forEach((item) => {
            if (item.hasOwnProperty("thought") && item.thought == categoryName && item.hasOwnProperty("subList")) {
                console.log('inside home')
                item.subList.forEach((subList) => {
                    console.log(subList)
                    if (subList.hasOwnProperty("thought") && subList.thought == contentSublist) {
                        if (tutorialIndex == 3 || tutorialIndex == 6) {
                            this.snapToNextSlide(tutorialIndex)
                        }
                        else {
                            if (subList.hasOwnProperty("subList")) {
                                subList.subList.forEach((subList1) => {
                                    if (subList1.hasOwnProperty("thought")) {
                                        this.snapToNextSlide(tutorialIndex)
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
    /// TODO : To Add Thought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    addThought = (myThoughtList, index) => {
        tempList = []
        let currentIndex = this.state.currentIndex
        let currentThought = this.state.thought
        let myThought = this.state.thought
        if ((currentIndex == 2 && currentThought == contentItem1) || (currentIndex == 5 && currentThought == contentItem2)) {
            this.snapToNextSlide(currentIndex)
        }
        else if (currentIndex == 3 || currentIndex == 4) {
            this.tutorialStep(currentIndex, contentItem1)
        }
        else if (currentIndex == 6 || currentIndex == 7) {
            this.tutorialStep(currentIndex, contentItem2)
        }
        let obj = {}
        if (this.state.focusedThought != myThoughtList[index].thought && !(myThoughtList[index].hasOwnProperty("subList"))) {
            obj.thought = this.state.thought,
                obj.count = 1
            myThoughtList[index] = obj
        }
        if (index == myThoughtList.length - 1) {
            myThoughtList.push({})
        }

        this.setInitialList(this.state.thoughtsList)

        var occurrences = tempList.filter((val) => {
            return val === myThought;
        }).length;

        if (occurrences > 1) {
            this.setUpdatedCount(this.state.thoughtsList, myThought, occurrences)
        }
        this.setState({}, () => {
            console.log(this.state.thoughtsList)
        })
    }

    /// <summary>
    /// TODO : To convert the nested thought list to single list..
    /// </summary>
    /// <param name="myList">thought list or subthought list</param>
    setInitialList = (myList) => {
        myList.forEach((item) => {
            if (item.hasOwnProperty('thought')) {
                tempList.push(item.thought)
            }
            if (item.hasOwnProperty('subList')) {
                this.setInitialList(item.subList)
            }
        })
        console.log(tempList)
    }

    /// <summary>
    /// TODO : Update the list with count of each thought..
    /// </summary>
    /// <param name="myList">thought list or subthought list</param>
    /// <param name="thought">thought to be added</param>
    /// <param name="occurrences">total ocurrences of the thought in thoughtList</param>
    setUpdatedCount = (myList, thought, occurrences) => {
        myList.forEach((item) => {
            if (item.hasOwnProperty('thought')) {
                if (item.thought == thought) {
                    console.log('thought' + item.thought + item.count.toString())
                    item.count = occurrences
                    this.setState({})
                }
            }
            if (item.hasOwnProperty('subList')) {
                this.setUpdatedCount(item.subList, thought, occurrences)
            }
        })
        console.log(tempList)
    }

    /// <summary>
    /// TODO : To create a subThought list in a Thought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    addSubThought = (myThoughtList, index) => {
        let obj = {}
        if (myThoughtList[index].hasOwnProperty("subList")) {
            myThoughtList[index].subList.push(obj)
        }
        else {
            myThoughtList[index].subList = [obj]
            myThoughtList[index].isOpen = true
        }
        this.setState({})
    }

    /// <summary>
    /// TODO : To hide or show the subthought list ..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    handleHideShow = (myThoughtList, index) => {
        myThoughtList[index].isOpen = !(myThoughtList[index].isOpen)
        this.setState({})
    }

    /// <summary>
    /// TODO : To Edit Thought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="myThought">thought to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    editThought = (myThoughtList, myThought, index) => {
        let initialThought = myThoughtList[index].thought
        myThoughtList[index].thought = myThought
        if (myThoughtList[index].count > 1) {
            let count = myThoughtList[index].count - 1
            myThoughtList[index].count = 1
            this.setUpdatedCount(myThoughtList, initialThought, count)
        }
        this.setState({
            thought: myThought
        })
    }

    /// <summary>
    /// TODO : To display the current index of slider with selected dots..
    /// </summary>
    get pagination() {
        return (
            <Pagination
                carouselRef={this._carousel}
                dotsLength={10}
                containerStyle={this.state.currentIndex == 1 ? styles.paginationContainerContentType : styles.paginationContainer}
                dotContainerStyle={styles.paginationDotContainer}
                activeDotIndex={this.state.currentIndex}
                dotStyle={styles.paginationDot}
                inactiveDotOpacity={0.2}
                tappableDots={this.state.enableDotTapping}
                inactiveDotScale={0.8}
            />
        );
    }

    /// <summary>
    /// TODO : To display all thoughts and subthoughts..
    /// </summary>
    /// <param name="data">list of all thoughts</param>
    ThoughtList = (data) => {
        return (
            <View style={styles.thoughtListWrapper}>
                {data.map((item, index) => {
                    return (<View key={index}  ><View style={{ flexDirection: 'row' }} >
                        {item.hasOwnProperty("thought") && <TouchableOpacity style={styles.dotIconWrapper} onPress={() => {
                            item.hasOwnProperty("subList") ? this.handleHideShow(data, index) : this.addSubThought(data, index)
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
                        </TouchableOpacity>}
                        {!(item.hasOwnProperty("thought")) && <TouchableOpacity style={styles.addIconWrapper} >
                            <MaterialIcons
                                name='add'
                                size={20}
                                style={styles.listItemIcon}
                                color='white'
                            />
                        </TouchableOpacity>}
                        <TextInput style={styles.thoughtText} value={item.thought}
                            placeholder={item.hasOwnProperty('thought') && item.thought != '' ? '' : 'Add a thought'}
                            onChangeText={(thought) => { this.editThought(data, thought, index) }}
                            onKeyPress={(event) => { this.deleteThought(event, data, index) }}
                            onFocus={() => { this.selectThought(item.thought) }}
                            onBlur={() => { this.setState({ focusedThought: '' }) }}
                            ref={input => {
                                this[`thought${index}`] = input;
                            }} onSubmitEditing={() => { this.addThought(data, index) }}>
                        </TextInput>
                        {item.hasOwnProperty("count") && item.count != 1 && <Text style={styles.count}>{item.count}</Text>}
                    </View>
                        {item.hasOwnProperty("subList") && item.isOpen && this.ThoughtList(item.subList)}
                    </View>
                    )
                })}
            </View>
        );
    }

    selectThought = (thought) => {
        this.setState({ focusedThought: thought })
        deleteThought = false
    }

    deleteThought = (event, myThoughtList, index) => {
        if (event.nativeEvent.key == 'Backspace' && this.state.thought == '') {
            if (deleteThought) {
                if (myThoughtList.length > 1 && !(myThoughtList[index].hasOwnProperty('subList'))) {
                    myThoughtList.splice(index, 1);
                    console.log('delete')
                    this.setState({})
                }
            }
            deleteThought = !deleteThought
        }
    }

    render = () => {
        return (
            <Container>
                <Header style={{ height: 0 }} androidStatusBarColor='#1B1B1A'></Header>
                <View style={styles.container}>
                    <View style={styles.carouselWrapper}>
                        <Carousel
                            ref={(c) => { this._carousel = c; }}
                            lockScrollWhileSnapping={true}
                            data={this.state.tutorial}
                            renderItem={this._renderItem}
                            onSnapToItem={(index) => this.handleSnapToItem(index)}
                            sliderWidth={width}
                            activeSlideOffset={2}
                            itemWidth={width}
                            layout={'default'}
                            firstItem={0}
                            enableMomentum={true}
                        />

                        {this.pagination}
                        {this.state.currentIndex == 1 ?
                            <View style={styles.contentTypeButtonWrapper}>
                                <Button style={styles.contentTypeButton} onPress={() => { this.selectContentType(0) }}>
                                    <Text style={styles.contentTypeButtonText}>To-Do List</Text>
                                </Button>
                                <Button style={styles.contentTypeButton} onPress={() => { this.selectContentType(1) }}>
                                    <Text style={styles.contentTypeButtonText}>Journal Theme</Text>
                                </Button>
                                <Button style={styles.contentTypeButton} onPress={() => { this.selectContentType(2) }}>
                                    <Text style={styles.contentTypeButtonText}>Book/Podcast Notes</Text>
                                </Button>
                            </View>
                            : <View style={styles.sliderButtonWrapper}>
                                <Button style={styles.sliderButton} onPress={() => { this.snapToPrevSlide(this.state.currentIndex) }}>
                                    <Text style={styles.sliderButtonText}>Prev</Text>
                                </Button>
                                {this.state.tutorial[this.state.currentIndex].goToNext ?
                                    <Button style={styles.sliderButton} onPress={() => { this.snapToNextSlide(this.state.currentIndex) }}>
                                        <Text style={styles.sliderButtonText}>Next</Text>
                                    </Button> :
                                    <Text style={styles.instructionText}>Complete the instructions to continue</Text>}
                            </View>}
                    </View>
                    <Content style={{ backgroundColor: 'black' }}>
                        <View style={styles.thoughtsBody}>
                            {(this.state.currentIndex > 1) ?
                                this.ThoughtList(this.state.thoughtsList) :
                                <View style={styles.welcomeTextWrapper}>
                                    <Text style={styles.welcomeText}>Ahhh. Open space. Unlimited possibilities.</Text>
                                </View>}
                        </View>
                    </Content>
                </View>
            </Container>
        );
    }

    /// <summary>
    /// TODO : To show the text as superscript (for count)..
    /// </summary>
    /// <param name="index">index of tutorial where superscript is to be shown</param>
    /// <param name="text">text with the superscript</param>
    superScriptText = (index, text) => {
        return (<View style={index != 0 ? styles.superScriptView : { ...styles.superScriptView, marginTop: 0 }}>
            <Text style={styles.tutorialCountText}>{text}(</Text>
            <Text style={styles.tutorialCount}>{index == 0 ? '3' : '2'}</Text>
            <Text style={styles.tutorialCountText}>)</Text>
        </View>)
    }

    /// <summary>
    /// TODO : To select the content type for tutorial..
    /// </summary>
    /// <param name="contentType">content type i.e. Home,Work,Journal</param>
    selectContentType = (contentType) => {
        var tutorialList = showTutorialList(contentType)
        this.setState({
            tutorial: tutorialList
        })
        let contentTypeValues = setContentTypeValue(contentType)
        contentItem1 = contentTypeValues.contentItem1
        contentItem2 = contentTypeValues.contentItem2
        contentSublist = contentTypeValues.contentSublist
        console.log(contentItem1 + contentItem2 + contentSublist)
        this.snapToNextSlide(this.state.currentIndex)
    }
}


