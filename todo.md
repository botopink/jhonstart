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

- [x] 0 — baseline measured: `botopink test` in `modules/jhonstart`, **9/9 commonJS, 9/9 erlang**
      at `e068998` (3 element + 4 hooks + 2 html_test); the eight existing constructors re-read
- [x] 1 — `el`, `voidEl`, `isVoidTag`, `isRawTextTag` + 4 inline tests · 13/13 on each target
      (`pub mod elements;` + the manifest `files` entry landed HERE, not in step 5: an
      unregistered module is not compiled and its `test {}` blocks never run)
- [x] 2 — the thirty-two non-void constructors + 7 inline tests · 20/20 on each target
- [x] 3 — the six void constructors + 4 inline tests · 24/24 on each target
- [x] 4 — `test/elements_test.bp`, the flat suite, 3 blocks · 27/27 on each target
- [x] 5 — `root.bp`, `botopink.json`, `docs.md`, `AGENTS.md` (workspace + `src/`), `CHANGELOG.md`
- [x] the ten dependent fronts' needs, checked against the README's own table:
      24 form/input/button ✓ · 67 + label/select/textarea ✓ · 26/27/29/30/53 nav/section/article/
      header/main/h2 ✓ · 31 htmlTag/body/head ✓ · 32 meta/link/title ✓ · 53 timeTag ✓
- [x] the front's two spec example files (`specs/.../94-.../examples/{form,document-shell}-example.bp`)
      were run against this surface as a throwaway flat-suite check: 8/8 and 5/5, on both targets,
      unmodified apart from the import line. They live in the meta repo and were not edited.

## Not this front (meta-repo `specs/`, which this worktree must not touch)

- fronts 24/26/27/28/29/30/31/32/53/67 deleting their local constructors and importing here
- front 31's `## Blocked` entry for `global-error.bp`
- the `language-gaps.md` row "New jhonstart element constructors"
- front 23's `renderNode` calling `isVoidTag`/`isRawTextTag`
- unfreezing `element.bp`'s `renderToString` so it stops closing a void element
- `zig build test-libs -- --lib jhonstart` (the ecosystem gate runs in `repository/botopink-lang`,
  which other threads own; the per-member `botopink test` on both targets is what was measured)

## Found while building

- **`link/2` draws an erlc warning on OTP 26+.** The erlang backend emits
  `-compile({no_auto_import,[...]})` only for a user fn whose name AND arity are in the compiler's
  BIF catalog (`libs/std/src/erlang.bp`), which lists `link/1` only — but OTP 26 added
  `erlang:link/2`, so the front README's arity argument does not hold. Warning, not error: the
  local definition wins and the erlang row is green. The durable fix is one catalog entry in
  botopink-lang.
