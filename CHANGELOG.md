# jhonstart · CHANGELOG

## Unreleased

- **Front 26 closeout — `encodePairs`, and what fronts 27–32 consume.**
  - `encodePairs(pairs) -> string` is `decodePairs` reversed and ships for the
    same reason: `querystring.stringify` has no `slice` of its own, but it
    lives in the module `stripPrefix` kills, and a module `erlc` refuses takes
    its whole surface down with it. Every front downstream that rewrites a URL
    needs an encoder, and one encoder in the package is the argument
    `pairValue` already makes about decoders. No leading `?` — the caller adds
    it.
  - `AGENTS.md` gains § *What jhonstart fronts 27–32 consume from front 26* —
    the whole surface, the two call-site rules that only show at a distance,
    and the three things front 26 deliberately does **not** provide (a second
    matcher, the `ElementView` adapter, a `Link`).
  - The adapter rakun front 23's handoff assigns to "front 26" cannot be
    written here: `ElementView<El>` is rakun's type, jhonstart declares no
    dependency on rakun, and rakun's member is `targets: ["commonJS"]`, so
    adding one would red the very row front 26 is assigned to. It belongs to
    **front 28**, with the `dependencies` entry and the targets decision that
    entry forces. Recorded in `AGENTS.md`, not worked around.
  - Front 26's position on the `query` hole front 23 measured and left open is
    in the same section: the front **needs** the guarantee, a convention cannot
    close it, and the three things that would are all front 22's file. This
    library's `searchParams()` reads its own snapshot and never touches
    `PageContext`, so nothing here papers over it.
  - The core member measures **51/51 on both rows** (27/27 before front 26).
    All 24 router assertions RUN on the erlang row — none is type-checked-only
    and none is a commonJS-only claim. The CI table's earlier `9/9` was stale:
    it predates `elements.bp`.

- **The six navigation verbs (front 26, step 4).** `push`, `replace`, `back`,
  `forward`, `refresh` and `prefetch` — free functions over one dual-target
  cell, never methods: botopink records are immutable and there is no
  assignment to a `self` field anywhere in this tree, so the record stays a
  read-only snapshot and navigation is a call against host state. `-> i32` is
  the ecosystem's shape for a host value nobody reads.
- **`lastNavigation()` is `pub`.** `push("/x")` on the erlang row *records* a
  307 for the dispatcher to write; a verb that records where nobody can look is
  a verb that does nothing, so the recorded `"<kind> <href>"` is readable. Both
  halves record, so the same three assertions run on both rows and "callable
  on the erlang target without a host stub crash" is an execution, not a
  compile.
- The front's spec says `__jhNavigate` is the only dual-target cell in the
  file. It is not, and the reason is step 2's measurement rather than a
  preference: every cell here carries both targets because an erlang-only cell
  reds the commonJS row at its call site.
- 3 further assertions, green on both rows (22 in the suite).

- **The six route hooks (front 26, step 3).** `router`, `pathname`, `params`,
  `searchParams`, `selectedLayoutSegment` and `selectedLayoutSegments`, each
  `pub fn … -> @Context<Element, T>` and each one read of `snapshot()` and
  nothing else — a hook that did work of its own would be a second place for
  the route to be interpreted. Nouns, never `useRouter`, never the doubled
  `use usePathname()`.
- **Measured: `use` is not decoration for an array-valued hook.** A hook called
  without `use` keeps its `@Context<Element, T>` type. That type is transparent
  to a property or a method (`ps.length`, `segs.join("/")`, `r.param("slug")`)
  and **not** to a typed parameter — `pairValue(params(), "slug")` is
  `type mismatch: expected array, got Context`, and binding through a `val`
  does not change it. Only `use` strips the capability: inside a `#[@context]`
  body `pairValue(use params(), …)` is exactly the array, and
  `test/router_test.bp`'s `ActiveNav` asserts the rendered markup to prove it.
  The front's spec says a hook "called WITHOUT `use` also type-checks and
  returns the [value]"; that holds for the two `string` hooks and not for the
  three array-valued ones.

