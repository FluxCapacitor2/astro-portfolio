---
title: Notes from Learning Golang
description: Everything I liked, disliked, and found surprising while learning Go to build Easysearch—coming from a background in JVM languages and the Node.js ecosystem.
image: ./image.png
date: 2024-08-08T00:00:00-04:00
---

Over the past few weeks, I've been learning the [Go programming language](https://go.dev) to build
[Easysearch](https://github.com/FluxCapacitor2/easysearch/), a web crawler that builds a full-text search
index of your site and provides a search interface and JSON API.

I wanted to learn Go for two main reasons:

1. Many cloud-native tools, like Kubernetes, are written in Go, and I wanted to be able to understand and extend them.
2. **I was excited to write code at a lower level** and finally learn about pointers.
   For me, Go is the perfect gateway between the high-level languages I know (TypeScript, Java, Kotlin, etc.) and low-level systems programming languages like C, C++, and Rust.

Here are my thoughts after learning and working with the language for a few weeks.

## 1. Composition over inheritance

When I started writing Go, I learned that it had interfaces, so I expected to be able to use Java-like inheritance, where an interface implements its supertype.
However, in Go, you use **composition** instead.

Types can implement an interface by simply implementing all of its methods. This allows for multiple inheritance and generally makes the language more flexible.

_Read more about this in the [Go FAQ](https://go.dev/doc/faq#inheritance)._

For example, I wanted to add multiple database drivers to my project. Other areas of the program shouldn't need to know about the existence of multiple database drivers, so I created multiple types that satisfied an interface defining the required methods of a database driver.

First, I created a `Database` interface like this:

```go
type Database interface {
	// Create necessary tables
	Setup() error

	// Add a page to the search index.
	AddDocument(source string, depth int32, url string, status QueueItemStatus, title string, description string, content string) error
	// Returns whether the given URL (or the URL's canonical) is indexed
	HasDocument(source string, url string) (*bool, error)

	// Run a fulltext search with the given query
	Search(sources []string, query string, page uint32, pageSize uint32) ([]Result, *uint32, error)

  // ...
}
```

Then, I made a `SQLiteDatabase` type:

```go
type SQLiteDatabase struct {
  conn *sql.DB
}

func (db *SQLiteDatabase) Setup() error {
  // Note: In these methods, `db` is a receiver.
  // If I had a *SQLiteDatabase variable named `db`,
  // I would call db.Setup() to run its Setup method.
}

func (db *SQLiteDatabase) AddDocument(source string, depth int32, url string, status QueueItemStatus, title string, description string, content string) error {
  // ...
}

func (db *SQLiteDatabase) HasDocument(source string, url string) (*bool, error){
  // ...
}

func (db *SQLiteDatabase) Search(sources []string, query string, page uint32, pageSize uint32) ([]Result, *uint32, error) {
  // ...
}
```

Now, because `SQLiteDatabase` has all of `Database`'s methods implemented, I can assign a `SQLiteDatabase` to a variable of type `Database`:

```go
var db *Database

db = &SQLiteDatabase{} // <-- This compiles!
```

In this way, the language almost has duck typing&mdash;except it's performed at compile time, so it's actually called [structural typing](https://go.dev/doc/faq#implements_interface).

I really like this approach; it's like Kotlin's [extension functions](https://kotlinlang.org/docs/extensions.html) on steroids.

## 2. Multiple return values

Being able to return multiple values from a function seems like such an obvious feature for a new programming language.
I remember abusing Kotlin's `Pair` and `Triple` types to return two and three values from functions, but they weren't self-documenting.
With Go, I can name each of the values, and I don't have to create a single-use `struct` (or in Kotlin, a data class).

Go's implementation of multi-return values also forces you to handle or explicitly throw away a returned error. While this makes your code more verbose, it is worthwhile. When I wrote Kotlin code for [BlueDragon](https://github.com/BlueDragonMC), unchecked exceptions were difficult to handle because, the majority of the time, they were hidden.

## 3. It feels great writing compiled code

Before Go, my experience was mainly with the JVM and JavaScript ecosystems.
Both of them require external runtimes and are not nearly as lightweight as Go. (While Go does require a runtime and bundles a standard library, they're both a part of your application binary.)

Compile times are VERY fast (for my admittedly small project) and everything fits into a single binary. Memory usage is generally much lower for applications implemented in Go than the JVM or Node.js.

## 4. Package management and imports

I love that Go has an official package manager. I enjoy the standardization, especially in comparison to the JVM (Maven/Gradle) and Node.js (NPM/PNPM/Yarn/Bun) ecosystems, where projects use different package managers and build systems.

Speaking of package management, you can import files from URLs in Go. But it's not that simple.

To illustrate this, I'll present an example. [Deno](https://deno.com/), a modern JavaScript runtime with a comprehensive standard library, adopted HTTP imports. However, in a [recent blog post](https://deno.com/blog/http-imports), they mentioned a few pitfalls of their system:

- Long URLs
- Duplicate dependencies and handling version upgrades
- Encouraging decentralized registries increases potential for downtime, making module resolution unreliable

In addition, I believe their solution is also vulnerable to supply-chain attacks. If an attacker gained control of the registry, running Deno programs with an empty Deno module cache could automatically expose you to cyberattacks. This means you must trust that the registry remains secure.

Go's implementation differs from this because:

- URLs are not fully qualified. They don't include a protocol (instead trying a list of [secure protocols](https://pkg.go.dev/cmd/go@master#hdr-Remote_import_paths)), and they link to the package, not the source file.
- Versioning is handled by the package manager, so package versions are never mentioned in your source files.
- The `go.sum` lockfile contains a hash for each package, so if the package is silently updated, Go won't install it.

I can tell that a lot of thought went into this system, and from a Go user's point of view, it feels seamless.

## 5. I wish it had `public` and `private` keywords like Java

Capitalization is weird. I think it should be a convention, but shouldn't be enforced at the language level.

In this section, I originally wrote:

> With my Java habits of capitalizing interface names by default, I feel like it's too easy to accidentally expose a part of your API
> that you didn't mean to expose.

While I still think the capitalization scheme is unusual and awkward, I don't mind it too much anymore. It was relatively easy to get used to.

## 6. I don't like extremely short variable names

This is coming from [this presentation](https://go.dev/talks/2014/names.slide#6) on the Go website. Here's their example of "Good" naming:

```go
func RuneCount(b []byte) int {
    count := 0
    for i := 0; i < len(b); {
        if b[i] < RuneSelf {
            i++
        } else {
            _, n := DecodeRune(b[i:])
            i += n
        }
        count++
    }
    return count
}
```

...and the same function with "Bad" naming:

```go
func RuneCount(buffer []byte) int {
    runeCount := 0
    for index := 0; index < len(buffer); {
        if buffer[index] < RuneSelf {
            index++
        } else {
            _, size := DecodeRune(buffer[index:])
            index += size
        }
        runeCount++
    }
    return runeCount
}
```

I actually prefer the "Bad" example here.
Why not be descriptive?

This is one of the reasons why I think it's hard to read (or glance through) others' Go code. When working with multiple variables, I'd rather they be descriptively named.

## 7. I wish Go had proper enums

An enum's entries are just constants in Go, so they're accessed via the package name (or without a prefix when accessed from the same package), rather than a name that represents the enum and its possible values.

For example, I have an enum for the status of a crawl job:

```go
type QueueItemStatus int8

const (
	Pending QueueItemStatus = iota
	Processing
	Finished
	Error
	Unindexable
)
```

...but the enum doesn't have a name to identify itself. These are just numbers.

If I used these values in another file, I would have no idea what they are without surrounding context.
_Go by Example_ [suggests](https://gobyexample.com/enums) using a common prefix for each item, but it would feel better
to have a parent name that the developer needs to use to refer to the enum's constants.

**On the other hand**, accessing non-enum constants, variables, and methods without a class name feels like a superpower.
It makes organization super easy because I can move methods between files in the same package without changing imports or qualified names.
As long as your package is small, I think it helps readability by making code easier to scan.

## 9. SQLite and CGo

If your program is written with pure Go, you can disable CGo to get a completely static binary that can run without any dependencies.
This is one of the reasons why Go is so perfect for containers.

However, when I was writing Easysearch, I used SQLite as a data source&mdash;and the [leading SQLite library](https://github.com/mattn/go-sqlite3) requires CGo. A [WASM implementation](https://gitlab.com/cznic/sqlite) exists, but it is [slower](https://gitlab.com/cznic/sqlite#speedtest1) at runtime than the C implementation.

I would really like to use [Ko](https://ko.build/) to containerize Easysearch into a tiny container with only my application binary, but I can't (at least not easily!) since it requires CGo. I worked around this limitation by basing my Docker image on [`debian` slim](https://hub.docker.com/layers/library/debian/bookworm-slim/images/sha256-16112ae93b810eb1ec6d1db6e01835d2444c8ca99aa678e03dd104ea3ec68408?context=explore), which still allows me to produce a relatively small (~108MB) [container image](https://github.com/FluxCapacitor2/easysearch/pkgs/container/easysearch).

## 10. I like Go's standard library, but Kotlin's remains king

Go's standard library is great, and it probably feels amazing coming from C or another low-level language, but the best I've worked with so far is definitely Kotlin's. I _love_ the functional utilities, like `map`, `filter`, `any`, `all`, etc. &mdash; and Go doesn't have any of them :(

Go also doesn't support method overloading and wouldn't play nice with multiple `math` packages for different numeric types, which makes math operations quite annoying when you aren't using `float64` for all your numbers.

## Conclusion

I haven't learned a new programming language in a while, but Go has been a joy to experiment with.
Since it's compiled yet garbage collected, it strikes a great balance between developer velocity and execution speed.

I look forward to experimenting more with concurrency and channels. I also want to implement a CLI with Go, since that's one of Go's most common uses.

Go has helped me solidify my (basic) understanding of pointers, which will make C and C++ much easier to learn.
**It's is a great next step** for people like me who have a solid understanding of high-level languages and want to dive a bit deeper and a bit closer to the hardware.
