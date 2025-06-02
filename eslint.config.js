import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  // Apply to all JS/TS files
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: { 
      globals: globals.browser 
    }
  },
  // Include recommended JS rules
  pluginJs.configs.recommended,
  // Include recommended TS rules
  ...tseslint.configs.recommended,
];