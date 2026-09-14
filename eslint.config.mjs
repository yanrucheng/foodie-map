import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "docs/external/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "tests/unit/**/*.{ts,tsx}", "tests/setup.ts"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // This project uses Hooks, without a React Compiler build step.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["*.{mjs,cjs}", "*.config.ts", "scripts/**/*.{mjs,ts}"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["tests/e2e/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["eval/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["public/sw.js", "tests/e2e/fixtures/legacy-sw.js"],
    languageOptions: { globals: globals.serviceworker },
  },
);
