const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        AbortController: "readonly",
        clearTimeout: "readonly",
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        global: "readonly",
        location: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
        setTimeout: "readonly",
        __dirname: "readonly",
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        after: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
