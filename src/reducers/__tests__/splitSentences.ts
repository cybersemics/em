import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

import { newThought, splitSentences } from '../../reducers'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

describe('split by comma', () => {

  it('split single thought on comma when there are no periods', () => {
    const thought = 'One, Two, Three'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three`)
  })

  it('split single thought on comma if a thought with a mix of commas and periods has only one period and it\'s the last character', () => {
    const thought = 'One, Two, Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three.`)
  })

  it('split single thought on comma and remove the empty thought when there are empty space after the period', () => {
    const thought = 'One, Two, Three.  '
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three.`)
  })

  it('split single thought on comma and remove the empty space when there are no periods but empty space in the end', () => {
    const thought = 'One, Two, Three  '
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three`)
  })

  it('split single thought on commas when there is a combination of periods and commas, but no empty space followed by the periods.', () => {
    const thought = 'One.Two, Three'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.Two
  - Three`)
  })
})

describe('simple split', () => {

  it('split single thought by sentences', () => {
    const thought = 'One. Two. Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two.
  - Three.`)
  })

  it('split single thought on period when there is a combination of periods and commas.', () => {
    const thought = 'One. Two, Three'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two, Three`)
  })

  it('split single thought on main split characters if thought has only one period at the end but has other split characters too, even there is no empty space followed by that splitter', () => {
    const thought = 'One,Seven?Two!Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One,Seven?
  - Two!
  - Three.`)
  })

  it('split thought by sentences surrounded by siblings', () => {
    const steps = [
      newThought('a'),
      newThought('One. Two. Three.'),
      newThought('b'),
      setCursorFirstMatch(['One. Two. Three.']),
      splitSentences()
    ]

    const stateNew = reducerFlow(steps)(initialState())
    const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

    expect(exported).toBe(`- ${HOME_TOKEN}
  - a
  - One.
  - Two.
  - Three.
  - b`)
  })

  it('split single thought as expected if the thought has splitter ... and ?!', () => {
    const thought = 'One... Two?! Three. '
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One...
  - Two?!
  - Three.`)
  })

  it('split single thought by splitters and remove the empty thought when the thought ends with empty spaces after the splitter. ', () => {
    const thought = 'One. Two.  '
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two.`)
  })
})

// When it ends with .", .), !), ?"), ;), etc.
describe('brackets or quatations', () => {

  it('split single thought on the way that the closed bracket goes with the previous sentence if a splitter is immediately followed by a closed bracket', () => {
    const thought = 'One. (Two.)Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - (Two.)
  - Three.`)
  })

  it('split the single thought on the way that the left quotation marks should go with the sentence that is on the right of the splitter, while the right quotation marks should go with the sentence which is on the left of the splitter', () => {
    const thought = 'One." Two."Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - " Two."
  - Three.`)
  })

  it('split the single thought as expected if multiple sets of brackets and quotation marks present in one sentence. ', () => {
    const thought = 'One.(Two) "Three."   Four.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.(Two) "Three."
  - Four.`)
  })

  it('split single thought as expected if closed brackets and quotation marks present in one sentence. ', () => {
    const thought = 'One. ("Two?") "(Three.Four?)"  Five.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - ("Two?")
  - "(Three.Four?)"
  - Five.`)
  })

  it('split single thoughtas expected if a closed bracket present before a left quotation mark. ', () => {
    const thought = 'One. (Two?)"  Three."'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - (Two?)
  - "  Three."`)
  })

  it('split single thought as expected if multiple sets of brackets and quotation marks next to each other and seperated by a splitter. ', () => {
    const thought = '\'One\'. ("Two?")   Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - 'One'.
  - ("Two?")
  - Three.`)
  })

  it('split single thought in a way that the empty space between the splitter and the " should be kept', () => {
    const thought = 'One. "Two.  "Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - "Two.  "
  - Three.`)
  })

  it('split single thought in a way the empty space in the front end should be removed', () => {
    const thought = '   (One.) Two. Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - (One.)
  - Two.
  - Three.`)
  })
})

