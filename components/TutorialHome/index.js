import React, { Component, } from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions } from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
import Carousel, { Pagination } from 'react-native-snap-carousel'; // 3.6.0
import { Button, Container, Header, Content } from 'native-base';
import styles from './styles'
import TutorialList from './TutorialList'
const { width, height } = Dimensions.get('window');
let deleteThought = false

export default class TutorialHome extends Component {

    constructor(props) {
        super(props);
        this._carousel = {};
        this.state = {
            tutorial: [...TutorialList],
            currentIndex: 0,
            thoughtsList: [{}],
            thought: '',
            focusedThought: '',
            enableDotTapping: false,
        };
    }

    /// <summary>
    /// TODO : set current index when slider changes..
    /// </summary>
    /// <param name="index">current index of the slider</param>
    /// <param name="currentIndex">current value of the currentIndex state</param>
    handleSnapToItem = (index, currentIndex) => {
        console.log("snapped to ")
        console.log(currentIndex)
        console.log(index)
        if (currentIndex != index) {
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
                currentIndex: index + 1
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
                currentIndex: index - 1
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
                <Text style={styles.infoText}>{item.title}</Text>
                {item.description != "" && <Text style={styles.infoText}>{item.description}</Text>}
                <View style={{ flexDirection: 'row' }}>
                    <Text style={styles.infoText}>{item.goToNext ? item.descriptionOnTrue : item.descriptionOnFalse}</Text>
                    {this.state.currentIndex==3 && !item.showHint && <Button style={styles.hintButton} onPress={() => { this.showThoughtHint() }}>
                        <Text style={styles.sliderButtonText}>hint</Text>
                    </Button>}
                    {this.state.currentIndex==3 && item.showHint && <Text style={styles.infoText}>{item.hint}</Text>}
                </View>
            </View>
        );
    }

    /// <summary>
    /// TODO : To show hint in step 4 of tutorial..
    /// </summary>
    showThoughtHint = () => {
        let myTutorialList = []
        myTutorialList = this.state.tutorial;
        myTutorialList[3].showHint = true
        this.setState({
            tutorial: myTutorialList
        })
    }

