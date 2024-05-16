import newThought from '../../actions/newThought'
import splitSentences from '../../actions/splitSentences'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import setCursor from '../../test-helpers/setCursorFirstMatch'
import initialState from '../../util/initialState'
import reducerFlow from '../../util/reducerFlow'

describe('split by comma', () => {
  it('split single thought on comma when there are no periods', () => {
    const value = 'One, Two, Three'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three`)
  })

  it("split single thought on comma if a thought with a mix of commas and periods has only one period and it's the last character", () => {
    const value = 'One, Two, Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three.`)
  })

  it('split single thought on comma and remove the empty thought when there are empty space after the period', () => {
    const value = 'One, Two, Three.  '
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three.`)
  })

  it('split single thought on comma and remove the empty space when there are no periods but empty space in the end', () => {
    const value = 'One, Two, Three  '
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One
  - Two
  - Three`)
  })

  it('split single thought on commas when there is a combination of periods and commas, but no empty space followed by the periods.', () => {
    const value = 'One.Two, Three'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.Two
  - Three`)
  })
})

describe('simple split', () => {
  it('split empty thought without the site crash', () => {
    const value = ''
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - `)
  })

  it('split single thought by sentences', () => {
    const value = 'One. Two. Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two.
  - Three.`)
  })

  it('split single thought on period when there is a combination of periods and commas.', () => {
    const value = 'One. Two, Three'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two, Three`)
  })

  it('split single thought on main split characters if thought has only one period at the end but has other split characters too, even there is no empty space followed by that splitter', () => {
    const value = 'One,Seven?Two!Three.'
    const exported = splitThought(value)

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
      setCursor(['One. Two. Three.']),
      splitSentences(),
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
    const value = 'One... Two?! Three. '
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One...
  - Two?!
  - Three.`)
  })

  it('split single thought by splitters and remove the empty thought when the thought ends with empty spaces after the splitter. ', () => {
    const value = 'One. Two.  '
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two.`)
  })
})

// When it ends with .", .), !), ?"), ;), etc.
describe('brackets or quotations', () => {
  it('split single thought on the way that the closed bracket goes with the previous sentence if a splitter is immediately followed by a closed bracket', () => {
    const value = 'One. (Two.)Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - (Two.)
  - Three.`)
  })

  it('split the single thought on the way that the left quotation marks should go with the sentence that is on the right of the splitter, while the right quotation marks should go with the sentence which is on the left of the splitter', () => {
    const value = 'One." Two."Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - " Two."
  - Three.`)
  })

  it('split the single thought as expected if multiple sets of brackets and quotation marks present in one sentence. ', () => {
    const value = 'One.(Two) "Three."   Four.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.(Two) "Three."
  - Four.`)
  })

  it('split single thought as expected if closed brackets and quotation marks present in one sentence. ', () => {
    const value = 'One. ("Two?") "(Three.Four?)"  Five.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - ("Two?")
  - "(Three.Four?)"
  - Five.`)
  })

  it('split single thoughts expected if a closed bracket present before a left quotation mark. ', () => {
    const value = 'One. (Two?)"  Three."'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - (Two?)
  - "  Three."`)
  })

  it('split single thought as expected if multiple sets of brackets and quotation marks next to each other and separated by a splitter. ', () => {
    const value = '\'One\'. ("Two?")   Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - 'One'.
  - ("Two?")
  - Three.`)
  })

  it('split single thought in a way that the empty space between the splitter and the " should be kept', () => {
    const value = 'One. "Two.  "Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - "Two.  "
  - Three.`)
  })

  it('split single thought in a way the empty space in the front end should be removed', () => {
    const value = '   (One.) Two. Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - (One.)
  - Two.
  - Three.`)
  })
})