- **The route snapshot has a host half on both rows (front 26, step 2).**
  `snapshot()` reads five cells and builds `RouterState`; each maps one-to-one
  onto a key of rakun front 23's payload envelope (`p`/`m`/`q`/`r`, plus the
  per-layout `selected`, which has no payload key). The two pair-shaped values
  travel querystring-encoded — no JSON, no record serialization, nothing that
  has to agree between an Erlang term and a JS object.
  - `src/router_runtime.mjs` (a module-global) and
    `src/sidecars/jhonstart_router.erl` (the calling process's dictionary) are
    the two halves, cell for cell, so `test/router_test.bp` is ONE set of
    assertions run on both rows. A request is a process on the BEAM, so the
    snapshot dies with it and two concurrent renders cannot see each other's
    route. Neither half parses or matches anything: the matcher and the route
    table are rakun front 22's, compiled once.
  - An unfilled snapshot answers `""`/`[]`/`0` rather than raising — rendering
    a component outside a request is how this package's own tests render the
    server pass.
  - **Every cell carries both targets**, where the front's spec asks for the
    five reads to be `#[@External.Erlang]` only. Measured: an erlang-only cell
    reds the commonJS row at its *call site* (`` `__jhRoutePath` has no
    `#[@External.<Target>(…)]` for the node backend ``) the moment `snapshot()`
    calls it, and this module is compiled on both rows of the core member. A
    declared and never-called cell is fine — which is why `client_runtime.bp`'s
    node-only `clientRender` does not red the erlang row. The dual form is also
    what the front's own mechanism needs: the client rebuilds the snapshot from
    the payload on every transition.
  - **`fill(path, params, search, pattern, selected)` is `pub` surface**, and
    the front's spec has no such function — it has rakun front 22 writing the
    request's process dictionary before dispatch. That cannot be how it works:
    jhonstart declares no dependency on rakun, rakun's member is
    `targets: ["commonJS"]` and has no BEAM row at all, and a server reaching
    into another library's process-dictionary keys would be coupled to them
    forever. So the seam is here. It is also what makes `snapshot()` assertable
    — the front's test plan asks for "`snapshot()` over a stubbed host module",
    and a stub you cannot seed is a stub you cannot assert.
  - 5 further assertions, green on both rows (16 in the suite).

- **The router is a compiled module (front 26 of 1.0.10-beta, step 1).**
  `src/router.d.bp` is deleted and `src/router.bp` takes its place in the build
  tree. The declaration file gave two reasons nothing in it was promotable:
  `Element` had no attribute slot, and client navigation lives in a host
  runtime. The first closed with `element.bp`'s `attrs`; the second was never a
  reason to keep the *record* host-bound.
  - `type RouterState(path, params, search, pattern, selected)` — a plain
    five-field record, **not** a behavior. A behavior with `val` members has no
    verified implementor anywhere in this tree, and the concrete record is what
    the `use` capability has to yield anyway. Its accessors are `param(name)`,
    `searchParam(name)`, `segments()` and `segment()`, and every one answers a
    plain `string`/`Array<string>` — `""` for an absent key, `""` for an
    out-of-range layout depth, never `?string`.
  - Field names and method names are **disjoint** (`params` the field,
    `param(name)` the method), so a field read never shadows a method.
  - `segments` is **derived** from `pattern` and never transported. The bracket
    spelling is kept: `"/blog/[slug]"` → `["blog", "[slug]"]`.
  - `pairValue(pairs, name)` is the package's **one** pair-list decoder, `pub`,
    answering the FIRST match of a duplicated key. Fronts 28 and 32 import it
    from here rather than each growing a copy.
  - `pairValue`, `patternSegments` and `segmentAt` are loops over typed
    parameters rather than `find(…)`/`at(i)` + `unwrapOr`: a value that came
    back through the optional binder loses its type on the erlang row, the
    measurement behind rakun's `paramOf(m, name)` and `chunkAt(page, i)`.
  - `test/router_test.bp` — 11 assertions, green on **both** rows.
- **`decodePairs` instead of `std/querystring.parse`, with the defect handed
  back.** `libs/std/src/querystring.bp:22` writes `query.slice(1,
  query.length)`. Reached through `from "std"` that module emits a call to a
  bare local `slice/3` on the erlang row and never defines it: `erlc` refuses it
  with `undefined_function {slice,3}`, the test runner's sibling loader skips a
  module that does not compile, and the first `querystring.parse` call dies
  `{error,undef}` — pinned to the caller, not to the module that failed. The
  same `s.slice(a, b)` in a project module lowers correctly to an emitted
  `string_slice/3`, so the loss is specific to a `libs/std` module compiled as a
  dependency (`String.slice` is a primitive-interface `default fn`, and
  `collectPreludeInstanceDefaults` is guarded by `comptime_module != null`).
  erlang is front 26's assigned target, so `router.bp` carries `decodePairs` —
  querystring's documented behaviour, spelled in a project module, collapsing
  back to `querystring.parse` the moment the shim lands.
  `repro/erlang-std-slice-shim/` is the jhonstart-free package.
- **`src/root.bp` gains `pub mod router;` and `botopink.json`'s `files` swaps
  `router.d.bp` for `router.bp`** — the two lines front 94's spec already
  reserves for front 26, appended in front-number order, no other line touched.
  Without them `src/router.bp` is *module not reached by any `mod` path — not
  compiled* and `test/router_test.bp`'s import is refused, so the front has
  nothing to be green about.

- **`jhonstart-counter` and `jhonstart-todo` on the erlang row — one library
  error fixed, one compiler defect handed back.** The compiler's new
  `scripts/restricted-targets.txt` runs every cell a member's `targets`
  excludes and pinned both examples at `build`, the token for *nothing
  compiled, so no test ran*. Reproduced, and they are **two unrelated
  defects**, not the single cross-module one `AGENTS.md` claimed:
  - `function print/1 undefined`, in both, was **ours**: `main` wrote
    `print(…)` where the language reference only ever shows `@print(…)`. The
    bare call type-checks on every target and only commonJS lowers it (erlang
    emits an undefined local, beam an `unresolved_call`, wasm a trap), which
    is why the sibling `jhonstart-html` — already written with `@print` — was
    green on erlang all along. Fixed in both examples and in `docs.md`'s
    quickstart. It was never a test-mode problem: `botopink run --target
    erlang` failed the same way, and `botopink build --target erlang` exited 0
    only because a build transpiles without invoking `erlc`.
  - `function set/2 undefined`, in `jhonstart-counter` only, is **not ours**
    and is left standing: calling a record's function-typed field (`c.set(5)`
    on `State<T>`, gap G1) lowers correctly inside the declaring module and to
    a bare undefined local across a module boundary — which every consumer of
    `jhonstart/hooks` is. Handed to `00 · 02-erlang` as a self-contained
    jhonstart-free package under the new `repro/` directory, with the two
    collection sites in `codegen/erlang.zig` named. Working around it in the
    example would only have hidden it.

  So `jhonstart-todo` is now **3/3 on erlang** and `jhonstart-counter` still
  does not compile there. Neither `targets` array was widened — the ledger
  measures what a restriction hides, and lifting one is its own decision.

