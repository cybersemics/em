**em** is a process-oriented note-taking app that facilitates sensemaking flow.

> A flow state... is the mental state in which a person performing an activity is fully immersed in a feeling of energized focus, full involvement, and enjoyment in the process of the activity. <sup>[[1]](https://en.wikipedia.org/wiki/Flow_(psychology))</sup>

We can experience flow states with anything when the conditions are right. Athletes, musicians, programmers all experience flow. Why not also with sensemaking in our everyday lives? This includes journaling, note-taking, planning, outlining, analyzing, synthesizing, brainstorming, distilling, summarizing, consolidating... any cognitive-linguistic conceptual activity. Pen and paper have always enabled these activities. Yet digital technology is more than simulated paper. We can leverage virtuality to extend our symbolic processing capacities and enable more powerful and fluid sensemaking experiences. As social systems collapse, environmental threats heighten, and cultural change speeds up, we need good sensemaking and good sensemaking tools more than ever before.

**em** provides a personal thoughtspace coupled with interactive controls that facilitate the emergence of a conceptual flow state. **em** maps shortcuts and mobile gestures to semantic operations (what your mind is doing) rather than mechanical operations (what the computer is doing), creating a tight feedback loop between thinking and writing. 

# Vision

An embodied, cybernetic relationship with technology that extends our collective cognitive, linguistic, symbolic, and conceptual capacities so that we may more deeply, thoughtfully, and wisely make sense of ourselves and the world we live in.

# Ownership

**em** is released as public source under the [Do No Harm License](https://github.com/cybersemics/em/blob/dev/LICENSE.md). 

Development of **em** is funded by the Cybersemics Institute, a U.S.-based 501(c)(3) nonprofit founded by Raine Revere.

# Status

**em** is in alpha status.

# Objectives

**em** development is guided by several major objectives.

## 🔁 Sync & Persist

- 🔌 Sync database
- 📱 Multi-Device Support

## ⚡️ Performance

- Load time
- Render performance 
- Memory usage
- Sync 
   - **em** must be speedy and smooth up to at least 100,000 thoughts. This would allow a reasonably prolific thinker to use the app for 2-3 years. For a lifetime of sensemaking, **em** should support 1,000,000+ thoughts.

## ✅ Code Quality & Testing

- [x] ~Restore unit and jsdom tests~
- [x] Restore Puppeteer tests
- [ ] Fix async generators
- [ ] Vite
- [ ] Restore e2e tests
- [ ] Restore skipped tests
- [x] Node v18
- [x] Node v20
- [x] Restore GitHub Actions
- [ ] Render count tests
- [ ] Upgrade react-dnd
- [ ] Upgrade dependencies
- [ ] Replace mui swipeabledrawer

## 📱 Mobile App

- Capacitor

## 🧠 Fluid Sensemaking

The features and capabilities of a sensemaking tool should be part of an integrated design that affords sensemaking flow. While many more features have been designed, these are the essential features necessary to use **em** as one's daily sensemaking platform.

- 🏙 Context View
  - [x] ~Initial implementation~
  - [x] ~Re-enable with independent editing~
  - [ ] Decouple context chain
  - [ ] Commands work across normal and context views [#320](https://github.com/cybersemics/em/issues/320)
  - [ ] Nested context views
- 🗽 Independent Render [#188](https://github.com/cybersemics/em/issues/188)
    - [x] ~Thoughts are currently rendered in the DOM as nested elements. Since ancestors are containers of descendants, they cannot be removed, even when they are no longer visible, as that would also remove all of their descendants. Instead, thoughts should be rendered as siblings and their x position controlled programmatically. This will not only allow hidden thoughts to not be rendered, but also more complex animations and transitions.~
- 🙂 Onboarding Experience
  - [ ] Test tutorial
  - [ ] Improve help system
- ✏️ Recently Edited
  - [x] ~Initial implementation [#180](https://github.com/cybersemics/em/issues/180)~ 
  - [x] ~Not fully merged [#323](https://github.com/cybersemics/em/issues/323)~ 
  - [ ] v3 [#729](https://github.com/cybersemics/em/issues/729)
  - [ ] Dynamic context [#246](https://github.com/cybersemics/em/issues/246)
- 🔍 Search 
  - [ ] [#317](https://github.com/cybersemics/em/issues/317) 
  - [ ] [#318](https://github.com/cybersemics/em/issues/318) 
  - [ ] [#874](https://github.com/cybersemics/em/issues/874)
- 🗄 Table View
  - [x] ~Initial implementation~
  - [ ] Fix nested table positioning [#467](https://github.com/cybersemics/em/issues/467)
  - [ ] Table descendants are indented too far [#471](https://github.com/cybersemics/em/issues/471)
- 🗑 Undo/Redo
  - [x] ~Initial implementation [#105](https://github.com/cybersemics/em/issues/105)~
  - [ ] Persistence
  - [ ] View History

## 🔑 Security

- Encryption

# Future
- Linking
  - [ ] Inline Links [#869](https://github.com/cybersemics/em/issues/869)
- Collaboration
  - Publish
    - [x] ~Initial implementation~
    - [ ] IPFS Pinning
    - [ ] Self hosting
    - [ ] Mutable
  - Share
    - [ ] Public
    - [ ] Permissioned
  - Collaborative Editing
- Import/Export
  - [x] ~Clipboard~
  - [x] ~HTML~
  - [x] ~JSON [#714](https://github.com/cybersemics/em/issues/714)~
  - [x] ~Roam [#865](https://github.com/cybersemics/em/issues/865)~
  - [x] ~Plaintext~
  - [x] ~WorkFlowy~
  - [ ] Google Docs
  - [ ] Evernote
  - [ ] Notion
  - [ ] Roam
- Integrations
  - [ ] API
- UI
  - [ ] ngrams [#37](https://github.com/cybersemics/em/issues/37)
  - [ ] Autocomplete [#88](https://github.com/cybersemics/em/issues/88)
  - [ ] Split View [#201](https://github.com/cybersemics/em/issues/201)
