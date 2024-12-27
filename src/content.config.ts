import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";
import { technologies } from "./consts";

export const blog = defineCollection({
  loader: glob({ pattern: "[^_]*/*.md", base: "src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      image: image(),
    }),
});

export const projects = defineCollection({
  loader: glob({ pattern: "[^_]*/*.md", base: "src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      sortOrder: z.number(),
      name: z.string(),
      image: image(),
      description: z.string(),
      tags: z.array(
        z.enum(
          Object.keys(technologies) as [
            (keyof typeof technologies)[0],
            ...(keyof typeof technologies)[],
          ]
        )
      ),
      date: z.coerce.date(),
      ongoing: z.boolean().default(false),
      link: z.string().url().optional(),
      source: z.string().url().optional(),
      featured: z.boolean().optional().default(false),
    }),
});

export const collections = { blog, projects };
