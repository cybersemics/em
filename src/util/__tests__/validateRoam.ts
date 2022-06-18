import validateRoam from '../validateRoam'

export const testData = [
  {
    title: 'Fruits',
    children: [
      {
        string: 'Apple',
        'create-email': 'test_create@gmail.com',
        'edit-email': 'test_edit@gmail.com',
        'create-time': 1600111381583,
        uid: 'AP11200',
        children: [
          {
            string: 'Granny Smith',
            'create-email': 'test_create@gmail.com',
            'edit-time': 1600111381583,
            'create-time': 1600111381583,
            uid: 'AP11200',
          },
          {
            string: 'Gala',
            'create-email': 'test_create@gmail.com',
            'edit-email': 'test_edit@gmail.com',
            'create-time': 1600111381583,
            uid: 'AP11200',
          },
        ],
      },
      {
        string: 'Orange',
        'create-email': 'test_create@yahoo.com',
        'edit-email': 'test_edit@yahoo.com',
        'create-time': 1600111383054,
        uid: 'OR11233',
      },
    ],
  },
  {
    title: 'Veggies',
    children: [
      {
        string: 'Broccoli',
        'create-email': 'test_create@gmail.com',
        'edit-email': 'test_edit@gmail.com',
        'create-time': 1600111381600,
        uid: 'BR11200',
      },
      {
        string: 'Spinach',
        'create-email': 'test_create@icloud.com',
        'edit-email': 'test_edit@icloud.com',
        'create-time': 1600111389054,
        uid: 'SP11233',
      },
    ],
  },
]

test('it returns true for a valid roam string', () => {
  expect(validateRoam(JSON.stringify(testData))).toBe(true)
})

test('it returns false for an invalid title', () => {
  const invalidRoamString = JSON.stringify([{ ...testData[0], title: [] }])
  expect(validateRoam(invalidRoamString)).toBe(false)
})

test('it returns false if there are any missing properties', () => {
  type requiredKeyTypes = 'create-email' | 'uid' | 'create-time' | 'string'
  const requiredKeys = ['create-email', 'uid', 'create-time', 'string']
  requiredKeys.forEach(key => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const invalidRoamString = JSON.stringify([
      {
        ...testData[0],
        children: testData[0].children.map(({ [key as requiredKeyTypes]: requiredKey, ...rest }) => ({ ...rest })),
      },
    ])
    expect(validateRoam(invalidRoamString)).toBe(false)
  })
})

test('it returns false for an invalid create-email value', () => {
  const invalidRoamString = JSON.stringify([
    { ...testData[0], children: testData[0].children.map(child => ({ ...child, 'create-email': 1011 })) },
  ])
  expect(validateRoam(invalidRoamString)).toBe(false)
})

test('it returns false for an invalid create-time value', () => {
  const invalidRoamString = JSON.stringify([
    {
      ...testData[0],
      children: testData[0].children.map(child => ({ ...child, 'create-time': '2020-11-06T08:52:50.742Z' })),
    },
  ])
  expect(validateRoam(invalidRoamString)).toBe(false)
})

test('it returns false for an invalid uid value', () => {
  const invalidRoamString = JSON.stringify([
    { ...testData[0], children: testData[0].children.map(child => ({ ...child, uid: 1011 })) },
  ])
  expect(validateRoam(invalidRoamString)).toBe(false)
})

test('it returns false for an invalid string value', () => {
  const invalidRoamString = JSON.stringify([
    { ...testData[0], children: testData[0].children.map(child => ({ ...child, string: 1011 })) },
  ])
  expect(validateRoam(invalidRoamString)).toBe(false)
})

test('it returns false for an invalid children value', () => {
  const invalidRoamString = JSON.stringify([{ ...testData[0], children: 1234 }])
  expect(validateRoam(invalidRoamString)).toBe(false)
})
