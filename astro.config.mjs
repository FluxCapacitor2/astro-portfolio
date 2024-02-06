import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import rehypePrettyCode from "rehype-pretty-code";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  site: "https://bswanson.dev",
  integrations: [mdx(), sitemap(), tailwind(), icon()],
  markdown: {
    syntaxHighlight: false, // Handle syntax highlighting using rehype-pretty-code instead of the built-in solution
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          theme: {
            dark: "github-dark-dimmed",
            light: "github-light",
          },
        },
      ],
    ],
  },
});
