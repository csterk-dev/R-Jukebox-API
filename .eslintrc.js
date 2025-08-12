module.exports = {
  env: {
    es6: true
  },

  parserOptions: {
    sourceType: "module"
  },

  plugins: [
    "eslint-comments",
    "jest",
    "@typescript-eslint"
  ],

  settings: {
    react: {
      version: "detect"
    }
  },

  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint/eslint-plugin"],
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_+",
            vars: "local"
          }
        ],
        "no-unused-vars": "off",
        "no-shadow": "off",
        "@typescript-eslint/no-shadow": 2,
        "no-undef": "off",
        "func-call-spacing": "off",
        "@typescript-eslint/func-call-spacing": 1
      }
    },
    {
      files: [
        "*.{spec,test}.{js,ts}",
        "**/__{mocks,tests}__/**/*.{js,ts}"
      ],
      env: {
        jest: true,
        "jest/globals": true
      },
      rules: {
        quotes: [
          1, "single", {
            avoidEscape: true,
            allowTemplateLiterals: true
          }
        ]
      }
    }
  ],

  globals: {
    __DEV__: true,
    __dirname: false,
    __fbBatchedBridgeConfig: false,
    AbortController: false,
    Blob: true,
    alert: false,
    cancelAnimationFrame: false,
    cancelIdleCallback: false,
    clearImmediate: true,
    clearInterval: false,
    clearTimeout: false,
    console: false,
    document: false,
    ErrorUtils: false,
    escape: false,
    Event: false,
    EventTarget: false,
    exports: false,
    fetch: false,
    File: true,
    FileReader: false,
    FormData: false,
    global: false,
    Headers: false,
    Intl: false,
    Map: true,
    module: false,
    navigator: false,
    process: false,
    Promise: true,
    requestAnimationFrame: true,
    requestIdleCallback: true,
    require: false,
    Set: true,
    setImmediate: true,
    setInterval: false,
    setTimeout: false,
    queueMicrotask: true,
    URL: false,
    URLSearchParams: false,
    WebSocket: true,
    window: false,
    XMLHttpRequest: false
  },

  rules: {
    "array-bracket-newline": "error",
    "arrow-spacing": "warn",
    "block-spacing": "warn",
    "brace-style": "warn",
    "comma-dangle": ["error", "never"],
    "comma-spacing": "warn",
    "comma-style": "warn",
    "computed-property-spacing": "warn",
    "dot-location": ["warn", "property"],
    curly: "off",
    "eol-last": "off",
    "function-call-argument-newline": ["warn", "consistent"],
    "function-paren-newline": ["warn", "consistent"],
    "func-call-spacing": "warn",
    "func-name-matching": "error",
    indent: ["error", 2, { SwitchCase: 1 }],
    "jsx-quotes": ["error", "prefer-double"],
    "lines-around-comment": "off",
    "multiline-comment-style": ["off"],
    "newline-per-chained-call": ["error", { ignoreChainWithDepth: 3 }],
    "no-async-promise-executor": "warn",
    "no-await-in-loop": "warn",
    "no-case-declarations": "error",
    "no-constant-binary-expression": "error",
    "no-dupe-args": "error",
    "no-dupe-else-if": "warn",
    "no-duplicate-case": "error",
    "no-duplicate-imports": "error",
    "no-else-return": "warn",
    "no-empty": "error",
    "no-extra-semi": "warn",
    "no-fallthrough": "off",
    "no-inline-comments": "warn",
    "no-labels": "error",
    "no-lonely-if": "warn",
    "no-multi-spaces": "warn",
    "no-multiple-empty-lines": ["warn", { max: 3 }],
    "no-param-reassign": "error",
    "no-redeclare": "error",
    "no-shadow": "error",
    "no-trailing-spaces": "off",
    "no-unsafe-finally": "error",
    "no-unsafe-optional-chaining": "error",
    "no-useless-catch": "error",
    "no-useless-return": "error",
    "no-var": "error",
    "no-whitespace-before-property": "warn",
    "object-curly-newline": [
      "error",
      {
        ObjectExpression: {
          consistent: true,
          minProperties: 2,
          multiline: true
        },
        ObjectPattern: { consistent: true },
        ImportDeclaration: "never",
        ExportDeclaration: { multiline: true }
      }
    ],
    "object-curly-spacing": ["error", "always"],
    "object-property-newline": "warn",
    "object-shorthand": "error",
    "operator-linebreak": [
      "warn",
      "none",
      {
        overrides: {
          "?": "after",
          ":": "after",
          "||": "before",
          "&&": "before",
          "??": "before",
          "+": "before",
          "=": "after"
        }
      }
    ],
    "padded-blocks": "off",
    "prefer-const": "warn",
    "prefer-template": "warn",
    quotes: ["error", "double"],
    "quote-props": ["warn", "as-needed"],
    "require-atomic-updates": "off",
    "require-await": "warn",
    "sort-imports": [
      "warn",
      {
        ignoreCase: true,
        ignoreDeclarationSort: true
      }
    ],
    "space-before-blocks": "warn",
    "space-before-function-paren": [
      "warn",
      {
        anonymous: "never",
        asyncArrow: "always",
        named: "never"
      }
    ],
    "use-isnan": "error",
    "valid-typeof": "error",
    "wrap-iife": ["warn", "inside"],

    /*
     * Jest Plugin
     * The following rules are made available via `eslint-plugin-jest`.
     */
    "jest/no-disabled-tests": 1,
    "jest/no-focused-tests": 1,
    "jest/no-identical-title": 1,
    "jest/valid-expect": 1
  }
};