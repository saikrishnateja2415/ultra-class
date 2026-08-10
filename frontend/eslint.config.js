import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

import {
  defineConfig,
  globalIgnores,
} from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),

  {
    files: ["**/*.{js,jsx}"],

    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],

    languageOptions: {
      globals: globals.browser,

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      /*
        Ultra Class currently does not use the optional
        React Compiler. These advisory compiler rules
        reject the application's established API-loading
        effects, even though they work correctly.
      */

      "react-hooks/immutability": "off",

      "react-hooks/set-state-in-effect": "off",

      "react-hooks/preserve-manual-memoization":
        "off",
    },
  },
]);