- **The element surface, step 5 — the shared files and the docs.** `docs.md`
  gains the constructor table, the three names that could not be the obvious
  one (`htmlTag`, `timeTag`, `main`) with their reasons and the `main`
  caveat, the consumer import a template resolution needs, and the two things
  the surface deliberately does not do (escape, and be void-aware in
  `renderToString`). `AGENTS.md`'s "the `Element` model has no **attribute**
  slot" line was stale — `attrs` landed — and is corrected in both the
  workspace and the `src/` index; `elements.bp` and `test/elements_test.bp`
  join the tree diagram and the module table. The whole front: 42 public
  functions (38 tag constructors, `el`, `voidEl`, `isVoidTag`,
  `isRawTextTag`), 15 inline `test {}` blocks plus 3 in the flat suite,
  **27/27 on commonJS and 27/27 on erlang** from a 9/9 baseline on each, and
  not one line changed in `element.bp`, `hooks.bp` or `html.bp`.
- **The element surface, step 4 — `modules/jhonstart/test/elements_test.bp`.**
  The `html """…"""` DSL resolves a lowercase tag to a bare `tag(...)` call in
  the **caller's** scope, so the only honest resolution test is one written
  from a consumer's position: the flat suite, next to `test/html_test.bp`,
  whose bare import is exactly that scope. Three blocks: a single-root
  template over an `elements.bp` tag renders identically to the equivalent
  constructor call; a template mixing an `element.bp` tag with an
  `elements.bp` tag resolves both; a `[class]={c}` bracket-prop reaches
  `attrs` on an `elements.bp` tag. 27/27 on commonJS and on erlang.
