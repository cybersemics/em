const tutorialHome = [
  {
    id: "0",
    title: "If the same thought appears in more than one place, em shows a small number to the right of the thought, ",
    ocurrenceText: "for example: ",
    description: "Let's see this in action.",
    descriptionOnFalse: "",
    descriptionOnTrue: "",
    goToNext: true
  }, {
    id: "1",
    title: "For this tutorial, choose what kind of content you want to create. You will learn the same command regardless of which one you choose.",
    description: "",
    descriptionOnFalse: "",
    descriptionOnTrue: "",
    goToNext: false
  },
  {
    id: "2",
    title: "Let's begin! Create a new thought with the text “Home”.",
    description: "You should create this thought at the top level, i.e. not within any other thoughts.",
    descriptionOnFalse: "",
    descriptionOnTrue: "",
    goToNext: false,
    showHint: false,
    hint2: `Hit the Enter key to create a new thought. Then type "Home".`,
    hint1: ""
  },
  {
    id: "3",
    title: `Let's say that you want to make a list of things you have to do at home. Add a thought with the text "To Do" within “Home”.`,
    description: "Do you remember how to do it?",
    descriptionOnFalse: "",
    descriptionOnTrue: "",
    goToNext: false,
    showHint: false,
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Home". Then type "To Do".`,
    hint1: `Select "Home".`
  },
  {
    id: "4",
    title: "Now add a thought to “To Do”. This could be any task you'd like to get done.",
    description: "Do you remember how to do it?.",
    descriptionOnFalse: "",
    descriptionOnTrue: "Click the Next button when you are done entering your thought.",
    goToNext: false,
    showHint: false,
    hint2: `Hold Ctrl and hit Enter to create a new thought within "To Do".`,
    hint1: `Select "To Do". `
  },
  {
    id: "5",
    title: `Now we are going to create a different "To Do" list.`,
    description: `Create a new thought with the text “Work” after "Home" (but at the same level).`,
    descriptionOnFalse: "",
    descriptionOnTrue: "",
    goToNext: false,
    showHint: false,
    hint1: `Select "Home."`,
    hint2: `Hit the Enter key to create a new thought after "Home". Then type "Work".`
  },
  {
    id: "6",
    title: `Now add a thought with the text "To Do" within “Work”.`,
    description: "Do you remember how to do it?.",
    descriptionOnFalse: "",
    descriptionOnTrue: "",
    goToNext: false,
    showHint: false,
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Work".`,
    hint1: `Select "Work". `
  },
  {
    id: "7",
    title: `This means that “To Do” appears in 2 places, or contexts (in our case "Home" and "Work").`,
    ocurrenceText: "Notice the small number",
    description: "Imagine a new work task. Add it to this “To Do” list.",
    descriptionOnFalse: "Do you remember how to do it?",
    descriptionOnTrue: "",
    goToNext: false,
    showHint: false,
    hint2: `Hold Ctrl and hit Enter to create a new thought within "To Do"`,
    hint1: `Select "To Do".`
  },
  {
    id: "8",
    title: "Now I'm going to show you the keyboard shortcut to view multiple contexts.",
    description: `First select "To Do"`,
    descriptionOnFalse: "",
    descriptionOnTrue: "",
    goToNext: false
  },
  {
    id: "9",
    title: "Congratulations... You have completed Part I of this tutorial.You know the basics of creating thoughts in em",
    description: "How are you feeling?Would you like to learn more or play on your own.",
    descriptionOnFalse: "",
    descriptionOnTrue: "",
    goToNext: true
  },
];


