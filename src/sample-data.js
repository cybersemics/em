export default {
  root: {
    id: 'root',
    parents: [],
    children: ['a', 'work', 'growth']
  },
    a: {
      id: 'a',
      value: 'a',
      parents: ['root'],
      children: ['b']
    },
    b: {
      id: 'b',
      value: 'b',
      parents: ['root'],
      children: ['c']
    },
    c: {
      id: 'c',
      value: 'c',
      parents: ['b'],
      children: []
    },
    work: {
      id: 'work',
      value: 'Work',
      parents: ['root'],
      children: ['experience']
    },
      experience: {
        id: 'experience',
        value: 'Experience',
        parents: ['work'],
        children: ['stress']
      },
        stress: {
          id: 'stress',
          value: 'Stress',
          parents: ['experience', 'growth'],
          children: ['work'] // recursive
        },
    growth: {
      id: 'growth',
      value: 'Personal Growth',
      parents: ['root'],
      children: ['confidence', 'stress']
    },
      confidence: {
        id: 'confidence',
        value: 'Confidence',
        parents: ['growth'],
        children: []
      }
}