    /// <summary>
    /// TODO : To Add SubThought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    addThought = (myThoughtList, index) => {
        if (this.state.currentIndex == 1) {
            this.snapToNextSlide(1)
        }
        if (this.state.currentIndex == 3) {
            this.snapToNextSlide(3)
        }
        console.log('myThoughtList')
        console.log(myThoughtList)
        console.log(index)
        let obj = {}
        if (this.state.focusedThought != myThoughtList[index].thought && !(myThoughtList[index].hasOwnProperty("subList"))) {
            obj.thought = this.state.thought
            myThoughtList[index] = obj
        }
        if (index == myThoughtList.length - 1) {
            myThoughtList.push({})
        }
        this.setState({}, () => {
            console.log(this.state.thoughtsList)
        })
    }

    /// <summary>
    /// TODO : To create a subThought list in a Thought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    addSubThought = (myThoughtList, index) => {
        if (this.state.currentIndex == 5) {
            this.snapToNextSlide(5)
        }
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
        if (this.state.currentIndex == 7 && myThoughtList[index].isOpen) {
            console.log('goTo7')
            console.log(index)
            this.snapToNextSlide(7)
        }
        if (this.state.currentIndex == 8 && !myThoughtList[index].isOpen) {
            console.log('goTo8')
            console.log(index)
            this.snapToNextSlide(8)
        }
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
        if (this.state.currentIndex == 2) {
            this.tutorialStep(2, myThought)
        }
        else if (this.state.currentIndex == 4) {
            this.tutorialStep(4, myThought)
        }
        else if (this.state.currentIndex == 6) {
            this.tutorialStep(6, myThought)
        }
        myThoughtList[index].thought = myThought
        this.setState({
            thought: myThought
        }, () => {
            console.log('myThoughtList2')
            console.log(myThoughtList)
            console.log(this.state.thoughtsList)
        })
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

    /// <summary>
    /// TODO : To Complete the Step 3 5 & 7 of the tutorial..
    /// </summary>
    /// <param name="tutorialIndex">current index of the slider or tutorial</param>
    /// <param name="myThought">thought to be added</param>
    tutorialStep = (tutorialIndex, myThought) => {
        let myTutorialList = []
        myTutorialList = this.state.tutorial;
        if (myThought != '' && !myTutorialList[tutorialIndex].goToNext) {
            myTutorialList[tutorialIndex].goToNext = true
            this.setState({ tutorial: myTutorialList })
        }
        else if (myThought == '' && myTutorialList[tutorialIndex].goToNext) {
            myTutorialList[tutorialIndex].goToNext = false
            this.setState({ tutorial: myTutorialList })
        }
    }

    /// <summary>
    /// TODO : To display the current index of slider with selected dots..
    /// </summary>
    get pagination() {
        return (
            <Pagination
                carouselRef={this._carousel}
                dotsLength={10}
                containerStyle={styles.paginationContainer}
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
                    return (<View key={index}><View style={{ flexDirection: 'row' }} >
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
                            onChangeText={(thought) => { this.editThought(data, thought, index) }}
                            onKeyPress={(event) => { this.deleteThought(event, data, index) }}
                            onFocus={() => { this.selectThought(item.thought) }}
                            onBlur={() => { this.setState({ focusedThought: '' }) }}
                            ref={input => {
                                this[`thought${index}`] = input;
                            }} onSubmitEditing={() => { this.addThought(data, index) }}>
                        </TextInput>
                    </View>
                        {item.hasOwnProperty("subList") && item.isOpen && this.ThoughtList(item.subList)}
                    </View>
                    )
                })}
            </View>
        );
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
                            renderItem={this._renderItem.bind(this)}
                            onSnapToItem={(index) => this.handleSnapToItem(index, this.state.currentIndex)}
                            sliderWidth={width}
                            activeSlideOffset={2}
                            itemWidth={width}
                            layout={'default'}
                            firstItem={0}
                            enableMomentum={true}
                        />
                        {this.pagination}
                        <View style={styles.sliderButtonWrapper}>
                            {this.state.currentIndex != this.state.tutorial.length - 1 ?
                                <Button style={this.state.currentIndex == 0 ? styles.sliderButtonDisablePrev : styles.sliderButton} onPress={() => { this.snapToPrevSlide(this.state.currentIndex) }}>
                                    <Text style={styles.sliderButtonText}>Prev</Text>
                                </Button> : <Button style={styles.buttonLearnMore} onPress={() => { this.props.navigation.navigate('LearnMoreTutorial') }} >
                                    <Text style={styles.sliderButtonText}>Learn More</Text>
                                </Button>}

                            {this.state.currentIndex != this.state.tutorial.length - 1 ?
                                this.state.tutorial[this.state.currentIndex].goToNext ?
                                    <Button style={styles.sliderButton} onPress={() => { this.snapToNextSlide(this.state.currentIndex) }}>
                                        <Text style={styles.sliderButtonText}>Next</Text>
                                    </Button> :
                                    <Text style={styles.instructionText}>Complete the instructions to continue</Text> :
                                <Button style={styles.buttonPlayOnMyOwn} onPress={() => { this.props.navigation.navigate('ThoughtList') }}>
                                    <Text style={styles.sliderButtonText}>Play On My Own</Text>
                                </Button>}
                        </View>
                    </View>
                    <Content>
                        <View style={styles.thoughtsBody}>
                            {this.state.currentIndex == 0 ?
                                <View style={styles.welcomeTextWrapper}>
                                    <Text style={styles.welcomeText}>Ahhh. Open space. Unlimited possibilities.</Text>
                                </View> :
                                this.ThoughtList(this.state.thoughtsList)}                                
                        </View>
                    </Content>
                </View>
            </Container>
        );
    }
}


