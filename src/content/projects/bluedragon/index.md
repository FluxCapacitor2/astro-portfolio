---
kind: "media"
featured: true
name: BlueDragon
image: ./bluedragon.png
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

**BlueDragon** is a custom server for Minecraft. It is a combination of many sub-projects.
The current codebase (June 27<sup>th</sup>, 2022 &mdash; Present) is the culmination of many iterations and rewrites due to changing requirements and design decisions.

### Server

[![View source](https://img.shields.io/badge/view%20source-GitHub-blue)](https://github.com/BlueDragonMC/Server)

BlueDragon's [Minestom](https://minestom.net) implementation. Main features include:

- Creating isolated instances for different game types and modes
- A modular system for adding functionality to games
  - This allows for a very high degree of code reusability and simplicity, and makes rapid prototyping of games very quick and easy.
- System for handling player punishments
- Database support linked to every Player using a player provider
- Synchronization with other servers using gRPC messaging and a Mongo database
- Routing players to the correct instance when they join
- Separated, per-instance chat and tablist functionality
- Basic commands

An example minigame built on BlueDragonMC/Server can be found [here](https://github.com/BlueDragonMC/ExampleGame).

### Puffin

[![View source](https://img.shields.io/badge/view%20source-GitHub-blue)](https://github.com/BlueDragonMC/Puffin)

An independent service running as BlueDragon's game server manager and queue system.

- Uses the Kubernetes API to monitor the current state of the cluster
- Tracks players across game servers and routes messages to them from other game servers
- Allocates game instances to balance resource usage across a Kubernetes cluster
- Handles features such as parties and private messaging which rely on inter-service gRPC messaging

### Komodo

[![View source](https://img.shields.io/badge/view%20source-GitHub-blue)](https://github.com/BlueDragonMC/Komodo)

A plugin for [Velocity](https://papermc.io/software/velocity) proxies that interacts with Puffin to keep in sync with the cluster.

- Routes players to servers based on received gRPC messages
- Dynamically creates and removes server registrations
- Requests a player count from an external service and generates a server list ping response with it
- Sends players to a lobby when they first join

### Jukebox

[![View source](https://img.shields.io/badge/view%20source-GitHub-blue)](https://github.com/BlueDragonMC/Jukebox)

A plugin and API for playing Note Block Studio (NBS) songs on a Velocity proxy.

- Parses and plays NBS files
- Uses [Protocolize](https://github.com/Exceptionflug/protocolize) to create custom GUIs on the proxy
- Continues playback between backend servers

### Website

[![View source](https://img.shields.io/badge/view%20source-GitHub-blue)](https://github.com/BlueDragonMC/Website)

BlueDragon's official website, featuring:

- A markdown blog
- Server status
- Leaderboards
- Player statistics
- An official API
- Instructions for each minigame
