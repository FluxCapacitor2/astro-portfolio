---
title: Hacking Strapi with Koa Middleware and Transform Streams
description: How I used Koa middleware to customize the Strapi login page with an injected inline script.
date: 2024-06-22T00:00:00-04:00
image: ./strapi.png
---

## Introduction

For a recent project, I needed to customize the Strapi admin panel login page.
Strapi doesn't expose a way to customize this page with plugins, so I had to find my own way.

There are a few ways to do this:

- Maintaining a fork of Strapi
- Using [patch-package](https://www.npmjs.com/package/patch-package) to patch the [component]()
- Writing a workaround without modifying the package

I went with (what seemed to be) the simplest option available to me and decided to write a workaround.

## Strapi Extensibility

Strapi is relatively flexible and can be extended with [plugins](https://strapi.io/plugins). Plugins can provide:

- Field types
- Pages in the admin panel
- Routes (map an HTTP path and verb to a controller)
- Controllers (receive requests and return responses)
- Content types
- Middlewares (intercept and modify requests/responses)

My first idea was to add a new page and redirect the admin panel login page to my custom one.

## Redirects with Middleware

With Strapi, you can add a new middleware to the stack in your `config/middlewares.ts` file. The default looks something like this:

```ts title="config/middlewares.ts"
export default [
  "strapi::errors",
  "strapi::security"
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
```

If you create a new file in `src/middlewares`, you can reference it in the `config/middlewares.ts` file to register it.

For example, I created `src/middlewares/login-page.ts` and added `"global::login-page"` to the list.

```ts title="src/middlewares/login-page.ts" caption="A no-op middleware"
import { type Strapi } from "@strapi/strapi";

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    await next();
  };
};
```

_**Note**: This is a global middleware. If I could edit the definition of the route I wanted to modify, I could have added a [route-specific middleware](https://docs.strapi.io/dev-docs/backend-customization/routes#middlewares) instead of applying a middleware to every request and filtering paths manually._

Strapi uses Koa internally, so its middlewares follow Koa patterns.
The middleware function receives a request context and `next` function.

By changing where you call `next()` in our middleware, you can run code before and/or after the request is processed.
For more details, see [this diagram](https://docs.strapi.io/img/assets/backend-customization/diagram-global-middlewares.png) from the Strapi docs (found on [this page](https://docs.strapi.io/dev-docs/backend-customization/middlewares)).

For my use case, I am just setting a response header, so the location of the `next()` call doesn't make a difference.

```ts title="src/middlewares/login-page.ts"
import { type Strapi } from "@strapi/strapi";

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    await next();

    if (ctx.request.path === "/admin/auth/login") {
      ctx.redirect("/my-custom-page");
    }
  };
};
```

You could also register a route, like [this example](https://docs.strapi.io/dev-docs/deployment/snippets-proxy/admin-redirect#redirecting-landing-page-to-admin-panel) from the Strapi docs. Both solutions produce the same outcome, but I prefer the one here because it is easier to understand without digging into Strapi's routing system.

## A curveball: Client-side rendering

The redirect middleware works if you navigate directly to the login page in your browser; however, when you log out, the navigation is handled on the client side, so you see the default Strapi login page. The redirect only occurs if you reload the page.

In hindsight, that problem was pretty obvious, but that's what it's like being a programmer :)

This is where my "workaround" gets promoted to "hacky workaround." Strapi uses [React Router 5](https://v5.reactrouter.com/web/) for the admin panel, but it doesn't expose a way for me to add or modify client-side routes. I really should have patched the package, but instead, I had some more fun with middleware.

I kept my existing middleware, but I added an interceptor for HTML pages.

```ts {11-15} title="src/middlewares/login-page.ts"
import { type Strapi } from "@strapi/strapi";

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    await next();

    if (ctx.request.path === "/admin/auth/login") {
      ctx.redirect("/my-custom-page");
    }

    if (
      ctx.response.headers["content-type"]?.startsWith("text/html") === true
    ) {
      // TODO: inject additional content into the response body
    }
  };
};
```

> **Note**: I used `startsWith` instead of an equality comparison because HTML `Content-Type` headers can specify additional directives after the content type.
> Strapi adds a `charset` directive, so its `Content-Type` header looks like:
>
> ```
> Content-Type: text/html; charset=utf-8
> ```

Strapi defines its initial page HTML [here](https://github.com/strapi/strapi/blob/c27880c9af0e2c29e6d6512b0d5fbaa6b506acdc/packages/core/admin/admin/src/components/DefaultDocument.tsx#L26) and, during the build, pre-renders it to a static file [here](https://github.com/strapi/strapi/blob/c27880c9af0e2c29e6d6512b0d5fbaa6b506acdc/packages/core/admin/_internal/node/staticFiles.ts#L100).
When serving static files, the response body (stored in `ctx.body`) is a Node.js [Readable](https://nodejs.org/api/stream.html#class-streamreadable) stream.

Even though the files transferred were small, I wanted to challenge myself and inject the content
without waiting for it to be read completely and converting it into a string.

What a great excuse to learn about...

## Transform Streams!

Transform streams are a [Node.js](https://nodejs.org/api/stream.html#class-streamtransform) and [web-standard](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream) feature that allows you to receive data from a readable stream, modify it, and write it to a writable stream.

We will be discussing the Node.js-specific `stream.Transform` API, but the web standard version works similarly.

Here's a simple example:

```ts caption="A no-op Node.js transform stream"
import { Transform } from "stream";

const transformStream = new Transform({
  /**
   * The only function that you need to implement is `transform`.
   */
  transform(chunk, encoding, callback) {
    // `chunk` is a buffer of data emitted from the input (readable) stream.
    // Inside the `transform` function, we can do anything we want with the data.
    // In this case, we just push the chunk to the output (writable) stream without changing it at all.
    this.push(chunk, encoding);

    // The `callback` must be invoked after the `chunk` is processed.
    callback();
  },
});
```

The Node.js documentation has a [full guide](https://nodejs.org/api/stream.html#implementing-a-transform-stream) on implementing a transform stream.
To use it, we would `pipe` our Readable into it:

```ts
const newReadableStream = readableStream.pipe(transformStream);
```

The content of `newReadableStream` would be based on the input read from `readableStream` and modified by `transformStream`.

In practice, our solution would look something like this:

```ts {1-5, 20, 42}
const customHTML = `
<script type="text/javascript">
  alert("Hello!");
</script>
`;

/**
 * A transform stream that adds the contents of `customHTML` at the end of the source's output.
 */
const transform = new Transform({
  transform(chunk, encoding, callback) {
    // The `transform` function actually doesn't transform anything here, but implementing it is required.
    this.push(chunk, encoding);
    callback();
  },
  flush(callback) {
    // `flush` is called after all data has been read from the stream.
    // At this point, the custom script should be injected into the response body.
    // For more info: https://nodejs.org/api/stream.html#transform_flushcallback
    this.push(Buffer.from(customHTML));
    callback();
  },
});

export default (config, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    await next();

    // Process redirects for users that navigate to the page directly
    if (ctx.request.path === "/admin/auth/login") {
      ctx.redirect("/my-custom-page");
    }

    // If the response is an HTML document, inject a script
    if (
      ctx.response.headers["content-type"]?.startsWith("text/html") === true
    ) {
      const original =
        ctx.body instanceof Readable ? ctx.body : Readable.from(ctx.body);
      // Pipe the response into the transform stream, which will inject
      // our script at the end of the HTML document.
      ctx.body = original.pipe(transform);
    }
  };
};
```

Now, we can hack together a script that runs when the user navigates to the login page on the client:

```js
let shownAlert = false;
setInterval(() => {
  if (window.location.pathname.startsWith("/admin/auth/login")) {
    // Here, you could add UI elements, change styles, make requests, etc.
    alert("Login page script injection successful!");
    shownAlert = true;
  } else {
    shownAlert = false;
  }
}, 50);
```

Put this into the `customHTML` variable inside a `<script>` tag, and it should run on all HTML pages that Strapi serves.

It's not beautiful, but it works! :)
