// eslint.config.js (Node 22, ESM, TypeScript)
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";

export default [
  {
    files: ["**/*.{ts,js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsparser,
      globals: {
        ...globals.node, // для Node
        // ...globals.browser, // если нужен и браузер
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
      prettier: prettierPlugin,
      sonarjs,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // базовые + TS
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,

      // sonarjs (эквивалент plugin:sonarjs/recommended)
      ...sonarjs.configs.recommended.rules,

      // import/prettier/sort
      "prettier/prettier": "error",
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "import/no-unresolved": "off", // если TS резолвит модули сам
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports" },
      ],
    },
    ignores: ["dist", "node_modules"],
  },
];
