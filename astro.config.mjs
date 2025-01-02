import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import vercel from "@astrojs/vercel";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import { copyFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import rehypePrettyCode from "rehype-pretty-code";

// https://astro.build/config
export default defineConfig({
  site: "https://www.bswanson.dev",
  integrations: [
    mdx(),
    sitemap(),
    tailwind({ applyBaseStyles: false }),
    icon(),
    process.env.VERCEL
      ? {
          // https://github.com/withastro/adapters/issues/445
          name: "copy-sitemap-to-vercel-output-dir",
          hooks: {
            "astro:build:done": async ({ dir }) => {
              const distDir = fileURLToPath(dir);
              const staticDir = resolve(".vercel/output/static");
              const files = await readdir(distDir);
              for (const sitemap of files.filter((it) =>
                it.includes("sitemap")
              )) {
                copyFile(join(distDir, sitemap), join(staticDir, sitemap));
              }
            },
          },
        }
      : undefined,
  ],
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
});
