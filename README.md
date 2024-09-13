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

| Name          | Description                                                                       | Default                                                                                                |
| :------------ | :-------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| `monorepo`    | Enables [monorepo mode](#monorepo-mode)                                           | `false`                                                                                                |
| `projects`    | Custom projects configuration for [monorepo mode](#monorepo-mode)                 | none                                                                                                   |
| `task`        | Name of command to run Code PushUp per project in [monorepo mode](#monorepo-mode) | `code-pushup`                                                                                          |
| `token`       | GitHub token for authorizing GitHub API requests                                  | `${{ github.token }}`                                                                                  |
| `annotations` | Toggles if annotations should be created for relevant Code PushUp issues          | `true`                                                                                                 |
| `artifacts`   | Toggles if artifacts will we uploaded/downloaded                                  | `true`                                                                                                 |
| `retention`   | Artifact retention period in days                                                 | from repository settings                                                                               |
| `directory`   | Directory in which `code-pushup` should run                                       | `process.cwd()`                                                                                        |
| `config`      | Path to config file (`--config` option)                                           | see [`@code-pushup/cli` docs](https://github.com/code-pushup/cli/tree/main/packages/cli#configuration) |
| `silent`      | Toggles if logs from Code PushUp CLI are printed                                  | `false`                                                                                                |
| `bin`         | Command for executing Code PushUp CLI                                             | `npx --no-install code-pushup`                                                                         |

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
