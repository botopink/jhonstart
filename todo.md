# front/94-elements — jhonstart front 94: the element surface

Worktree: .tasks/jhonstart-elements, branch front/94-elements (from jhonstart feat e068998, a workspace).
Spec: specs/1.0.10-beta/04-jhonstart/94-jhonstart-element-surface/README.md — read it in full.

## Path translation — the spec predates the workspace migration
The spec's `Owns:` says `repository/jhonstart/src/elements.bp`. jhonstart is now a **workspace**:
the core is `modules/jhonstart/`, so the owned paths are `modules/jhonstart/src/elements.bp`,
`modules/jhonstart/test/elements_test.bp`, `modules/jhonstart/src/root.bp` and
`modules/jhonstart/botopink.json` (its `files` list). The three example members and the
manifest-less `examples/jhonstart-app/` are NOT yours.

## Frozen — the spec freezes these for the whole milestone
`src/element.bp` (the `Element` record and its eight constructors), `src/hooks.bp`, `src/html.bp`.
Every other `src/*.bp` belongs to fronts 26–32/67. This front ADDS `elements.bp` beside them.

## Binding from the README
- every constructor produces the identical `Element` on **both** targets (server render by rakun 23,
  hydration by onze 68) — a cell per target, not a single-target claim
- void elements are the HTML spec's list, not a guess (`<https://html.spec.whatwg.org/multipage/syntax.html#void-elements>`)
- the `html """…"""` DSL resolves a lowercase tag to a bare `tag(...)` call in the CALLER's scope —
  it consumes this surface, it does not provide one; so a tag the DSL can write must exist as a
  `pub fn` a consumer can import

## Steps
- [ ] 0 — baseline measured: `botopink test` in `modules/jhonstart` on commonJS and erlang
      (9/9 each at HEAD), and the eight existing constructors re-read in `src/element.bp`
- [ ] 1..N — the README's steps in order; commit each one that reaches green
- [ ] the ten dependent fronts' needs are covered (24: form/input/button · 67: + label/select/textarea
      · 26/27/29/30/53: nav/section/article/header/main/h2 · 31: html/body/head) — check against the
      README's own table, do not re-derive it from memory
- [ ] `root.bp` gains `pub mod elements;` and `botopink.json` `files` gains the module
- [ ] AGENTS.md + CHANGELOG.md + docs.md in the same commit; gate green; push front/94-elements