describe('abbreviations', () => {
  it('thought should not be split if the dot comes from an abbreviation', () => {
    const value = 'Mr. Smith went out'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Mr. Smith went out`)
  })

  it('thought should not be split when the dot comes from an abbreviation with double dots', () => {
    const value = 'He will receive his B.S. degree this year.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - He will receive his B.S. degree this year.`)
  })

  it('thought should not be split when the splitter comes from a splitter in the mid-position of an abbreviation', () => {
    const value = 'TL;DR'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - TL;DR`)
  })

  it('thought should not be split when multiple abbreviations exist', () => {
    const value = 'Mr. Smith will receive B.S. degree soon.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Mr. Smith will receive B.S. degree soon.`)
  })

  it('split thought as expected when multiple abbreviations exist in the thought', () => {
    const value = 'B.A. or B.S.; meet Dr. Chin.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - B.A. or B.S.;
  - meet Dr. Chin.`)
  })

  it('split thought as expected when empty spaces present between the abbreviation and the splitter', () => {
    const value = 'go to Washington D.C. ; meet Dr. Chin.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - go to Washington D.C. ;
  - meet Dr. Chin.`)
  })

  it('split thought as expected when multiple abbreviations exist in the thought, and it ends with an abbreviation with no splitter behind but empty space', () => {
    const value = 'meet Dr. Chin. go to Washington D.C. '
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - meet Dr. Chin.
  - go to Washington D.C.`)
  })

  it('split thought as expected if the dot comes from an abbreviation followed by a bracket', () => {
    const value = 'One. Two ( U.N.)'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two ( U.N.)`)
  })

  it('split thought as expected if the dot comes from an abbreviation followed by empty spaces and a quotation mark', () => {
    const value = 'One. Two "U.N. "'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two "U.N. "`)
  })

  it('split thought as expected if the dot comes from an abbreviation, before the abbreviation it has an quotation mark with empty spaces', () => {
    const value = 'One. Two " U.N."'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two " U.N."`)
  })

  it('split thought as expected if the dot comes from an abbreviation, ends with a quotation mark and a bracket', () => {
    const value = 'One. Two ("U.N.") Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two ("U.N.") Three.`)
  })

  it('split thought as expected if the dot comes from an abbreviation, ends with a splitter, a quotation mark and a bracket', () => {
    const value = 'One. Two ("U.N.?") Three.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - Two ("U.N.?")
  - Three.`)
  })
})

describe('decimal numbers', () => {
  it('thought should not be split if the dot comes from a decimal number', () => {
    const value = 'paid bill $30.25.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - paid bill $30.25.`)
  })

  it('thought should not be split if the dots come from multiple decimal numbers in one sentence', () => {
    const value = 'Fruit cost: apple $10.23 and pear $10.70'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Fruit cost: apple $10.23 and pear $10.70`)
  })

  it('split single thought as expected when the dots come from multiple decimal numbers in the sentences next to each other', () => {
    const value = 'Fruit cost: apple $10.23, pear $10.70; Meat cost: beef $20.50, salmon $12.85, chicken $10.00'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Fruit cost: apple $10.23, pear $10.70;
  - Meat cost: beef $20.50, salmon $12.85, chicken $10.00`)
  })

  it('split single thought as expected when the dot comes from the end of an integer', () => {
    const value = 'Apple: $10. Pear: $15.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - Apple: $10.
  - Pear: $15.`)
  })

  it('split single thought as expected if the dot comes from a decimal number followed by a splitter and a bracket', () => {
    const value = 'One. ( $12.30, $3.50?) Two.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - ( $12.30, $3.50?)
  - Two.`)
  })

  it('split single thought as expected if a decimal number followed by a splitter and a bracket that next to another quotation mark', () => {
    const value = '($3.50?)"One."'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ($3.50?)
  - "One."`)
  })

  it('split single thought as expected if the dot comes from a decimal number ends with a splitter and an empty space, followed by a quotation mark and a closed bracket', () => {
    const value = 'One. (" $2.3, 3.5M! ") Two.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - (" $2.3, 3.5M! ")
  - Two.`)
  })

  it('split single thought if two integer numbers are separated by a splitter that is not a dot', () => {
    const value = '2!3'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - 2!
  - 3`)
  })
})

describe('email address', () => {
  it('thought should not be split if the dot comes from an email address', () => {
    const value = 'abc@email.com'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@email.com`)
  })

  it('thought should not be split if the dot comes from a dot of an email address before @', () => {
    const value = 'abc.edf@email.com'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc.edf@email.com`)
  })

  it('thought should not be split if the dot is an email address with a sub website domain.', () => {
    const value = 'abc@edf.email.com'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@edf.email.com`)
  })

  it('thought should not be split if the dot comes from an email and the address ends with a bracket', () => {
    const value = '( abc@xyz.com)'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ( abc@xyz.com)`)
  })

  it('split single thought as expected if the dot comes from an email and the address ends with a bracket and a quotation mark', () => {
    const value = '"( abc@xyz.com!)" One. Two.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - "( abc@xyz.com!)"
  - One.
  - Two.`)
  })

  it('split single thought as expected if the dot comes from an email address and the address has a symbol that does not belongs to the email address', () => {
    const value = 'abc@xyz.com, One; Two.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@xyz.com, One;
  - Two.`)
  })

  it('split single thought as expected if it has more than one email address in the sentence before the real splitter ', () => {
    const value = 'abc@email.com def@email.com; One.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@email.com def@email.com;
  - One.`)
  })

  it('split single thought as expected if it has more than one email address in the sentence after the real splitter ', () => {
    const value = 'One. abc@email.com def@email.com;'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - One.
  - abc@email.com def@email.com;`)
  })

  it('split single thought as expected if there is empty spaces between the email address and the real splitter', () => {
    const value = 'abc@email.com def@email.com ; One.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@email.com def@email.com ;
  - One.`)
  })
})