describe('abbreviations', () => {

  it('thought should not be split if the dot comes from an abbreviation', () => {
    const thought = 'Mr. Smith went out'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Mr. Smith went out`)
  })

  it('thought should not be split when the dot comes from an abbreviation with double dots', () => {
    const thought = 'He will receive his B.S. degree this year.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - He will receive his B.S. degree this year.`)
  })

  it('thought should not be split when the splitter comes from a splitter in the mid-position of an abbreviation', () => {
    const thought = 'TL;DR'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - TL;DR`)
  })

  it('thought should not be split when multiple abbreviations exsit', () => {
    const thought = 'Mr. Smith will receive B.S. degree soon.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Mr. Smith will receive B.S. degree soon.`)
  })

  it('split thought as expected when multiple abbreviations exsit in the thought', () => {
    const thought = 'B.A. or B.S.; meet Dr. Chin.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - B.A. or B.S.;
  - meet Dr. Chin.`)
  })

  it('split thought as expected when empty spaces present between the abbreviation and the splitter', () => {
    const thought = 'go to Washington D.C. ; meet Dr. Chin.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - go to Washington D.C. ;
  - meet Dr. Chin.`)
  })

  it('split thought as expected when multiple abbreviations exsit in the thought, and it ends with an abbreviation with no splitter behind but empty space', () => {
    const thought = 'meet Dr. Chin. go to Washington D.C. '
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - meet Dr. Chin.
  - go to Washington D.C.`)
  })

  it('aplit thought as expected if the dot comes from an abbreviation followed by a brackct', () => {
    const thought = 'One. Two ( U.N.)'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two ( U.N.)`)
  })

  it('aplit thought as expected if the dot comes from an abbreviation followed by empty spaces and a quotation mark', () => {
    const thought = 'One. Two "U.N. "'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two "U.N. "`)
  })

  it('split thought as expected if the dot comes from an abbreviation, before the abbreviation it has an quotation mark with empty spaces', () => {
    const thought = 'One. Two " U.N."'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two " U.N."`)
  })

  it('split thought as expected if the dot comes from an abbreviation, ends with a quotation mark and a bracket', () => {
    const thought = 'One. Two ("U.N.") Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two ("U.N.") Three.`)
  })

  it('split thought as expected if the dot comes from an abbreviation, ends with a splitter, a quotation mark and a bracket', () => {
    const thought = 'One. Two ("U.N.?") Three.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two ("U.N.?")
  - Three.`)
  })
})

describe('decimal numbers', () => {

  it('thought should not be split if the dot comes from a decimal number', () => {
    const thought = 'paid bill $30.25.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - paid bill $30.25.`)
  })

  it('thought should not be split if the dots come from multiple decimal numbers in one sentence', () => {
    const thought = 'Fruit cost: apple $10.23 and pear $10.70'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Fruit cost: apple $10.23 and pear $10.70`)
  })

  it('split single thought as expected when the dots come from multiple decimal numbers in the sentences next to each other', () => {
    const thought = 'Fruit cost: apple $10.23, pear $10.70; Meat cost: beef $20.50, salmon $12.85, chicken $10.00'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Fruit cost: apple $10.23, pear $10.70;
  - Meat cost: beef $20.50, salmon $12.85, chicken $10.00`)
  })

  it('split single thought as expected when the dot comes from the end of an integer', () => {
    const thought = 'Apple: $10. Pear: $15.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Apple: $10.
  - Pear: $15.`)
  })

  it('split single thought as expected if the dot comes from a decimal number followed by a splitter and a brackct', () => {
    const thought = 'One. ( $12.30, $3.50?) Two.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - ( $12.30, $3.50?)
  - Two.`)
  })

  it('split single thought as expected if a decimal number followed by a splitter and a brackct that nexts to another quotation mark', () => {
    const thought = '($3.50?)"One."'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ($3.50?)
  - "One."`)
  })

  it('split single thought as expected if the dot comes from a decimal number ends with a splitter and an empty space, followed by a quotation mark and a closed bracket', () => {
    const thought = 'One. (" $2.3, 3.5M! ") Two.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - (" $2.3, 3.5M! ")
  - Two.`)
  })

  it('split single thought if two interger numbers are seperated by a splitter that is not a dot', () => {
    const thought = '2!3'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - 2!
  - 3`)
  })
})

describe('email address', () => {
  it('thought should not be split if the dot comes from an email address', () => {
    const thought = 'abc@email.com'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@email.com`)
  })

  it('thought should not be split if the dot comes from a dot of an email address before @', () => {
    const thought = 'abc.edf@email.com'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc.edf@email.com`)
  })

  it('thought should not be split if the dot is an email address with a sub website domain.', () => {
    const thought = 'abc@edf.email.com'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@edf.email.com`)
  })

  it('thought should not be split if the dot comes from an email and the address ends with a brackct', () => {
    const thought = '( abc@xyz.com)'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ( abc@xyz.com)`)
  })

  it('split single thought as expected if the dot comes from an email and the address ends with a brackct and a quotation mark', () => {
    const thought = '"( abc@xyz.com!)" One. Two.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - "( abc@xyz.com!)"
  - One.
  - Two.`)
  })

  it('split single thought as expected if the dot comes from an email address and the address has a symbol that does not belongs to the email address', () => {
    const thought = 'abc@xyz.com, One; Two.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@xyz.com, One;
  - Two.`)
  })

  it('split single thought as expected if it has more than one email address in the sentence before the real splitter ', () => {
    const thought = 'abc@email.com def@email.com; One.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@email.com def@email.com;
  - One.`)
  })

  it('split single thought as expected if it has more than one email address in the sentence after the real splitter ', () => {
    const thought = 'One. abc@email.com def@email.com;'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - abc@email.com def@email.com;`)
  })

  it('split single thought as expected if there is empty spaces between the email address and the real splitter', () => {
    const thought = 'abc@email.com def@email.com ; One.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@email.com def@email.com ;
  - One.`)
  })
})

