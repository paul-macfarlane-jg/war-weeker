import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  {
    // Native pickers ignore the Appearance Theme and differ per browser, so
    // forms use the shadcn controls and the wrappers built on them.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='select']",
          message:
            "Use Select from @/components/ui/select (or OptionSelect / EntityCombobox) instead of a native <select>.",
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:has(JSXAttribute[name.name='type'][value.value='date'])",
          message:
            'Use DatePicker or DateRangePicker instead of <input type="date">.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:has(JSXAttribute[name.name='type'][value.value='time'])",
          message: 'Use TimeCombobox instead of <input type="time">.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:has(JSXAttribute[name.name='type'][value.value='color'])",
          message: 'Use ColorField instead of <input type="color">.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:has(JSXAttribute[name.name='type'][value.value='checkbox'])",
          message:
            'Use Switch from @/components/ui/switch instead of <input type="checkbox">.',
        },
      ],
    },
  },
  {
    // The shadcn primitives are where native controls may still live.
    files: ["src/components/ui/**"],
    rules: { "no-restricted-syntax": "off" },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Drizzle migrations
    "drizzle/**",
  ]),
]);

export default eslintConfig;