- **Known wart — `link/2` draws an erlc warning.** The erlang backend emits
  `-compile({no_auto_import,[...]})` only for a user function whose name AND
  arity are in the compiler's BIF catalog, and that catalog
  (`libs/std/src/erlang.bp`) lists `link/1` only. OTP 26 added
  `erlang:link/2`, so `elements:link/2` compiles with *ambiguous call of
  overridden auto-imported BIF link/2* on OTP 26+. It is a warning, not an
  error — the local definition wins and the erlang row is green — and the
  durable fix is one `link/2` entry in the compiler's catalog, which is not
  this repository.
- **The element surface, step 3 — the six void constructors**: `input`, `img`,
  `meta`, `link`, `br`, `hr`. They keep the uniform two-parameter shape and
  drop the children they are handed, through `voidEl`; the one-parameter
  `input(attrs:)` that would make children an arity error was rejected as a
  second convention, unreachable from the `html """…"""` DSL's call shape. A test
  asserts the drop. `link` is an Erlang auto-imported BIF at arity 1 and
  `link/2` here clears it — the erlang row proves it. `renderToString` is
  `element.bp`'s frozen in-repo test renderer and is **not** void-aware, so
  `renderToString(input([], attrs: []))` is `<input></input>`; the tests spell
  that wrong answer out as a literal, so that the day `element.bp` unfreezes
  the failing assertions point straight at the lines to change. The render
  that ships reads `isVoidTag`. 4 further inline `test {}` blocks, 24/24 on
  commonJS and on erlang.
- **The element surface, step 2 — the thirty-two non-void constructors.**
  Sectioning and flow (`a`, `nav`, `section`, `article`, `header`, `footer`,
  `main`, `aside`), headings and text-level (`h2`–`h6`, `label`, `timeTag`),
  forms (`form`, `button`, `select`, `option`, `textarea`), tables (`table`,
  `thead`, `tbody`, `tr`, `th`, `td`) and document (`htmlTag`, `head`, `body`,
  `title`, `script`, `style`). Each declaration is `element.bp`'s with the name
  and the tag string changed and nothing else — same parameter names, same
  order, same types, same declared default — and each body is one `el(...)`
  call. Three names could not be the obvious one: `htmlTag` (the package
  already exports the `html """…"""` template fn), `timeTag` (`time` is a std
  module a consumer may import in the same file) and, unchanged, `main` —
  which carries the caveat that a module declaring `fn main()` must not also
  import `main`, since a package import alias parses and is then ignored.
  Attribute order is the array order, and attribute values are verbatim; both
  are asserted. 7 further inline `test {}` blocks, 20/20 on commonJS and on
  erlang.
- **The element surface — `modules/jhonstart/src/elements.bp`** (1.0.10-beta
  front 94), step 1: the two builders every constructor in the file goes
  through, `el(tag, children, attrs)` and `voidEl(tag, attrs)` (which stores no
  children), plus the two predicates a void-aware renderer consults —
  `isVoidTag` (the HTML spec's fourteen: `area`, `base`, `br`, `col`, `embed`,
  `hr`, `img`, `input`, `link`, `meta`, `param`, `source`, `track`, `wbr`) and
  `isRawTextTag` (`script`, `style` — `title` and `textarea` are *escapable*
  raw text and are not in the set). `el` doubles as the public escape hatch for
  a tag the named surface does not carry. Attribute values are stored verbatim;
  escaping belongs to the renderer. `pub mod elements;` joins `src/root.bp` and
  `"elements.bp"` the member manifest's `files`. Nothing in `element.bp`,
  `hooks.bp` or `html.bp` was touched — all three are frozen for the milestone.
  4 inline `test {}` blocks, green on commonJS and on erlang (13/13 each, from
  a 9/9 baseline).
- **The umbrella is a workspace; the core lives in `modules/jhonstart/`**
  (1.0.10-beta front `02-packaging` step 2, decisions 75 + 76). The root
  `botopink.json` keeps only `name`, `version`, `description`,
  `targets ["commonJS", "erlang"]` and `"workspaces": ["modules/*", "examples/*"]` —
  `src`, `entry`, `files` and `dependencies` are located errors there — so it
  compiles nothing, ships nothing and answers no import; `botopink build/check/run/test`
  at the root refuses with the member list (`jhonstart, jhonstart-counter,
  jhonstart-html, jhonstart-todo`). `src/**` and `test/**` moved with `git mv`
  to `modules/jhonstart/`, whose manifest carries `name jhonstart`, `entry root.bp`
  and a `files` list that now begins with `root.bp`; `from "jhonstart"` resolves
  to that member. No source file was edited and nothing was reformatted.
  Measured either side of the move, against compiler `botopink-lang` feat
  `361d255d`: the core 9/9 on commonJS and 9/9 on erlang (3 element + 4 hooks +
  2 html), `jhonstart-counter` 4/4, `jhonstart-html` 7/7, `jhonstart-todo` 3/3,
  each building; `botopink test --target beam` is still "only the commonJS and
  erlang targets" (a runner skip).
