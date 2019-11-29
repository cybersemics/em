# Contributing Guidelines

## Functional Programming

Adhere to the functional programming style, namely no mutations. The linter will mostly enforce this.

- No `let`; use `const`
- No `for` loops; use `map`, `filter`, `reduce`

See existing code if you are unfamiliar with this approach. Support will be offered to those new to this style, but a willingness and effort is required. Do not claim an issue or submit a Pull Request if you are unable or unwilling to adhere to this requirement.

## Code Quality

Here are some code quality requirements:

- Variables should be named appropriately
- Redundancy should be avoided
- Single-use variables should be avoided
- Functions should have have a well-defined purpose
- Architectural patterns should be intuitive
- Comments should be added to anything that requires additional explanation

All of these requirements entail judgment calls. There is no clear cut rule of what is right and wrong. Good judgment is contextual and based on experience. Preserving code quality is just as much a part of the task as completing requested changes. Please count on critical discussion during code reviews. The stances of "it works" or "it's good enough" or "that's beyond what I was asked to do" will generally not be considered valid objections to these requirements.

## Regressions

Pull Requests that solve the given issue but introduce a regression (that is, break something else in the process) are not considered solutions and will not be accepted. Here is an example of a Pull Request where the contributor believed they had completed the task, despite having introduced a bug that was not there before: https://github.com/cybersemics/em/pull/154. Preserving existing functionality is just as much a part of the task as completing requested changes.

If a regression is discovered after a Pull Request has been merged, you may still have to go back and fix the regression.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](https://github.com/cybersemics/em/blob/dev/CODE-OF-CONDUCT.md). By participating in this project you agree to abide by its terms.
