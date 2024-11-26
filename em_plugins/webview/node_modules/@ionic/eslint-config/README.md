# @ionic/eslint-config

Shared ESLint config used in Ionic and Capacitor projects.

This is meant to be used alongside Prettier (with [`@ionic/prettier-config`](https://github.com/ionic-team/prettier-config/)).

## Usage

1. Remove existing `.eslintrc.*` file, if present.
1. Install `eslint` and the config.

    ```
    npm install -D eslint @ionic/eslint-config
    ```

1. Add the following to `package.json`:

    ```
    "eslintConfig": {
      "extends": "@ionic/eslint-config/recommended"
    }
    ```

:memo: You can also use the base rule set: `@ionic/eslint-config`

### With Prettier and `@ionic/prettier-config`

1. Set up Prettier and [`@ionic/prettier-config`](https://github.com/ionic-team/prettier-config/).
1. When using with Prettier and `@ionic/prettier-config`, ESLint should run first. Set up your scripts in `package.json` like this:

    ```json
      "scripts": {
        "lint": "npm run eslint && npm run prettier -- --check",
        "fmt": "npm run eslint -- --fix && npm run prettier -- --write",
        "prettier": "prettier \"**/*.ts\"",
        "eslint": "eslint . --ext .ts",
      }
    ```

    - `npm run lint`: for checking if ESLint and Prettier complain
    - `npm run fmt`: attempt to autofix lint issues and autoformat code

    :memo: Not every rule in this configuration is autofixable, so `npm run fmt` may continue failing until lint issues are addressed manually.

### With Husky

1. Install [husky](https://github.com/typicode/husky):

    ```
    npm install -D husky
    ```

1. Add the following to `package.json`:

    ```
      "husky": {
        "hooks": {
          "pre-commit": "npm run lint"
        }
      },
    ```