describe('url address', () => {
  it('thought should not be split if the dot is a url address with www', () => {
    const value = 'www.xyz.com'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyz.com`)
  })

  it('thought should not be split if the dot is a url address with http://', () => {
    const value = 'http://www.xyz.com'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - http://www.xyz.com`)
  })

  it('thought should not be split if the dot is a url address that has sub domain', () => {
    const value = 'www.xyx.abc.com'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyx.abc.com`)
  })

  it('thought should not be split if the dot comes from an url page, ', () => {
    const value = 'https://abc.com/xyz'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - https://abc.com/xyz`)
  })

  it('thought should not be split if the dot comes from an url address with query, ', () => {
    const value = 'https://abc.com/search?id=123'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - https://abc.com/search?id=123`)
  })

  it('split single thought as expected if there is empty spaces between the url address and the real splitter', () => {
    const value = 'abc.com ; One.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc.com ;
  - One.`)
  })

  it('split single thought as expected if the dot comes from an url and the url address starts with a quotation mark ', () => {
    const value = '"http://www.xyz.com "'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - "http://www.xyz.com "`)
  })

  it('split single thought as expected if the dot comes from an url and the url address ends with a quotation mark and a bracket', () => {
    const value = '("http://www.xyz.com!") One.'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - ("http://www.xyz.com!")
  - One.`)
  })

  it('split single thought as the rule below: if the dot is a url address without http, https and www, then the letters of the top-level domain must be two or more small characters', () => {
    const value = 'xyz.info abc.Edf One.Two. abc.e'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - xyz.info abc.Edf One.Two.
  - abc.e`)
  })

  it('split single thought as expected if it has more than one url address before the real splitter', () => {
    const value = 'http://www.abc.com, www.def.com! www.def.com/xyz'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - http://www.abc.com, www.def.com!
  - www.def.com/xyz`)
  })

  it('split single thought as expected if there are two or more urls present after the real splitter', () => {
    const value = 'http://www.abc.com; www.def.com, www.def.com/xyz'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - http://www.abc.com;
  - www.def.com, www.def.com/xyz`)
  })
})

describe('complicated cases', () => {
  it('split single thought by commas if there are multiple cases in one sentence, but they are separated by commas', () => {
    const value = 'www.xyz.com,  abc@email.com, $3.4'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyz.com
  - abc@email.com
  - $3.4`)
  })

  it('split single thought as expected if a url address and an email address surrounded by quotation marks are separated by a splitter', () => {
    const value = 'www.xyz.com!"abc@email.com"'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyz.com!
  - "abc@email.com"`)
  })

  it('split single thought as expected if a url address and an email address surrounded by quotation marks in one sentence are separated by empty spaces and a splitter', () => {
    const value = 'www.xyz.com ..."abc@email.com"'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - www.xyz.com ...
  - "abc@email.com"`)
  })

  it('split single thought as expected if there are two or more special cases in one sentence before the splitter, ', () => {
    const value = 'abc@xyz.com, www.xyz.com/def! http://www.abc.com $3.20'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - abc@xyz.com, www.xyz.com/def!
  - http://www.abc.com $3.20`)
  })

  it('split single thought as expected with combinations of many more special cases', () => {
    const value = 'R.N. abc.com ; $3.20, One. http://www.abc.com Two abc@email.com  ;)"Three."'
    const exported = splitThought(value)

    expect(exported).toBe(`- ${HOME_TOKEN}
  - R.N. abc.com ;
  - $3.20, One.
  - http://www.abc.com Two abc@email.com  ;)
  - "Three."`)
  })

  it('split single thought as expected if it has other special cases', () => {
    const value = 'react.js; file: abc.txt, def.doc"One.Two.Three". IPv4: 11.11.11.111'
    const exported = splitThought(value)

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
 * @returns The thought string after being split.
 */
function splitThought(value: string) {
  const steps = [newThought(value), splitSentences()]

  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')
  return exported
}
