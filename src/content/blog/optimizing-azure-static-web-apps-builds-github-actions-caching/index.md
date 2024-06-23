---
title: Speeding Up Azure Static Web Apps Builds With Caching
description: Improving Azure Static Web Apps' default GitHub Action for Node.js projects.
date: 2024-06-22T00:00:00-04:00
image: ./swa.png
---

## Background

[Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/overview) is Azure's service for hosting a static site with automatic TLS certificates, a global CDN, preview environments, and (optionally) serverless functions.

When you push a code change to your site's source repository, a workflow builds and deploys the new version to Azure.
To accomplish this, when you link your repository to your Static Web App in the Azure portal, the wizard commits a GitHub Actions workflow
to your project.

## The GitHub Actions Workflow

At the time of writing, the default Static Web Apps deployment workflow looks like [this](https://github.com/actions/starter-workflows/blob/cd4b67d0b4d0afb975b04ffa9097d358de9a7af3/deployments/azure-staticwebapp.yml):

```yml
name: Deploy web app to Azure Static Web Apps

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

# Environment variables available to all jobs and steps in this workflow
env:
  APP_LOCATION: "/" # location of your client code
  API_LOCATION: "api" # location of your api source code - optional
  APP_ARTIFACT_LOCATION: "build" # location of client code build output
  AZURE_STATIC_WEB_APPS_API_TOKEN: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }} # secret containing deployment token for your static web app

permissions:
  contents: read

jobs:
  build_and_deploy_job:
    permissions:
      contents: read # for actions/checkout to fetch code
      pull-requests: write # for Azure/static-web-apps-deploy to comment on PRs
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ env.AZURE_STATIC_WEB_APPS_API_TOKEN }} # secret containing api token for app
          repo_token: ${{ secrets.GITHUB_TOKEN }} # Used for Github integrations (i.e. PR comments)
          action: "upload"
          ###### Repository/Build Configurations - These values can be configured to match you app requirements. ######
          # For more information regarding Static Web App workflow configurations, please visit: https://aka.ms/swaworkflowconfig
          app_location: ${{ env.APP_LOCATION }}
          api_location: ${{ env.API_LOCATION }}
          app_artifact_location: ${{ env.APP_ARTIFACT_LOCATION }}
          ###### End of Repository/Build Configurations ######

  close_pull_request_job:
    permissions:
      contents: none
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ env.AZURE_STATIC_WEB_APPS_API_TOKEN }} # secret containing api token for app
          action: "close"
```

<small>

Here's the associated [GitHub documentation](https://docs.github.com/en/actions/deployment/deploying-to-your-cloud-provider/deploying-to-azure/deploying-to-azure-static-web-app) for this Actions workflow.

</small>

This file contains two jobs:

1. `build_and_deploy_job` identifies your project type, runs its build command, and uploads the output to Azure.
2. `close_pull_request_job` deletes preview environments when you close a pull request.

The build and deploy step of this file works perfectly in most cases, but it is quite slow.
It uses an open-source, first-party tool called [Oryx](https://github.com/microsoft/Oryx) to
generate a build script specific to your project structure.

## Splitting The Install, Build, and Deploy Steps

Oryx combines all three phases of the workflow into one action: installing packages, building the application, and uploading it to Azure.
It supports many different build systems and frameworks&mdash;currently, [it supports](https://github.com/microsoft/Oryx/blob/main/doc/supportedPlatformVersions.md) .NET, Go, Java, Node.js, PHP, Python, and Ruby.

With so many supported platforms, implementing caching for each one is likely out of scope for the project.
When researching possible solutions for Node.js package caching, I found these two GitHub issues:

- https://github.com/microsoft/Oryx/issues/1172
- https://github.com/Azure/static-web-apps/issues/203

Unfortunately, they didn't lead me anywhere.

Looking back at the workflow file that Azure provides, the GitHub Action that they use is `Azure/static-web-apps-deploy@v1`.
That [repository](https://github.com/Azure/static-web-apps-deploy) led me to the [workflow configuration documentation](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration).

Through these docs, I found out that you could [skip building the app](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration?tabs=github-actions#skip-building-front-end-app) and only use the action to deploy it. If we handle building the app ourselves, we can take full control over caching and speed up our builds.

## Here's What I Did

1. I added `skip_app_build: true` to the inputs (the `with:` block) of the `Azure/static-web-apps-deploy` step.
2. I configured two steps to run before the Static Web App deploy step:

   ```yml
   - name: Install packages
     run: npm ci
   - name: Build
     run: npm run build
   ```

   These steps replicate what Oryx would have done if we didn't set `skip_app_build` to `true`.

3. I set up Next.js caching using GitHub's first-party `cache` action and NPM package caching using the option in the `setup-node` action:

   ```yml {7,12}
   # Set up Node.js and cache installed NPM packages
   - uses: actions/setup-node@v3
     with:
       node-version: 18
       # If you use `yarn` or `pnpm`, you will have to adjust this setting.
       # https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md#caching-packages-data
       cache: "npm"
   # Cache Next.js outputs
   - uses: actions/cache@v3
     with:
       path: |
         ${{ github.workspace }}/.next/cache
       key: |
         ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
       restore-keys: |
         ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}
   ```

   _Make sure to place these steps **before** the install and build steps!_

## Final Product

In the end, my workflow file looked like this (modified lines highlighted):

```yml {31-50, 58}
name: Deploy web app to Azure Static Web Apps

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

# Environment variables available to all jobs and steps in this workflow
env:
  APP_LOCATION: "/" # location of your client code
  API_LOCATION: "api" # location of your api source code - optional
  AZURE_STATIC_WEB_APPS_API_TOKEN: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }} # secret containing deployment token for your static web app

permissions:
  contents: read

jobs:
  build_and_deploy_job:
    permissions:
      contents: read # for actions/checkout to fetch code
      pull-requests: write # for Azure/static-web-apps-deploy to comment on PRs
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
      # Set up Node.js and cache installed NPM packages
      - uses: actions/setup-node@v3
          with:
          node-version: 18
          # If you use `yarn` or `pnpm`, you will have to adjust this setting.
          # https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md#caching-packages-data
          cache: "npm"
      # Cache Next.js build outputs (If you aren't using Next.js, you can replace `.next/cache` with your framework's cache directory)
      - uses: actions/cache@v3
          with:
          path: |
              ${{ github.workspace }}/.next/cache
          key: |
              ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
          restore-keys: |
              ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}
      - name: Install packages
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy
        id: deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ env.AZURE_STATIC_WEB_APPS_API_TOKEN }} # secret containing api token for app
          repo_token: ${{ secrets.GITHUB_TOKEN }} # Used for Github integrations (i.e. PR comments)
          action: "upload"
          skip_app_build: true
          ###### Repository/Build Configurations - These values can be configured to match you app requirements. ######
          # For more information regarding Static Web App workflow configurations, please visit: https://aka.ms/swaworkflowconfig
          app_location: ${{ env.APP_LOCATION }}
          api_location: ${{ env.API_LOCATION }}
          ###### End of Repository/Build Configurations ######

  close_pull_request_job:
    permissions:
      contents: none
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request Job
    steps:
      - name: Close Pull Request
        id: closepullrequest
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ env.AZURE_STATIC_WEB_APPS_API_TOKEN }} # secret containing api token for app
          action: "close"
```

The project I wrote this workflow for is built with Next.js. This solution should work for any Node.js project with an NPM `build` script;
however, you may need to adjust the `APP_LOCATION` variable to fit your framework.

For me, the variable's value didn't matter because Oryx automatically deploys Next.js apps from the `.next` or `.next/standalone` directories.

## Next Steps

> ⚠️ Before following my instructions in this section, please make sure the [repository](https://github.com/ajraczkowski/static-web-apps-deploy) is not deprecated! This is a (hopefully) temporary solution.

The Azure Static Web Apps deploy action runs in a Docker container, so every time it's invoked, it pulls a Docker image (`mcr.microsoft.com/appsvc/staticappsclient`) to create a container.
In September 2022, according to a GitHub [issue comment](https://github.com/Azure/static-web-apps/issues/878#issuecomment-1246800871) I found,
this image was 2.41GB. Now, it's 1.12GB, but there is still much room for improvement.

The commenter shared their own [drop-in replacement](https://github.com/ajraczkowski/static-web-apps-deploy) for Azure's GitHub Action and Docker image that only weighs 291MB (about a quarter of the official image's current size). I have not used this in my own projects, but this could shave some time off your builds and therefore reduce GitHub Actions [billed minutes](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions#per-minute-rates)&mdash;and if you use your own GitHub Actions runners, it would greatly reduce your bandwidth costs.

To use it, replace the line that reads:

```yml
uses: Azure/static-web-apps-deploy@v1
```

with this:

```yml
uses: ajraczkowski/static-web-apps-deploy
```

AJ's action is a fork of the official one that points to their slimmer image instead of Microsoft's.

## Further Reading

I found a similar implementation in [this extremely helpful article](https://johnnyreilly.com/playwright-github-actions-and-azure-static-web-apps-staging-environments#creating-a-github-actions-workflow) by John Reilly, which also includes workflow steps for running Playwright tests against the deployed SWA staging environment URLs.
