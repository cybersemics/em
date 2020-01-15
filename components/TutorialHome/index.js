import React, { Component, } from 'react';
import { Image, View, Text, TouchableOpacity, TextInput, Dimensions } from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
import Carousel, { Pagination } from 'react-native-snap-carousel'; // 3.6.0
const { width, height } = Dimensions.get('window');
import styles from './styles'
import { Button } from 'native-base';

export default class TutorialHome extends Component {

    constructor(props) {
        super(props);
        this.props = props;
        this._carousel = {};
        this.init();
    }

    init() {
        this.state = {
            tutorial: [
                {
                    id: "0",
                    title: "Welcome to your personal thought space",
                    description1: "Don't worry.I will walk you through everything you need to know.",
                    description2: "Let's begin...",
                    goToNext: true
                }, {
                    id: "1",
                    title: "First Let me show you how to create a new thought in em",
                    description1: "Hit the enter key to create a new thought",
                    description2: "",
                    goToNext: false
                },
                {
                    id: "2",
                    title: "You did it !",
                    description1: "Now type something. Anything will do.",
                    description2: "",
                    goToNext: true
                },
                {
                    id: "3",
                    title: "Well done!",
                    description1: "Try adding another thought.Do you remember how to do it?",
                    description2: "",
                    goToNext: false
                },
                {
                    id: "4",
                    title: "Good Work!",
                    description1: "Hitting enter will always create a new thought after the currently selected thought.",
                    description2: "Wonderful. Click the next button when you are ready to continue.",
                    goToNext: true
                },
                {
                    id: "5",
                    title: "Now I am going to show you how to add a thought within another thought.",
                    description1: "Hold the Ctrl key and hit the Enter key.",
                    description2: "",
                    goToNext: false
                },
                {
                    id: "6",
                    title: "As you can see that the new thought is nested within the old thought.This is useful for using thought as a category.",
                    description1: "You can ceate thoughts withinthoughts within thoughts .There is no limit.",
                    description2: "",
                    goToNext: true
                },
                {
                    id: "7",
                    title: "Thoughts within thoughts are automatically hidden when you click away.Try clicking on the thought to hide it's subthought.",
                    description1: "",
                    description2: "",
                    goToNext: false
                },
                {
                    id: "8",
                    title: "There are no files to open or close in em.All your thoughts are in one place.You can stay focused because only a few thoughts are visible at a time.",
                    description1: "Click a thought to reveal its subthoughts.",
                    description2: "",
                    goToNext: false
                },
                {
                    id: "9",
                    title: "Congratulations... You have completed Part I of this tutorial.You know the basics of creating thoughts in em",
                    description1: "How are you feeling?Would you like to learn more or play on your own.",
                    description2: "",
                    goToNext: true
                },

            ],
            currentIndex: 0,
            thoughtsList: [{}],
            thought: '',
        };
    }

    /// <summary>
    /// TODO : set current index when slider changes..
    /// </summary>
    /// <param name="index">current index of the slider</param>
    handleSnapToItem = (index) => {
        console.log("snapped to ")
        console.log(index)
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
                currentIndex: index + 1
            })
            this._carousel.snapToItem(index + 1)
        }
        else {
            this.setState({
                currentIndex: this.state.tutorial.length - 1
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
        console.log("rendering,", index, item)
        return (
            <View style={styles.sliderTextWrapper}>
                <Text style={styles.infoText}>{item.title}</Text>
                <Text style={styles.infoText}>{item.description1}</Text>
                <Text style={styles.infoText}>{item.description2}</Text>

            </View>
        );
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
        let obj = {}
        obj.thought = this.state.thought

        myThoughtList[index] = obj
        if (index == myThoughtList.length - 1) {
            myThoughtList.push({})
        }
        this.setState({

        }, () => {
            console.log(this.state.thoughtsList)
        })
    }

    /// <summary>
    /// TODO : To create a subThought list in a Thought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    addSubThought = (myThoughtList, index) => {
        console.log('long presss')
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
        if (this.state.currentIndex == 2) {
            this.snapToNextSlide(2)
        }
        myThoughtList[index].thought = myThought
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
                activeDotIndex={this.state.currentIndex}
                dotStyle={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    marginHorizontal: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.92)'
                }}
                inactiveDotStyle={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    marginHorizontal: 0,
                }}
                inactiveDotOpacity={0.4}
                tappableDots={!!this._carousel}
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
            <View style={{ marginLeft: width * 0.05 }}>
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
            <View style={styles.container}>
                <View style={styles.carouselWrapper}>
                    <Carousel
                        ref={(c) => { this._carousel = c; }}
                        lockScrollWhileSnapping={true}
                        data={this.state.tutorial}
                        renderItem={this._renderItem.bind(this)}
                        onSnapToItem={(index) => this.handleSnapToItem(index)}
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
                            <Button style={styles.sliderButton} onPress={() => { this.snapToPrevSlide(this.state.currentIndex) }}>
                                <Text>Prev</Text>
                            </Button> : <Button style={styles.buttonLearnMore}  >
                                <Text>Learn More</Text>
                            </Button>}

                        {this.state.currentIndex != this.state.tutorial.length - 1 ?
                            this.state.tutorial[this.state.currentIndex].goToNext ?
                                <Button style={styles.sliderButton} onPress={() => { this.snapToNextSlide(this.state.currentIndex) }}>
                                    <Text>Next</Text>
                                </Button> :
                                <Text style={styles.instructionText}>Follow the instructions to continue</Text> :
                            <Button style={styles.buttonPlayOnMyOwn}>
                                <Text>Play On My Own</Text>
                            </Button>}
                    </View>
                </View>
                <View style={styles.thoughtsBody}>
                    {this.state.currentIndex == 0 ?
                        <View style={styles.welcomeTextWrapper}>
                            <Text style={styles.welcomeText}>Ahhh. Open space. Unlimited possibilities.</Text>
                        </View> :
                        this.ThoughtList(this.state.thoughtsList)}
                </View>
            </View>
        );
    }
}


