---
sortOrder: 1
kind: "media"
featured: true
name: BlueDragon
image: ./bluedragon-cover-image.png
description: A custom Minecraft server with a diverse set of fun minigames. Built from scratch using Minestom and deployed locally with Kubernetes.
link: https://bluedragonmc.com
source: https://github.com/BlueDragonMC
tags:
  - docker
  - react
  - tailwind
  - next
  - k8s
  - kotlin
  - minestom
  - velocity
date: 2022-06-27
ongoing: true
addedDate: 2023-05-27
active: true
---

## Overview

BlueDragon is a network of custom _Minecraft_ servers, built with Kotlin and the [Minestom](https://minestom.net/) library, orchestrated in a Kubernetes cluster along with a proxy, database, and queue service.

It is a team effort between me and my brother, [Tyler](https://www.tswanson.dev/). I mainly handle the infrastructure, inter-service messaging, and underlying utilities, while he handles most of the game design and programming.

We have been iterating on BlueDragon since 2019, and in the process, I've learned so much about system design, build and deployment tools, CI/CD, programming best practices, and more.

## How To Play

1. Open up Minecraft 1.21.5.
2. Click "Multiplayer", then "Add Server".
3. Enter `bluedragonmc.com` in the address bar and click "Done".
4. Finally, double-click on the server in your server list.

On our website, we have a [list of games](https://bluedragonmc.com/games) available on the server.

## History

BlueDragon started on July 1st, 2016 as a Minecraft factions server that disallowed raiding; we called this game mode "clans". Clans were groups of players who would collaborate to gather resources, build bases, and fight other clans during planned events.

In 2017, we added more typical Minecraft game modes, including SkyBlock (collaborative survival on an island with limited resources) and Prison (mining valuable ores to make progress towards accessing even more valuable resources).
At this time, we made a few [custom](https://github.com/FluxCapacitor2/DragonInventoryFull) [plugins](https://github.com/FluxCapacitor2/DragonRanks), but we mainly stuck to off-the-shelf solutions.

In 2019, after struggling to find the classic [Spleef](https://minecraft.wiki/w/Spleef) game mode on any popular Minecraft servers, we decided to [create our own](https://github.com/FluxCapacitor2/BDSpleef). This was the first custom plugin that Tyler and I wrote for the server.

We decided to abstract away some of the game logic, including the countdown, player tracking, and resetting the map, into a shared library we called [DragonGameCore](https://github.com/FluxCapacitor2/DragonGameCore). This first iteration kept all games on a single game server and only allowed one instance of a game to be played at once.

In 2020, I rewrote the system to allow players to access multiple game servers which communicated with the proxy server via hijacked player connections (["plugin messages"](https://web.archive.org/web/20220711204310/https://dinnerbone.com/blog/2012/01/13/minecraft-plugin-channels-messaging/)). When a player wanted to join a game, we could copy some template files to a temporary directory, start up a new Minecraft server, and connect it to our proxy. This system was powerful, but we found it was too slow.

Near the end of that year, I rewrote the system yet again to make use of Docker, Redis, and [SlimeWorldManager](https://www.spigotmc.org/resources/advanced-slimeworldmanager.87209/) for faster world loading. The rewrite helped me reason about a containerized system with an external messaging service, but it never saw the light of day.

In 2021, I saw [Moulberry](https://x.com/moulberry) working with a custom Minecraft server implementation called [Minestom](https://minestom.net/) on his Twitch stream to build a dungeon crawler game called Gauntlet. I immediately knew I had to use the tech with BlueDragon &mdash; since Minestom is so lightweight, it works great in containers, and on-demand instances are fast enough to be viable.

Our initial Minestom implementation didn't see the light of day, but it did teach us a ton about the Minecraft [protocol](https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Protocol), and we built features like commands, combat, and an [instance](https://minestom.net/docs/world/instances#what-is-an-instance) (world) management system.

## Current Architecture

**We started the current major revision of BlueDragon in June 2022.** This system was different from the previous ones because it was module-based; individual features, like a countdown until the game starts, a sidebar display, or a combat system could be included in multiple games. Using an entity component system (ECS) model over an object-oriented one was a great choice because it allowed us to eliminate boilerplate code without sacrificing flexibility.

| Repository                                             | Purpose                                                                                                                                                                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Server](https://github.com/BlueDragonMC/Server/)      | A framework for building a minigame server, including IPC, in-game commands, world management and isolation, and prebuilt modules with common game functionality.                                                          |
| Games _(private)_                                      | A collection of plugins to be loaded by the Server which provide minigame implementations.                                                                                                                                 |
| [Puffin](https://github.com/BlueDragonMC/Puffin)       | A standalone service that manages game server allocation, the player queue, the party system, and more.                                                                                                                    |
| [Komodo](https://github.com/BlueDragonMC/Komodo)       | A [Velocity](https://papermc.io/software/velocity) plugin that connects the proxy to game servers to allow players to connect to them.                                                                                     |
| [RPC](https://github.com/BlueDragonMC/RPC/)            | A set of protocol buffer files that define our IPC with automatic Java and Kotlin code generation.                                                                                                                         |
| [Dashboard](https://github.com/BlueDragonMC/Dashboard) | A web-based interface that allows administrators to see game servers' logs, current states, and players by communicating with Puffin via WebSockets.                                                                       |
| [Website](https://github.com/BlueDragonMC/Website)     | BlueDragon's official [website](https://bluedragonmc.com/), featuring a blog and player statistics and leaderboards.                                                                                                       |
| [Docs](https://github.com/BlueDragonMC/Docs)           | BlueDragon's official [documentation](https://developer.bluedragonmc.com/), intended for developers using BlueDragonMC/Server to build their own minigame servers. Includes detailed guides for deployment and management. |

We originally mounted the host system's Docker socket in Puffin's container and [had it orchestrate game servers](https://github.com/BlueDragonMC/Puffin/pull/2), but
we found that Kubernetes was much more reliable, so I [made the switch](https://github.com/BlueDragonMC/Puffin/pull/3) in August 2022. Here's a [blog post](https://bluedragonmc.com/blog/2022-08-23-bluedragon-update) that I wrote during the migration.

I set up a Kubernetes cluster on a PC that we built at home and deployed game servers in a [Fleet](https://agones.dev/site/docs/getting-started/create-fleet/) managed by [Agones](https://agones.dev/site/), a game server orchestration platform built on Kubernetes.
Puffin was then set up to consume the Kubernetes API to monitor servers and establish gRPC connections to them.

For messaging, I [initially used RabbitMQ](https://github.com/BlueDragonMC/MessagingSystem) because I had prior experience with it, but I [switched to gRPC](https://bluedragonmc.com/blog/2022-11-15-internal-changes) because it's more lightweight and protocol buffer code generation was really convenient.

<!--
We've made a lot of GitHub repositories over the years!

| Revision | Start         | Game server                                  | Proxy Plugin             | Manager service      | Messaging                                                               |
| -------- | ------------- | -------------------------------------------- | ------------------------ | -------------------- | --------------------------------------------------------------------    |
| 1        | June 2019     | FluxCapacitor2/DragonGameCore + game plugins | None                     | None                 | None                                                                    |
| 2        | June 2020     | BlueDragonMC/Core (DGC-GM)                   | BlueDragonMC/Backend     | None                 | RabbitMQ; BlueDragonMC/Messaging                                        |
| 3        | December 2021 | BlueDragonMC/MinestomServer                  | BlueDragonMC/ProxyPlugin | Part of proxy plugin | Redis                                                                   |
| 4        | June 2022     | BlueDragonMC/Server + game plugins           | BlueDragonMC/Komodo      | BlueDragonMC/Puffin  | RabbitMQ; BlueDragonMC/MessagingSystem -- later: gRPC; BlueDragonMC/RPC |
-->

## How the System Works

BlueDragon is a combination of three services working together: the game server, the proxy, and the manager service ([Puffin](https://github.com/BlueDragonMC/Puffin)).

- The **game server** accepts player connections, runs the games, and accepts commands from the manager service.
- The **proxy server** routes players to the correct game server by communicating with the manager service.
- The **manager service** keeps everything in sync, including chat messages, parties, and game queueing.
  It also sends gRPC messages to the game servers to create game instances and send players to them.

These services are written in Kotlin and run in Docker containers deployed on a Kubernetes cluster (MicroK8s)
that we host at home on a tower computer running Ubuntu Server.
They require MongoDB to store player data and [LuckPerms](https://luckperms.net/) (in [standalone mode](https://github.com/LuckPerms/rest-api)) to evalute player permissions.

### Why do we do it this way?

- We split games across multiple servers for enhanced reliability, allowing for failover in the event of a server crash and for automatic rolling updates that don't affect players.
- We separated the manager service from the proxy server because the proxy server holds every player connection. Restarting the manager service should not require a restart of the proxy server, since that would momentarily disconnect every player.
- We use gRPC for messaging because it's fast, strongly-typed, and most of our messages fit a standard request-response format, which is perfect for an RPC framework.

For more details, check out our [blog post](https://bluedragonmc.com/blog/2023-12-13-technical-details) on the BlueDragon website detailing our architecture from the end of 2023.

## Languages and Technologies

- Kotlin
- MongoDB
- gRPC
- TypeScript
- TailwindCSS
- Vue.js (dashboard)
- Next.js (website)
- Astro (documentation site)
- Docker
- Kubernetes
- [Tilt](https://tilt.dev/) (development environment)

## What I've Learned

**Failure is important and represents growth.**

From 2019 to 2022, we've rewritten BlueDragon in its entirety four times. That's one rewrite every year.
At times, it has felt like this is a string of failures, but to me, it represents growth.
Every iteration reflected learning important lessons from the last, mistakes we'll never make again.

**Distributed systems are hard.**

BlueDragon is the first distributed system I've worked on, and one of the most difficult components to get right was inter-service messaging.

During my work on BlueDragon, I've encountered countless problems caused by services getting out of sync, messages not arriving, or connections being silently closed.
I've learned so much about improving the reliability of networked systems, but there is still so much more to learn.

**Search for existing solutions before inventing something new.**

For some of the earlier iterations of BlueDragon, I built many systems that could have been replaced with existing solutions.

- Before I knew about gRPC and protocol buffers, I built a custom serialization format for messaging.
- Before I knew about Docker, I created a system that copied files into a temporary folder and started up new server processes.
- Before I knew about Kubernetes, I built a custom orchestrator for game servers.

These solutions worked for their intended purposes, but they didn't grow with us as we tried to add new features.
**I don't regret it, though**; building these systems has shown me why the existing tools are so ubiquitous.

**Developer experience is important.**

As BlueDragon became more complex, we started to shy away from developing in a production-like environment because took so much time to set up,
which discouraged us from developing features like the party system.
To develop in an environment that mirrored production, we needed a proxy, a game server, and instances of MongoDB, Puffin, and LuckPerms, all running at the same time and configured to network with each other.

At the end of 2023, I found out about [Tilt](https://tilt.dev/), a tool that allows you to declaratively configure resources in a local Kubernetes cluster.
I set it up to watch the source files across all of our projects and rebuild and deploy the necessary Kubernetes resources when they change.
This means new developers can set up their environments in about 10 minutes with minimal effort, and it's made it way more fun
to contribute to BlueDragon because I can focus on the tasks I _want_ to complete instead of fiddling with Kubernetes deployment scripts and configuration files.