const tutorialJournal = [
  {
    ...tutorialHome[0]
  },
  {
    ...tutorialHome[1]
  },
  {
    ...tutorialHome[2],
    title: "Let's begin! Create a new thought with the text “Journal”.",
    hint2: `Hit the Enter key to create a new thought. Then type "Journal".`,

  },
  {
    ...tutorialHome[3],
    title: `Let's say that one of the themes in your journal is "Relationships". Add a thought with the text "Relationships" within “Journal”.`,
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Journal". Then type "Relationships".`,
    hint1: `Select "Journal".`
  },
  {
    ...tutorialHome[4],
    title: "Now add a thought to “Relationships”. This could be a specific person or a general thought about relationships.",
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Relationships".`,
    hint1: `Select "Relationships". `
  },
  {
    ...tutorialHome[5],
    title: `Now we are going to create a different "Relationships" list.`,
    description: `You probably talk about relationships in therapy. Create a new thought with the text “Therapy” after "Journal" (but at the same level).`,
    hint1: `Select "Journal"`,
    hint2: `Hit the Enter key to create a new thought after "Journal". Then type "Therapy".`
  },
  {
    ...tutorialHome[6],
    title: `Now add a thought with the text "Relationships" within “Therapy”`,
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Therapy".`,
    hint1: `Select "Therapy". `
  },
  {
    ...tutorialHome[7],
    title: `This means that “Relationships” appears in 2 places, or contexts (in our case "Journal" and "Therapy").`,
    description: "Imagine a realization you have about relationships in therapy. Add it to this “Relationships” list.",
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Relationships"`,
    hint1: `Select "Relationships".`
  },
  {
    ...tutorialHome[8],
    description: `First select "Relationships"`,
  },
  {
    ...tutorialHome[9],
  },
];

const tutorialPodcasts = [
  {
    ...tutorialHome[0]
  },
  {
    ...tutorialHome[1]
  },
  {
    ...tutorialHome[2],
    title: "Let's begin! Create a new thought with the text “Podcasts”.",
    hint2: `Hit the Enter key to create a new thought. Then type "Podcasts".`,

  },
  {
    ...tutorialHome[3],
    title: `Let's say that you hear a podcast on Psychology. Add a thought with the text "Psychology" within “Podcasts”.`,
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Podcasts". Then type "Psychology".`,
    hint1: `Select "Podcasts".`
  },
  {
    ...tutorialHome[4],
    title: "Now add a thought to “Psychology”. You can just make up something about Psychology you could imagine hearing on a podcast.",
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Psychology".`,
    hint1: `Select "Psychology". `
  },
  {
    ...tutorialHome[5],
    title: `Now we are going to create a different "Psychology" list.`,
    description: `This time imagine reading a book about Psychology. Create a new thought with the text “Books” after "Podcasts" (but at the same level).`,
    hint1: `Select "Podcasts"`,
    hint2: `Hit the Enter key to create a new thought after "Podcasts". Then type "Books".`
  },
  {
    ...tutorialHome[6],
    title: `Now add a thought with the text "Psychology" within “Books”`,
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Books".`,
    hint1: `Select "Books". `
  },
  {
    ...tutorialHome[7],
    title: `This means that “Psychology” appears in 2 places, or contexts (in our case "Podcasts" and "Books").`,
    description: "Imagine a new thought related to psychology. Add it to this “Psychology” list.",
    hint2: `Hold Ctrl and hit Enter to create a new thought within "Psychology"`,
    hint1: `Select "Psychology".`
  },
  {
    ...tutorialHome[8],
    description: `First select "Psychology"`,
  },
  {
    ...tutorialHome[9],
  },
];

export function setContentTypeValue(contentType) {
  const contentTypeHome = {
    contentItem1: 'Home',
    contentItem2: 'Work',
    contentSublist: 'To Do'
  }
  const contentTypeJournal = {
    contentItem1: 'Journal',
    contentItem2: 'Therapy',
    contentSublist: 'Relationships'
  }
  const contentTypePodcasts = {
    contentItem1: 'Podcasts',
    contentItem2: 'Books',
    contentSublist: 'Psychology'
  }
  if (contentType == 1) {
    return contentTypeJournal
  }
  else if (contentType == 2) {
    return contentTypePodcasts
  }
  else {
    return contentTypeHome
  }
}

export function showTutorialList(contentType) {
  if (contentType == 1) {
    return tutorialJournal
  }
  else if (contentType == 2) {
    return tutorialPodcasts
  }
  else {
    return tutorialHome
  }
}
