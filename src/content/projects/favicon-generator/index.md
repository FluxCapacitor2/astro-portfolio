---
sortOrder: 9
kind: "website"
name: "Favicon Generator"
image: ./favicon-generator.png
description: A web app that generates a set of favicons and matching copy-paste code snippets matching modern web standards.
source: https://github.com/FluxCapacitor2/favicon-generator
link: https://favicon.bswanson.dev
date: 2023-09-08
addedDate: 2023-09-08
active: false
tags:
  - next
  - react
  - vercel
  - tailwind
---

## Features

- Resizes the input image into four different sizes using [`sharp`](https://github.com/lovell/sharp)
- Generates the appropriate markup to add the generated icons into the user's project
- Optimizes SVGs using [`svgo`](https://github.com/svg/svgo)
- Creates a ZIP file of the generated icons on the server
- Before downloading, the user can preview the contents of the ZIP file (implemented with [`JSZip`](https://stuk.github.io/jszip/))
- Respects the user's system theme and supports both light and dark modes
