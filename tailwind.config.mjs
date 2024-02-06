import tailwindTypography from "@tailwindcss/typography";
import colors from "tailwindcss/colors";
import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit Variable", "Outfit", ...defaultTheme.fontFamily.sans],
      },
      typography: {
        DEFAULT: {
          css: {
            // Remove "`" before and after inline code elements
            "code::before": {
              content: "none",
            },
            "code::after": {
              content: "none",
            },
            // Remove automatic quotation marks at the start and end of blockquotes
            "blockquote p::before": {
              content: "none",
            },
            "blockquote p::after": {
              content: "none",
            },
            // Revert Tailwind Typography's default bold font weight in blockquotes
            "blockquote p": {
              fontWeight: "400",
            },
          },
        },
      },
      colors: {
        primary: colors.blue,
      },
    },
  },
  plugins: [tailwindTypography],
};
