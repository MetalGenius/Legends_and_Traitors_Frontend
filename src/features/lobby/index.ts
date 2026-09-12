/**
 * Public API of the `lobby` feature.
 *
 * Everything other layers are allowed to import lives here. Anything not
 * exported from this file is private to the feature - deep imports such as
 * `@features/lobby/components/Foo` are a convention violation.
 *
 * Export nothing until there is something real to export; an empty module
 * keeps the boundary visible without pretending the feature exists yet.
 */
export { useCreateLobby } from './hooks/useCreateLobby'
