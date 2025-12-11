# Code PushUp GitHub Action

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

**🤖 GitHub Action for integrating
[Code PushUp](https://github.com/code-pushup/cli/tree/main/packages/cli#readme)
into your CI workflows.**

![showcase](./images/showcase.png)

## Features

- 📃 Collects a Code PushUp report on push to remote branch.
- 📉 Uploads reports to workflow artifacts and/or Code PushUp portal (optional).
- 💬 When a PR is opened/updated, compares reports for source and target
  branches, and creates/updates a PR comment which summarizes the impact of the
  changes.
  - ⚠️ Also annotates changed files with new issues encountered by Code PushUp.
- 🏢 Supports monorepo setups - runs per project and summarizes comparisons in a
  single PR comment.

## Workflow example

```yml
name: Code PushUp

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  actions: read
  pull-requests: write

jobs:
  code-pushup:
    runs-on: ubuntu-latest
    steps:
      - name: Clone repository
        uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm ci
      - name: Code PushUp
        uses: code-pushup/github-action@v0
```

## Action inputs

The action may be customized using the following optional inputs:

| Name               | Description                                                                                                                                                                                  | Default                                                                                                |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `monorepo`         | Enables [monorepo mode](#monorepo-mode)                                                                                                                                                      | `false`                                                                                                |
| `parallel`         | Configured parallel execution in [monorepo mode](#monorepo-mode)                                                                                                                             | `false`                                                                                                |
| `projects`         | Custom projects configuration for [monorepo mode](#monorepo-mode)                                                                                                                            | none                                                                                                   |
| `task`             | Name of command to run Code PushUp per project in [monorepo mode](#monorepo-mode)                                                                                                            | `code-pushup`                                                                                          |
| `nxProjectsFilter` | CLI arguments used to filter Nx projects in [monorepo mode](#monorepo-mode)                                                                                                                  | `--with-target={task}`                                                                                 |
| `configPatterns`   | Performance optimization for large monorepos, see [`@code-pushup/ci` docs](https://github.com/code-pushup/cli/blob/main/packages/ci/README.md#faster-ci-runs-with-configpatterns)            | none                                                                                                   |
| `token`            | GitHub token for authorizing GitHub API requests                                                                                                                                             | `${{ github.token }}`                                                                                  |
| `annotations`      | Toggles if annotations should be created for relevant Code PushUp issues                                                                                                                     | `true`                                                                                                 |
| `artifacts`        | Toggles if artifacts will we uploaded/downloaded                                                                                                                                             | `true`                                                                                                 |
| `skipComment`      | Toggles if comparison comment is posted to PR                                                                                                                                                | `false`                                                                                                |
| `searchCommits`    | Extends previous report caching for portal users, see [`@code-pushup/ci` docs](https://github.com/code-pushup/cli/blob/main/packages/ci/README.md#search-latest-commits-for-previous-report) | `false`                                                                                                |
| `retention`        | Artifact retention period in days                                                                                                                                                            | from repository settings                                                                               |
| `directory`        | Directory in which `code-pushup` should run                                                                                                                                                  | `process.cwd()`                                                                                        |
| `config`           | Path to config file (`--config` option)                                                                                                                                                      | see [`@code-pushup/cli` docs](https://github.com/code-pushup/cli/tree/main/packages/cli#configuration) |
| `silent`           | Toggles if logs from Code PushUp CLI are printed                                                                                                                                             | `false`                                                                                                |
| `bin`              | Command for executing Code PushUp CLI                                                                                                                                                        | `npx --no-install code-pushup`                                                                         |
| `jobId`            | Differentiate PR comments (useful if multiple jobs run Code PushUp)                                                                                                                          | none                                                                                                   |

For example, this will run `code-pushup` commands in a non-root folder and
retain report artifacts for 30 days:

```yml
- uses: code-pushup/github-action@v0
  with:
    directory: website
    retention: 30
```

## Action outputs

Some outputs are set in case you want to add further steps to your workflow.

| Name          | Description                                                             |
| :------------ | :---------------------------------------------------------------------- |
| `artifact-id` | ID of uploaded report artifact (N/A in [monorepo mode](#monorepo-mode)) |
| `comment-id`  | ID of created/updated PR comment                                        |

Example of using step outputs:

```yml
- uses: code-pushup/github-action@v0
  id: code-pushup
- run: |
    echo "Comment ID is ${{ steps.code-pushup.outputs.comment-id }}"
    echo "Artifact ID is ${{ steps.code-pushup.outputs.artifact-id }}"
```

## Authentication

The GitHub Action supports multiple authentication methods to integrate with
your CI workflows.

### GitHub App authentication (recommended)

For the most seamless authentication experience, we recommend installing the
[Code PushUp GitHub App](https://github.com/apps/code-pushup-staging).

The action automatically detects the GitHub App installation and uses it for
enhanced API access. This provides better security through short-lived tokens
and requires zero configuration on your part.

### Default authentication

If the GitHub App is not installed, the action automatically uses the default
`GITHUB_TOKEN` provided by GitHub Actions, which works perfectly for most use
cases.

### Custom authentication

You can provide your own token if you have specific requirements:

```yml
- uses: code-pushup/github-action@v0
  with:
    token: ${{ secrets.YOUR_PAT }}
```

## Monorepo mode

By default, the GitHub Action assumes your repository is a standalone project.
But it also supports monorepo setups where reports are collected and compared
individually per project. All project comparisons are then combined into a
single PR comment.

Use the `monorepo` input to active monorepo mode:

```yml
- uses: code-pushup/github-action@v0
  with:
    monorepo: true
```

The GitHub Action will try to detect which monorepo tool you're using from the
file system. The following tools are supported out of the box:

- [Nx](https://nx.dev/)
- [Turborepo](https://turbo.build/)
- [Yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/)
- [PNPM workspace](https://pnpm.io/workspaces)
- [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces)

If you're using one of these tools, you can also skip auto-detection by setting
`monorepo` input to `nx`, `turbo`, `yarn`, `pnpm` or `npm`.

If none of these tools are detected, then the fallback is to run Code PushUp in
all folders which have a `package.json` file. If that's not what you want, then
you can also configure folder patterns using the optional `projects` input
(comma-separated globs):

```yml
- uses: code-pushup/github-action@v0
  with:
    monorepo: true
    projects: 'frontend, backend/*'
```

Based on which monorepo tool is used, Code PushUp CLI commands will be executed
using a `package.json` script, Nx target, Turbo task, or binary executable (as
fallback). By default, these are expected to be called `code-pushup`, but you
can override the name using the optional `task` input:

```yml
- uses: code-pushup/github-action@v0
  with:
    monorepo: nx
    task: analyze # custom Nx target
```

In Nx monorepos, projects are listed using
`nx show projects --with-target=code-pushup` by default. The `nxProjectsFilter`
input sets the CLI arguments forwarded to
[`nx show projects`](https://nx.dev/nx-api/nx/documents/show#projects) (default
is `--with-target={task}`, with `{task}` being replaced by the `task` input
value). This gives a lot of flexibility in customizing which Nx projects should
be run:

```yml
- uses: code-pushup/github-action@v0
  with:
    monorepo: nx
    nxProjectsFilter:
      '--with-target=code-pushup --affected --projects=apps/* exclude=*-e2e'
```

### Parallel tasks

By default, tasks are run sequentially for each project in the monorepo. The
`parallel` input enables parallel execution for tools which support it (Nx,
Turborepo, PNPM, Yarn 2+).

```yml
- uses: code-pushup/github-action@v0
  with:
    monorepo: true
    parallel: true
```

The maximum number of concurrent tasks can be set by passing in a number instead
of a boolean:

```yml
- uses: code-pushup/github-action@v0
  with:
    monorepo: true
    parallel: 3
```