- The three examples are **members**, depending on the core with
  `{ "jhonstart": { "workspace": true } }` in place of `{ "path": "../.." }`
  (which is now the *points at the workspace itself* refusal), each with `src`,
  `entry main.bp` and a one-line `description`. `jhonstart-counter` and
  `jhonstart-todo` restrict `targets` to `["commonJS"]`; their erlang cell is a
  pre-existing codegen red — an imported function called unqualified is emitted
  unqualified into the test escript (`main.erl:59: function print/1 undefined`,
  `main.erl:68: function set/2 undefined`), owned by `00 · 13-module-identity`
  (`codegen/crossModule.zig`). `jhonstart-html` declares no `targets` and
  inherits both, being 7/7 on each. `examples/jhonstart-app/` keeps **no**
  manifest and stays out: the `examples/*` glob skips a child without one,
  silently by design, and that sketch does not parse yet.
- `scripts/git-hooks/lib/runner-standalone.sh` is rakun's workspace-aware
  runner: when the root manifest carries `"workspaces"`, stage 2 runs
  `botopink test` inside **every** `modules/*/` member instead of over a root
  `src/` + `test/` that no longer exists. Stage 3 (the examples gate) is
  unchanged.
- **Known defect — the `.mjs` sidecar is resolved by name, not by the resolved
  dependency.** `shipMjsSidecars` (botopink-lang `modules/compiler-cli/src/cli/libs.zig`)
  asks `libDirByName` for the owning lib across the library roots rather than
  using the `{ "workspace": true }` dependency it already resolved, and a miss is
  **silent** — the build still exits 0 and only `node client.mjs` fails. Owner:
  front `00 · 10-cli-residuals`. Measured either side of the move by appending a
  marker line to the candidate `client_runtime.mjs` and grepping the built
  `out/` (every case exits 0): **before**, from a standalone checkout with no
  other `jhonstart` on the roots, `out/jhonstart/client_runtime.mjs` was **not**
  shipped — the root manifest was a package, so `rootsFrom` never added the
  directory itself and nothing on the roots was named `jhonstart`. **After**, it
  **is** shipped from `modules/jhonstart/src/` — the root manifest is a
  workspace, so the directory becomes a root and contributes its members — both
  standalone and at `repository/jhonstart/` (the shape this lands as on `feat`,
  where `addUnique` de-dups the same directory reached through two roots). The
  one case that still misses is a `.tasks/` worktree beside a main checkout that
  also declares the name `jhonstart`: two directories, one name →
  `resolveDuplicateNames` marks both *declared by two libraries* and
  `libDirByName` skips an entry carrying a problem. So the move **fixed** the
  sidecar, and the old `BOTOPINK_LIB_ROOTS` workaround — a real directory
  literally named `jhonstart` with a symlinked `src/` — is obsolete: the lookup
  is by manifest name since the front's step 1.
- `botopink format --check` is unchanged by the move and still red on the same
  files at their new paths: 6 would be reformatted
  (`modules/jhonstart/src/html.bp`, `modules/jhonstart/test/html_test.bp`,
  `examples/*/src/main.bp`, `examples/jhonstart-app/main.bp`) and 3 do not parse
  (`examples/jhonstart-app/app/{layout,page}.bp`, `app/posts/[id]/page.bp`). A
  packaging commit reformats nothing.
