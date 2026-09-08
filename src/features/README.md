# Feature conventions

Code is grouped by **what it does for the player**, not by what kind of file it
is. A feature is a vertical slice: its UI, state, network calls, and types live
together and move together.

## Anatomy of a feature

```
features/<name>/
├── api/          # requests + query/mutation wrappers for this feature
├── components/   # components used only by this feature
├── hooks/        # feature-specific hooks
├── stores/       # feature-local state
├── types/        # types this feature owns
├── utils/        # helpers only this feature needs
└── index.ts      # PUBLIC API - the only file other layers may import from
```

Not every feature needs every folder. Delete the ones a feature does not use
rather than leaving them empty.

## The five rules

1. **A feature owns its stack.** UI, state, API calls, and types belong to the
   feature that uses them. The moment a second feature needs the same thing, it
   moves to `src/shared/` - it does not get imported sideways.

2. **Imports flow one way: `app → features → shared`.** `shared/` must never
   import from `features/`, and a feature must never import from `app/`. If a
   feature needs something from the app layer, that something is really shared
   infrastructure and belongs in `shared/`.

3. **Cross-feature imports go through the barrel, or not at all.** If `game`
   truly needs something from `auth`, import it from `@features/auth` - never
   `@features/auth/hooks/useSession`. Better still, compose both features in
   `src/app/` and pass what is needed down as props, so neither feature learns
   about the other.

4. **`index.ts` exports the smallest surface that works.** Usually the route
   entry component, plus the handful of hooks and types other layers genuinely
   consume. Everything else stays private. A barrel that re-exports the whole
   folder is the same as having no boundary.

5. **Delete-ability is the test.** Removing a feature folder and its route entry
   in `src/app/router/` should break nothing but that route. If deleting `chat`
   breaks `lobby`, the boundary was crossed somewhere - find it and move the
   shared piece into `shared/`.

## Where things go when you are unsure

| Question | Answer |
|---|---|
| Used by exactly one feature? | Inside that feature. |
| Used by two or more features? | `src/shared/` |
| A design-system primitive (Button, Modal, Card)? | `src/shared/components/ui/` |
| A wrapper around a third-party client (http, socket, storage)? | `src/shared/lib/` |
| Composition, routing, providers, layouts? | `src/app/` |
| Not sure yet? | Start inside the feature. Promoting to `shared/` later is cheap; untangling a premature abstraction is not. |
