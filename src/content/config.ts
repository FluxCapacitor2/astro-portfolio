import { defineCollection, z } from "astro:content";
import { technologies } from "../consts";

const blog = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      image: image(),
    }),
});

const projects = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
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
      link: z.string().url().optional(),
      source: z.string().url().optional(),
      featured: z.boolean().optional().default(false),
    }),
});

export const collections = { blog, projects };
