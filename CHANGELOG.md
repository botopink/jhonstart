# jhonstart · CHANGELOG

## Unreleased

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
