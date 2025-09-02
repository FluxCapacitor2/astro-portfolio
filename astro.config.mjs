import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import rehypePrettyCode from "rehype-pretty-code";

// https://astro.build/config
export default defineConfig({
  site: "https://www.bswanson.dev",
  integrations: [mdx(), sitemap(), icon()],
  adapter: process.env.VERCEL ? vercel() : undefined,
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
  redirects: {
    // Blog posts and other pages from my old site
    "/blog/creating-beautiful-skeleton-loaders-with-react-and-tailwindcss":
      "/blog/beautiful-skeleton-loading-states",
    "/blog/running-lighthouse-ci-on-all-modified-next-js-pages-using-github-actions":
      "/blog/run-lighthouse-ci-on-changed-pages",
    "/blog/cyberdiscord-open-2023-review-writeup":
      "/blog/2023-cyberdiscord-open",
    "/portfolio": "/projects",
    "/portfolio/media/bluedragon": "/projects/bluedragon",
    "/favicon.svg": "/icon.svg",
  },
  image: {
    experimentalLayout: "none",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