- **`use` activation after decision 88 (botopink-lang 1.0.10-beta front 19):**
  `use f(x)` lowers to `f(x)` on every backend and a body that activates a hook
  carries `#[@context]`. Every component and custom hook is annotated
  (`hooks.bp`'s `Counter`/`counter`, the counter and todo examples); hooks are
  nouns — `useCounter` → `counter`, `useRouter` → `router` (and its host
  symbol), `useToggle` → `toggle` — called as `use counter(…)`, bound under
  another name. `hooks.bp`'s header no longer claims the prefix lowers to
  React's `useState`. `router.d.bp` imports `Element`.
- **Client runtime.** `src/client_runtime.mjs` exports the five nouns with hook
  semantics (plus `render(component, commit)`) over jhonstart's own re-render
  loop; the client build resolves `jhonstart/hooks` to it. `src/client_runtime.bp`
  (`mod`, not consumer surface) carries the `clientRender` cell whose
  `./client_runtime.mjs` require makes `botopink build` ship the sidecar.
  `examples/jhonstart-counter/client.mjs` runs the built `Counter` under it on
  node and prints the re-renders after `set`.
- The three examples depend on jhonstart by `{ "path": "../.." }` (decision
  76), the checkout they live in — a `git` dependency resolved by name to
  `repository/jhonstart`, the main checkout, from inside a worktree.
  *(Superseded above: `../..` is the umbrella, so the form is now
  `{ "workspace": true }`.)*

- **1.0.3 surface** (botopink-lang front 12): `Element` and `State<T>` are
  `type Name(fields)`; `Router` / `Request` are `behavior`s whose bodiless members
  end with `;`; the hook shapes are labeled tuple types — `effect` yields `#()`,
  `ref` `#(current: T)`, `reducer` `#(state: S, dispatch: fn(action: A))`; the
  `html` lexer's tokens are tuples typed by `tokens`' written element type. Two
  compiler gaps are worked around with positional access: labels of a generic
  labeled return are lost when `T` is instantiated (the hooks test reads `r.0`),
  and label access on a lambda parameter is not rewritten in a template body
  (`t.0` … `t.6`). `botopink format` is not applied: it currently emits code that
  does not compile here.

- The examples gate no longer aborts silently on a `scripts/known-broken-examples.txt`
  holding only comments or blank lines: the runner reads the list with `awk`, whose
  "no entry" is not a failure under `set -euo pipefail`.

- `examples/jhonstart-counter`, `jhonstart-html` and `jhonstart-todo` build again:
  their element builder calls pass `attrs` explicitly — the `attrs = []`
  default is not applied by the compiler yet — and they leave
  `scripts/known-broken-examples.txt`.

- **MIT license.** `LICENSE` (`Copyright (c) 2026 Eric Fillipe and botopink
  contributors`) backs the README's License section, which now points at it.

- The gate builds the examples: after `botopink test`, the pre-commit hook
  and CI run `botopink build` in every `examples/*/` with a `botopink.json`;
  `scripts/known-broken-examples.txt` lists the ones allowed to fail, and a
  listed example that builds fails the gate.
- `examples/jonhstar` removed: a misspelled early expr-templates showcase with
  its own stale copy of the `html` template (`src/jhonstart.bp`), no
  dependency on jhonstart, not referenced by the README, and failing to
  build (`unbound variable 'html'`); `jhonstart-html` covers the same ground.
- The pre-commit hook is self-contained: the dead delegation to a meta
  workspace runner is gone, and `AGENTS.md` documents the install
  (`git config core.hooksPath scripts/git-hooks`) instead of a
  `scripts/install-hooks.sh` that exists in no repository.
- Promoted from workspace subdir to standalone repository under
  `botopink/jhonstart`. Tracked from `botopink/projects` as a git submodule on
  the `feat` branch.
- `Router` and `Request` read their fields through zero-argument methods
  (`router.pathname()`, `req.params()`, `req.query()`): `get` is no longer a
  keyword, so the `get name(self: Self)` accessors did not parse. Their host
  hooks are `pub declare fn`, so both declaration files parse whole.

## 0.0.1 — v0.beta.8

- `html """…"""` DSL implemented in real `.bp` (stack-based parser, dual lowering
  via `@ExprCustom<Element>`).
- Component model: function returning `Element`, real builder chain.
- Hook family in real `.bp`: `useState`, `useEffect`, `useMemo`, `useRef`,
  `useReducer`.
- Server components: `*fn … -> @Future<Element>` skeleton (the `*fn`
  carrier was migrated to the `#[@future]` annotation in v0.beta.12 and
  the legacy prefix removed in v0.beta.19).
- Synchronous SSR (`renderToString`).

## 0.0.0 — v0.beta.5

- Initial spec and framework scaffold (the port).
