# Frontend Project Template — Documentation

This `docs/` directory captures the structure, conventions, and rules used in
this project so they can be **reused as a starting template for future
frontend projects**. Everything here is written in generalized terms — swap
the example domain names (`story`, `auth`, `feed`, `profile`, `user`) for
whatever your new project's domains are, and the rules still apply.

## How to use this template

1. Read [`01-tech-stack.md`](./01-tech-stack.md) and decide whether you're
   keeping the same stack (recommended for consistency across projects).
2. Scaffold the folder skeleton from [`02-project-structure.md`](./02-project-structure.md).
3. Apply the naming rules in [`03-naming-conventions.md`](./03-naming-conventions.md)
   from the very first file you create — retrofitting naming later is expensive.
4. Follow the layering rules in [`04-architecture-and-data-flow.md`](./04-architecture-and-data-flow.md)
   so every new feature slots into the same Page → Container → Component /
   Hook → Service → API pipeline.
5. Use [`05-state-and-data-fetching.md`](./05-state-and-data-fetching.md) and
   [`06-styling-guidelines.md`](./06-styling-guidelines.md) as the default
   answer to "how do I fetch data" / "how do I style this."
6. Use [`07-routing-and-auth.md`](./07-routing-and-auth.md) when wiring routes
   and access control.
7. Use [`08-tooling-and-config.md`](./08-tooling-and-config.md) to configure
   linting, TypeScript, env vars, and deployment the same way.
8. When starting a brand new repo, work through
   [`09-new-project-checklist.md`](./09-new-project-checklist.md) top to bottom.

## Index

| Doc | Covers |
|---|---|
| [01-tech-stack.md](./01-tech-stack.md) | Core libraries and why they're the default choice |
| [02-project-structure.md](./02-project-structure.md) | Directory layout and the purpose of each folder |
| [03-naming-conventions.md](./03-naming-conventions.md) | File, component, hook, and variable naming rules |
| [04-architecture-and-data-flow.md](./04-architecture-and-data-flow.md) | Layering rules: who is allowed to call whom |
| [05-state-and-data-fetching.md](./05-state-and-data-fetching.md) | React Query patterns, form/validation hook shape |
| [06-styling-guidelines.md](./06-styling-guidelines.md) | Tailwind + CSS Modules rules |
| [07-routing-and-auth.md](./07-routing-and-auth.md) | Route table structure and access-control guards |
| [08-tooling-and-config.md](./08-tooling-and-config.md) | ESLint, TypeScript, env vars, deployment |
| [09-new-project-checklist.md](./09-new-project-checklist.md) | Step-by-step bootstrap checklist for a new repo |

## Core philosophy (the one thing to keep if nothing else)

- **One-way dependency chain:** `pages → containers → hooks → services → api client`.
  Components render; hooks hold state and fetch data; services are the only
  code allowed to talk to the network. Never skip a layer.
- **Colocate what changes together:** a component's styles, a container's
  styles, and a feature's hooks live next to (or in a folder named after) the
  thing they support — not in one giant shared file.
- **Every folder that exports more than one thing gets an `index.ts` barrel.**
  Consumers import from the folder, not the file.
- **Types are defined once**, in `interfaces/`, and reused everywhere —
  never redeclare the same shape inline in a component and a service.
