# swiftlint

Tiny [SwiftLint](https://github.com/realm/SwiftLint) wrapper for npm. SwiftLint [must still be installed](https://github.com/realm/SwiftLint#installation) and `swiftlint` must be on your PATH.

Invocations of `node-swiftlint` on Linux/Windows print a warning and pass.

This package supports [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) like Prettier does, instead of just `.swiftlint.yml`.

## Usage

1. Install [SwiftLint](https://github.com/realm/SwiftLint).

    ```
    brew install swiftlint
    ```

1. Install the wrapper in your project:

    ```
    npm install -D swiftlint
    ```

1. Add a script to your project's `package.json`:

    ```
    "scripts": {
      "swiftlint": "node-swiftlint",
      ...
    }
    ```

1. Add SwiftLint configuration.

    This wrapper will use any existing `.swiftlint.yml` files (read [cosmiconfig's README](https://github.com/davidtheclark/cosmiconfig) for more options), but we recommend using [`@ionic/swiftlint-config`](https://github.com/ionic-team/swiftlint-config). See [usage instructions](https://github.com/ionic-team/swiftlint-config#usage).

1. Lint in your project! :tada:

    ```
    npm run swiftlint
    ```