describe('url address', () => {

  it('thought should not be split if the dot is a url address with www', () => {
    const thought = 'www.xyz.com'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyz.com`)
  })

  it('thought should not be split if the dot is a url address with http://', () => {
    const thought = 'http://www.xyz.com'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - http://www.xyz.com`)
  })

  it('thought should not be split if the dot is a url address that has sub domain', () => {
    const thought = 'www.xyx.abc.com'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyx.abc.com`)
  })

  it('thought should not be split if the dot comes from an url page, ', () => {
    const thought = 'https://abc.com/xyz'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - https://abc.com/xyz`)
  })

  it('thought should not be split if the dot comes from an url address with query, ', () => {
    const thought = 'https://abc.com/search?id=123'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - https://abc.com/search?id=123`)
  })

  it('split single thought as expected if there is empty spaces between the url address and the real splitter', () => {
    const thought = 'abc.com ; One.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc.com ;
  - One.`)
  })

  it('split single thought as expected if the dot comes from an url and the url address starts with a quatition mark ', () => {
    const thought = '"http://www.xyz.com "'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - "http://www.xyz.com "`)
  })

  it('split single thought as expected if the dot comes from an url and the url address ends with a quatition mark and a bracket', () => {
    const thought = '("http://www.xyz.com!") One.'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ("http://www.xyz.com!")
  - One.`)
  })

  it('split single thought as the rule below: if the dot is a url address without http, https and www, then the letters of the top-level domain must be two or more small characters', () => {
    const thought = 'xyz.info abc.Edf One.Two. abc.e'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - xyz.info abc.Edf One.Two.
  - abc.e`)
  })

  it('split single thought as expected if it has more than one url address before the real splitter', () => {
    const thought = 'http://www.abc.com, www.def.com! www.def.com/xyz'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - http://www.abc.com, www.def.com!
  - www.def.com/xyz`)
  })

  it('split single thought as expected if there are two or more urls present after the real splitter', () => {
    const thought = 'http://www.abc.com; www.def.com, www.def.com/xyz'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - http://www.abc.com;
  - www.def.com, www.def.com/xyz`)
  })
})

describe('complicated cases', () => {

  it('split single thought by commas if there are multiple cases in one sentence, but they are seperated by commas', () => {
    const thought = 'www.xyz.com,  abc@email.com, $3.4'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyz.com
  - abc@email.com
  - $3.4`)
  })

  it('split single thought as expected if a url address and an email address surrounded by quotation marks are seperated by a splitter', () => {
    const thought = 'www.xyz.com!"abc@email.com"'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyz.com!
  - "abc@email.com"`)
  })

  it('split single thought as expected if a url address and an email address surrounded by quotation marks in one sentence are seperated by empty spaces and a splitter', () => {
    const thought = 'www.xyz.com ..."abc@email.com"'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyz.com ...
  - "abc@email.com"`)
  })

  it('split single thought as expected if there are two or more special cases in one sentence before the splitter, ', () => {
    const thought = 'abc@xyz.com, www.xyz.com/def! http://www.abc.com $3.20'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@xyz.com, www.xyz.com/def!
  - http://www.abc.com $3.20`)
  })

  it('split single thought as expected with combinations of many more special cases', () => {
    const thought = 'R.N. abc.com ; $3.20, One. http://www.abc.com Two abc@email.com  ;)"Three."'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - R.N. abc.com ;
  - $3.20, One.
  - http://www.abc.com Two abc@email.com  ;)
  - "Three."`)
  })

  it('split single thought as expected if it has other special cases', () => {
    const thought = 'react.js; file: abc.txt, def.doc"One.Two.Three". IPv4: 11.11.11.111'
    const exported = splitThought(thought)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - react.js;
  - file: abc.txt, def.doc"One.Two.Three".
  - IPv4: 11.11.11.111`)
  })
})

/**
 * Function: splitThought.
 *
 * @param thought The thought that needs to be split.
 * @returns The thought string after spliting.
 */
function splitThought (thought : string) {
  const steps = [
    newThought(thought),
    splitSentences()
  ]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  return exported
}
