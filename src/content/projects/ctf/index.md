---
kind: website
name: Capture The Flag
image: ./ctf.png
description: An online capture the flag (CTF) cybersecurity challenge with dynamic flags, user authentication, and on-the-fly resource generation.
tags:
  - react
  - tailwind
  - next
  - prisma
  - docker
date: 2023-04-24
addedDate: 2023-05-27
---

<i>

For more information about <abbr title="Capture the flag">CTF</abbr>s in general,
see the [Wikipedia page](<https://en.wikipedia.org/wiki/Capture_the_flag_(cybersecurity)>).

</i>

My school's cybersecurity team needed a technical challenge to aid recruitment.
In about 50 hours, I and one other team member created an online platform with 16
challenges spanning a variety of cybersecurity skills needed for competition.

All non-quiz challenges relied on **dynamic flags**, which means flags could not
be shared between users. Every asset necessary for a challenge was **generated on-the-fly**
using a unique flag, created from an encrypted form of the user and challenge IDs.

Some challenges required an instance. Each instance was its own Docker container,
created on demand with custom files based on the user's dynamic flag, and provided
the user with a **fully-featured Linux terminal** accessible online through [Xterm.js](https://xtermjs.org/),
the same library that powers Visual Studio Code's terminal.

Persistence was handled through a simple [SQLite](https://www.sqlite.org/index.html) database
accessed via [Prisma](https://www.prisma.io). Users were authenticated via [Auth.js](https://authjs.dev/) (NextAuth).
