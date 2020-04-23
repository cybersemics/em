# Contributing Guidelines

## Functional Programming

Adhere to the functional programming style, namely no mutations. The linter will mostly enforce this.

- No `let`; use `const`
- No `for` loops; use `map`, `filter`, `reduce`

See existing code if you are unfamiliar with this approach. Support will be offered to those new to this style, but a willingness and effort is required. Do not claim an issue or submit a Pull Request if you are unable or unwilling to adhere to this requirement.

## Code Quality

Here are some code quality requirements:

- Do not use overly vague variable names or extraneous affixes such as "data"
- Avoid redundancy
- Write a JSDOC comment for each function definition
- Add a descriptive comment to any code that is counterintuitive, non-obvious, non-trivial, or requires additional explanation

All of these requirements entail judgment calls. There is no clear cut rule of what is right and wrong. Good judgment is contextual and based on experience. Preserving code quality is just as much a part of the task as completing requested changes. Please count on critical discussion during code reviews. The stances of "it works" or "it's good enough" or "that's beyond what I was asked to do" will generally not be considered valid objections to these requirements.

## Editor Config

The project uses 2 spaces for tabs. Please make sure your editor settings match. If you have the [editorconfig](https://editorconfig.org/) extension in your editor, it will automatically [use these settings](https://github.com/cybersemics/em/blob/dev/.editorconfig).

## Contributions

All contributions must be submitted through public pull requests on the repo at https://github.com/cybersemics/em. This is typically done by forking the repo, creating a new branch, making your changes, pushing your branch to your fork, and then opening a Pull Request against `dev` from the GitHub interface. All pull requests will be reviewed and feedback will be provided.

- Enter a descriptive title for all PR's. 
- Add the issue number to the description (not the title). 
- Commit messages should be a succinct and provide a relevant summary of the contained changes.
- Each commit should correspond to a single, unified set of changes for a single purpose.
- Resolve, respond, and/or inquire about all requested changes before requesting another review.

## Regressions

Pull Requests that solve the given issue but introduce a regression (that is, break or remove functionality) are not considered solutions and will not be accepted. Preserving existing functionality is an implicit requirement. If a regression is discovered after a Pull Request has been merged, you may be asked to go back and fix the regression.

Here is an example of a Pull Request where the contributor believed they had completed the task, despite having introduced a bug that was not there before: https://github.com/cybersemics/em/pull/154.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](https://github.com/cybersemics/em/blob/dev/CODE-OF-CONDUCT.md). By participating in this project you agree to abide by its terms.
