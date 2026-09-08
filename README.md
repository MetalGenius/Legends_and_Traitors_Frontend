# Legends & Traitors — Frontend

React + TypeScript client for **Legends & Traitors**, a browser-based social
deduction game. Built with Vite and organized by feature rather than by file
type: everything about chat lives in one directory, everything about the lobby
in another.

> **Status: scaffold.** The structure, tooling, and boundaries are in place and
> verified; no gameplay code exists yet. There is no router, state library, or
> data-fetching library — those land with the first real feature. The four
> feature folders (`auth`, `lobby`, `game`, `chat`) are a guess at the domain,
> so rename or delete them freely.

## Stack

| | |
|---|---|
| UI | React 19.2 |
| Language | TypeScript 6.0 (strict, `erasableSyntaxOnly`, `verbatimModuleSyntax`) |
| Build | Vite 8.2 |
| Lint | oxlint 1.79 |

## Getting started

Requires **Node.js 20.19+ or 22.12+** (Vite 8).

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script | Does |
|---|---|
| `npm run dev` | Dev server with HMR — no bundling, native ESM |
| `npm run build` | Type-check (`tsc -b`) then bundle to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run oxlint |

`npm run build` is the real gate: Vite strips types without checking them, so
`tsc -b` is what actually enforces TypeScript.

## Project structure

```
src/
├── app/                # composition root - the only layer that knows every feature
│   ├── providers/      # provider stack, composed in AppProviders
│   ├── router/         # route table; lazy-imports feature entry points
│   ├── layouts/        # shell layouts (app shell, auth shell, game shell)
│   ├── App.tsx
│   └── index.ts
├── features/           # vertical slices - see features/README.md
│   ├── auth/
│   ├── lobby/
│   ├── game/
│   └── chat/
├── shared/             # cross-cutting, feature-agnostic code
│   ├── components/ui/  # design-system primitives
│   ├── hooks/
│   ├── lib/            # third-party client wrappers (http, socket, storage)
│   ├── utils/          # pure helpers
│   ├── types/          # global types
│   └── config/         # env parsing, constants
├── assets/             # images, fonts, audio
├── styles/             # global.css - reset and theme tokens
└── main.tsx
```

Empty folders are held open by `.gitkeep` files — delete each one when real code
lands there.

## The rules

Dependencies run **one way**: `app → features → shared`.

```
app/        composition root — knows every feature
  ↓
features/   vertical slices — auth · lobby · game · chat
  ↓
shared/     feature-agnostic — ui · lib · hooks · utils
```

1. **`shared/` never imports `features/`; a feature never imports `app/`.** If a
   feature seems to need something from `app/`, it is really shared
   infrastructure and belongs in `shared/`.
2. **Cross-feature access goes through the barrel — or, better, doesn't happen.**
   `@features/auth`, never `@features/auth/hooks/useSession`. The stronger move
   is to compose both features in `app/` and pass what's needed down as props.
3. **Promote on the second consumer.** One feature uses it, it stays in the
   feature. Two, it moves to `shared/`. Not before.
4. **Delete-ability is the test.** Removing a feature folder and its route entry
   should break nothing but that route.

Each feature has the same internal shape (`api/`, `components/`, `hooks/`,
`stores/`, `types/`, `utils/`, `index.ts`) and exposes exactly one public
surface: its `index.ts`.

**Read [`src/features/README.md`](src/features/README.md) before adding a
feature.** It has the full rules and a "where does this go?" table.

Note that oxlint has no import-boundary rule, so these are enforced by review.
Swapping in ESLint with `eslint-plugin-boundaries` is the fix if you want them
machine-enforced.

## Path aliases

| Alias | Resolves to |
|---|---|
| `@app` | `src/app/index.ts` (the barrel — this is what `import { App } from '@app'` uses) |
| `@app/*` | `src/app/` |
| `@features/*` | `src/features/` |
| `@shared/*` | `src/shared/` |
| `@assets/*` | `src/assets/` |
| `@styles/*` | `src/styles/` |

Aliases are declared twice — `paths` in `tsconfig.app.json` (for the type checker
and editor) and `resolve.alias` in `vite.config.ts` (for the bundler).
**Add new aliases to both**; a mismatch either type-checks fine and fails at
build, or runs fine and fails `tsc`.

There is no `baseUrl` — TypeScript 6 deprecates it (TS5101), so paths are written
relative to the tsconfig with `./` prefixes. Most tutorials still show the old
form.

## Assets

If code imports it, put it in `src/assets/` — Vite fingerprints and cache-busts
it. If the URL must stay predictable (`favicon.svg`, `robots.txt`), put it in
`public/`, which is copied verbatim.

## What's next

The first real feature will want:

- a **router** — React Router or TanStack Router, wired into `app/router/`
- a **server-state library** — TanStack Query, provider added to `AppProviders`
- an **HTTP client wrapper** in `shared/lib/`

---

For a file-by-file walkthrough — why there are three tsconfigs, what each flag
buys, how the alias system works — see [`info.md`](info.md).
