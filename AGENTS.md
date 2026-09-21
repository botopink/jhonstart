# jhonstart

> Path: `repository/jhonstart/`
> Parent (workspace): [`../AGENTS.md`](../AGENTS.md) · Sibling (core): [`../botopink-lang/AGENTS.md`](../botopink-lang/AGENTS.md)
> Spec: [`../../tasks/v0.beta.7/specs/jhonstart.md`](../../tasks/v0.beta.7/specs/jhonstart.md)
> (port), originally [`../../tasks/v0.beta.5/specs/jhonstart.md`](../../tasks/v0.beta.5/specs/jhonstart.md)

botopink's **React/Next-style** UI framework, written *in* botopink on the
language's own primitives — **no jhonstart-specific compiler features**.
Components are `#[@context]` functions returning `Element`; hooks are nouns
(`state`, `router` — never `useState`) returning the `@Context<Element, _>`
capability, activated by the `use` keyword (decision 88 of 1.0.10-beta:
`use f(x)` lowers to `f(x)` on every backend); server components are
`#[@future] fn … -> @Future<Element>` (effect annotation, post-v0.beta.12;
`*fn` was the legacy carrier and the parser now rejects it); the JSX-like
`html """…"""` DSL reuses `expr-templates` (`@Expr<Element>`), expanding markup
to the builder pipeline at comptime. The compiler is **unaware** of jhonstart (hard rule + `grep -riE
"rakun|jhonstart" modules/compiler-core/src` gate); the framework is a pure
client, reached with `from "jhonstart"`, never embedded.

The UI **core + hooks + the element surface + the `html` markup DSL are real
botopink** (`modules/jhonstart/src/{element,hooks,elements,html}.bp` — all in
the core member's `botopink.json` compiled set): an
`Element` tree, builders, a synchronous SSR renderer, the hook family, and the
`html """…"""` comptime expander — no host intrinsics, no async. Only the
host-bound surface (client navigation, the Http server context) stays as `.d.bp`
declarations, each with an explicit "STILL GATED" note. Nothing is embedded into
the prelude.

## Tree

`repository/jhonstart/botopink.json` is a **workspace**, not a package (decision
75 of 1.0.10-beta): it carries `name`, `version`, `description`, `targets` and
`"workspaces": ["modules/*", "examples/*"]`, and `src` / `entry` / `files` /
`dependencies` are located errors there. It compiles nothing, ships nothing and
answers no import — `botopink build/check/run/test` at the root is the refusal
that names the members. The library is the member `modules/jhonstart/`, which
is what `from "jhonstart"` resolves to.

```text
repository/jhonstart/
├── AGENTS.md          ← you are here
├── botopink.json      ← WORKSPACE: name, version, description, targets [commonJS, erlang], workspaces [modules/*, examples/*]
├── docs.md            ← user-facing reference
├── modules/
│   └── jhonstart/     ← CORE — what `from "jhonstart"` gives a consumer
│       ├── botopink.json  ← name jhonstart, src src/, entry root.bp, target commonJS, files [root.bp, element.bp, hooks.bp, html.bp, router.bp, elements.bp, client_runtime.bp, server.d.bp]
│       ├── src/
│       │   ├── AGENTS.md
│       │   ├── root.bp        ← module-tree root: `pub mod element; pub mod hooks; pub mod html; pub mod router; pub mod elements; mod client_runtime;`
│       │   ├── element.bp     ← COMPILED CORE: type Element + builders (Children) + renderToString + test {}
│       │   ├── hooks.bp       ← COMPILED: State<T> + state/effect/memo/ref/reducer (@Context<Element,_>, pure server-pass bodies) + test {} (imports `Element`)
│       │   ├── html.bp        ← COMPILED: the JSX-like `html """…"""` markup DSL (lexer → tokens → stack parser → dual lowering → `q.custom` → `@ExprCustom<Element>`)
│       │   ├── elements.bp    ← COMPILED: the element surface (front 94) — `el`/`voidEl`, `isVoidTag`/`isRawTextTag`, and the tags `element.bp` does not declare
│       │   ├── client_runtime.bp  ← COMPILED: the `clientRender` `#[@External.Node("./client_runtime.mjs", "render")]` cell — ships the sidecar
│       │   ├── client_runtime.mjs ← HOST: the client build's hooks (state/effect/memo/ref/reducer + render) over jhonstart's own re-render loop
│       │   ├── router.bp      ← COMPILED: the route snapshot (front 26) — `RouterState`, `pairValue`, `decodePairs`, `snapshot`/`fill`
│       │   ├── router_runtime.mjs ← HOST (js): the router's store and the History API half of `navigate`
│       │   ├── sidecars/
│       │   │   └── jhonstart_router.erl ← HOST (BEAM): the same cells over the calling process's dictionary. NOT a `files` entry — `shipErlSidecars` finds it under the package's `src/sidecars/`
│       │   └── server.d.bp    ← Http ContextBase: request() + loaders (host-bound/async; GATED)
│       └── test/
│           ├── router_test.bp   ← `botopink test` flat suite: the route snapshot, its accessors and the pair decoder (front 26) — both rows
│           ├── html_test.bp     ← `botopink test` flat suite: `html` behaviour-parity (renders match the old body)
│           └── elements_test.bp ← `botopink test` flat suite: a tag from `elements.bp` resolves inside `html """…"""` (the DSL resolves in the CALLER's scope, so the only honest test is written from a consumer's position)
├── examples/
│   ├── jhonstart-counter/  ← MEMBER: `use state` + the client runtime under node (targets [commonJS])
│   ├── jhonstart-html/     ← MEMBER: the `html """…"""` DSL cross-module (inherits [commonJS, erlang])
│   ├── jhonstart-todo/     ← MEMBER: builders + hooks + SSR (targets [commonJS])
│   └── jhonstart-app/      ← NOT a member: no botopink.json, so the `examples/*` glob skips it (by design)
└── repro/                  ← NOT members: jhonstart-free packages handed back to botopink-lang, one per open compiler defect (see repro/README.md)
```

There is **no `modules/jhonstart-test/` yet.** The front's `<lib>-test` member
(`specs/1.0.10-beta/02-packaging/README.md` § 5) stands on `std/asserts` and
`std/snapshots`, which `01-std` steps 2–3 deliver; it is created then (step 4),
not here.

`examples/jhonstart-app/` has no manifest on purpose: the `examples/*` glob
takes only a child holding a `botopink.json`, silently — a directory that wants
to be a member declares itself. `jhonstart-app` is the aspirational app-layer
sketch (file routing, `[id]` segments) and does not parse today, so it is
neither a runner row nor a gate row. Do not give it a manifest until it builds.

`repro/` is outside both globs, so nothing builds or runs it: each subdirectory
is a self-contained package with **no jhonstart in it**, written to hand a
compiler defect back to its owning front as a measurement rather than a
description. A directory is deleted in the commit that lands the fix. See
[`repro/README.md`](repro/README.md).

## Module tree (`root.bp`)

`modules/jhonstart/src/root.bp` is the explicit module-tree root — the package builds from it, not
a deprecated blind `src/` scan. It declares the four compiled public modules
`pub mod element; pub mod hooks; pub mod html; pub mod elements;` (all public
surface; `hooks` and `elements` import `Element` from `element`, so the resolver
compiles `element` first). Each track-C front **appends** its own `pub mod` line
in front-number order and never reorders or edits another front's line;
`botopink.json`'s `files` list takes the same entries in the same order.

**A sibling-module import always names its module** — `import { Element } from
"element";`, never the bare `import { Element };`. Both type-check, but
commonJS lowers the bare form to `require("../module")`: a path that resolves
while jhonstart is compiled on its own and not when it is a dependency, which
is how `examples/jhonstart-counter` and `-todo` came to build and then die with
`Cannot find module '../module'`. Reported to botopink-lang as a codegen defect
(`src/codegen/commonJS.zig`, the require path of a dependency's sibling
module); naming the module is the workaround and reads better anyway.

The
host-bound declaration module `server.d.bp` is **not** in the
tree: it is wired through the core member's `botopink.json` `files` (consumer surface, loaded
with `.declaration = true` for a `from "jhonstart"` consumer). `.d.bp` modules
are not resolved by `mod` paths (the resolver follows only `<name>.bp` /
`<name>/mod.bp`), mirroring how `libs/std` keeps its ambient `.d.bp` out of
`root.bp`.

## Layers

| Layer | Analog | ContextBase | Surface |
|---|---|---|---|
| core | React | `Element` | `element.bp` + `elements.bp` + `hooks.bp` + `html.bp` (**compiled**) |
| app | Next.js | `Http` | `router` (**compiled** — front 26), `server` (declared, host-bound) |

## Conventions

- **Prefer real `.bp`**: implement in botopink whatever the language can express.
  `element.bp` (type, builders, `renderToString`) and `hooks.bp` (the
  `{value, set}` hook family) are ordinary `.bp`. Keep `.d.bp` only for genuinely
  host-bound intrinsics or async-gated surface — and say which gap gates each one.
- Builders take a `Children` arg (`div([a, b])` / single / `string` — the G4
  coercion); the **list form** is what V1 renders and what `html` emits. The
  trailing-lambda sugar (`div { [a, b] }`) is a recorded follow-up.
- A hook is `pub fn <noun>(…) -> @Context<Element, R>` — the noun, never a
  `use` prefix (`counter`, `router`, `toggle`; not `useCounter`). Activation is
  `val x = use <noun>(…)` in the static prefix of a `#[@context]` body whose
  return is `Element` (a component) or `@Context<Element, _>` (a custom hook);
  the binding never reuses the hook's name (`val r = use router()`).
- Hook bodies are pure/synchronous (the server pass / first render): `state`
  yields its initial value, `memo` computes eagerly, `effect` is a no-op. `use
  f(x)` lowers to `f(x)` on every backend, so hook bodies are unit-tested by
  **direct call** (no `use`) in `test {}`, and a `#[@context]` component called
  plainly renders the server pass. Client reactivity is
  `modules/jhonstart/src/client_runtime.mjs`
  (the same nouns over jhonstart's own loop), which the client build resolves
  `jhonstart/hooks` to — the bundler's substitution (front 68); under node,
  `examples/jhonstart-counter/client.mjs` seeds `require.cache` the same way.
  The five nouns are not re-declared in `client_runtime.bp`: a package's import
  surface is flat and a second `state` shadows `hooks.state` for every consumer
  (last module wins, silently, even from a non-`pub` `mod` — measured).
- `renderToString` is **synchronous** (`.bp`); SSR needs no async.
- Components are PascalCase (`Counter`, `Page`); fns/builders camelCase.
- Not embedded: do **not** wire jhonstart into `comptime/stdlib/prelude.zig` or
  `build.zig`.

## Compiler prerequisites (all generic, none jhonstart-specific)

jhonstart is a *consumer*. What it relies on:

- **Landed**: `context-inference` (`@Context`/`use`), `expr-templates` (`@Expr`),
  the G1–G4 gaps (fn-typed fields, labeled tuple types, `fn() -> T[]`, `Children`
  coercion), the generic `from "<lib>"` loader, and — new in this port — generic
  **cross-module nominal-type resolution** (a local component `fn … -> Element`
  whose result feeds an imported `renderToString`/`use` now type-checks; see
  `modules/compiler-core/src/comptime` `type_decl_registry` + `resolveTypeName`).
- **Landed** (markup front-end): `expr-custom` (`@ExprCustom<T>` + `CustomNode` +
  `q.custom`) now backs `html` — its body lexes/parses the markup into a token
  stream and lowers it twice (builder code + a `CustomNode` reference overlay the
  LSP reads), the sibling of erika's `erika "…"` SQL front-end. The comptime
  template body still sees only a native-JS prelude (no Option/`unwrapOr`), so the
  walk uses a stack + `indexOf` span recovery rather than a recursive descent —
  see `html.bp`'s header.
- **Still gated** (router / server, all generic core work):
  - `use-await-prefix` / `async-generators` (`tasks/v0.beta.1/`) for the server
    data layer (the `#[@future]` annotation surface itself landed in
    v0.beta.12; the prefix/generator wiring on top is the remaining gap);
  - (closed) the `Element` model **does** carry an `attrs: Array<#(string,
    string)>` slot, so `href`/`value`/`class` render in pure `.bp`; what `Link`
    still lacks is the host navigation runtime, not an attribute slot.

  (The "bare imported template-fn binding" gap that originally lived here
  closed in v0.beta.8 via the generic-loader-binding keystone, with the
  package-default-dsl handle binding following in v0.beta.14 — consumers
  can `import jhonstart, {html, div, …} from "jhonstart"` today.)

## CI

`.github/workflows/test.yml` runs `zig build test-libs -- --lib jhonstart
--target <t>` on every push / PR to `feat`/`master`/`main`, over
`{ubuntu-22.04, macos-14} × {commonJS, erlang}` plus `commonJS` on
`windows-2022` (`escript` ships cleanly only on linux + macos). Both target
rows are hard cells — no `allow_fail`. Nothing about jhonstart is
commonJS-only: `renderToString` turns an `Element` tree into a string, which is
pure string work on either backend, and the core suite is 27/27 on erlang. The
examples stage reads each example's own manifest target, so it is pinned to the
commonJS row and runs once.

Since the umbrella is a workspace, the `repository/` root contributes its
**members** by manifest name: `--lib jhonstart` selects `modules/jhonstart/`,
the umbrella has no row, and `jhonstart-counter` / `jhonstart-html` /
`jhonstart-todo` are rows of their own. Over the workspace the runner prints
(measured 2026-09-21, compiler `botopink-lang` feat `361d255d`):

| lib | commonJS | erlang |
|---|---|---|
| `jhonstart` | ✓ 9/9 | ✓ 9/9 |
| `jhonstart-counter` | ✓ 4/4 | ✗ does not compile (`set/2 undefined`) |
| `jhonstart-html` | ✓ 7/7 | ✓ 7/7 |
| `jhonstart-todo` | ✓ 3/3 | ✓ 3/3 |

`jhonstart-counter` and `jhonstart-todo` **restrict** `targets` to
`["commonJS"]` (a member may only restrict the workspace's targets, never widen
them), so the runner marks their erlang cell `~` and skips it; the erlang column
above is what `--include-unsupported` measures underneath the restriction, which
is what the compiler's `scripts/restricted-targets.txt` ledger pins.
`jhonstart-html` declares no `targets` and inherits both, because it is green on
both.

### The two erlang reds, measured 2026-09-21 (`botopink-lang` feat `ecf9fd1c`)

A restriction had hidden them since the examples were written. They are **two
unrelated defects**, not one, and an earlier reading of this section — "an
imported function called unqualified", owner `00 · 13-module-identity` — was
wrong about both: neither name is imported, and the module-atom machinery is not
involved.

1. **`function print/1 undefined`** — both examples, and **ours**. Their `main`
   called `print(…)` rather than `@print(…)`. The bare spelling type-checks on
   every target (a `registerBuiltins` binding plus a `pub declare fn print` in
   the prelude) but only commonJS lowers it; erlang emits an undefined local,
   beam an `unresolved_call`, wasm a trap. `@print` is the only form
   `botopink-lang/docs.md` shows and the form `jhonstart-html` already used,
   which is why that example was green while these two were not. Fixed here.
   This was never test-only: `botopink run --target erlang` failed identically,
   and `botopink build --target erlang` exited 0 only because a build
   transpiles without ever invoking `erlc`. The missing diagnostic is routed to
   botopink-lang in [`repro/README.md`](repro/README.md).

2. **`function set/2 undefined`** — `jhonstart-counter` only, and **not ours**.
   `c.set(5)` on a `State<T>` — `set` is a `fn(next: T)` field (G1) — lowers
   correctly inside the module that declares the record (`(element(3, C))(5)`)
   and to a bare undefined local across a module boundary, which every consumer
   of `jhonstart/hooks` is by construction. commonJS is green on both sides.
   Owner: `00 · 02-erlang`; the erlang backend collects function-typed fields
   only from the module's own `type` declarations, and the cross-module export
   index carries field names without their types. Minimal jhonstart-free repro
   and the exact site: [`repro/erlang-imported-fn-field/`](repro/erlang-imported-fn-field/).
   The one test that hits it is left exactly as written — a workaround in the
   example would only hide the defect.

Bootstrap path mirrors the other lib repos: check out this lib + a
fresh `botopink-lang` clone, place this lib under
`botopink-lang/repository/jhonstart/`, then `zig build install && zig
build test-libs`. `BOTOPINK_LANG_REF` repo variable pins a specific
botopink-lang ref (default `feat`).

## Tagging (auto)

`.github/workflows/tag.yml` reads `version` from `botopink.json` and
creates / moves a git tag on every push to `feat`/`master`/`main`:

- **feat** → moving `<version>-feat` tag, force-pushed on every push.
- **master** / **main** → immutable `<version>` tag. Pushing the same
  SHA twice is a no-op; pushing a *different* SHA without bumping
  `version` in `botopink.json` is a hard error ("bump version in
  botopink.json to publish a new release").

To preview unreleased work, set `requires.jhonstart = "feat"` in the
consuming project's `botopink.json` and run `bpmp sync`.

## Local gate

`scripts/git-hooks/pre-commit` is the tracked pre-commit gate. It is
self-contained: it sources `scripts/git-hooks/lib/runner-standalone.sh`
from this repository and reaches nothing outside it, so a standalone
clone, a checkout inside the botopink meta workspace and a worktree run
the same gate. Install it once per clone:

```sh
git config core.hooksPath scripts/git-hooks
```

`core.hooksPath` is per clone and applies to every worktree of it. The
gate checks staged files for conflict markers, then — the root manifest being a
workspace — runs `botopink test` **inside every `modules/*/` member** that holds
a `botopink.json`, each on its own manifest target (`botopink test` at the root
is the refusal, so the runner never calls it there). The compiler binary is located via (in order)
`$BOTOPINK_BIN`, the nearest ancestor
`repository/botopink-lang/zig-out/bin/botopink`, then `$PATH`. If none
resolve, the gate prints a yellow warning and exits 0 — CI runs the full
suite and catches any regression there. Never commit with `--no-verify`;
fix the red instead.

After `botopink test`, the gate builds every `examples/*/` that has a
`botopink.json` (`runExamplesGate`, each with its own manifest target,
into a throwaway `--out`); CI runs the same function once per workflow.
Each example depends on the core with `{ "jhonstart": { "workspace": true } }`
(decisions 75 + 76 of 1.0.10-beta): the sibling member of the enclosing
workspace, resolved without consulting a library root at all — so the gate
always tests the checkout being committed, worktree included. A `path` to
`../..` is now the *points at the workspace itself* refusal, and a `git`
dependency on a library of this ecosystem would resolve by name across the
roots to some other checkout.
`scripts/known-broken-examples.txt` lists the examples allowed to fail —
`examples/<name>  <reason>` per line — and cannot rot: a listed example
that builds, or a listed path that no longer exists, fails the gate too.
When a fix makes an example build, delete its line in the same commit. The list may be absent,
empty or hold only `#` comments — each means no example is allowed to fail.
No example is listed today; `examples/jhonstart-app` has no `botopink.json` and
is not built (it is the gated aspirational app-layer example). The other three
build **and run**:

| example | `botopink run` output |
|---|---|
| `jhonstart-counter` | `<div><p>count: 0</p><span>non-negative</span></div>` |
| `jhonstart-html` | `<div><p>hello, world</p></div>` |
| `jhonstart-todo` | `<div><span>todos: 2</span><ul><li>buy milk</li><li>write docs</li></ul></div>` |

The examples pass `attrs` explicitly to the element builders (`text("x", [])`,
`div([…], [])`): the `attrs = []` default added by the bracket-prop commit is
not applied by the compiler yet (botopink-lang 1.0.4-beta 06 N1), so a
one-argument call does not type-check.

`examples/jhonstart-counter/client.mjs` runs the **built** counter under the
client runtime on node (`botopink build && node client.mjs`): it seeds
`require.cache` so `main.js`'s `jhonstart/hooks` resolves to
`out/jhonstart/client_runtime.mjs`, renders `Counter`, then re-renders after
`set(3)` and `set(-2)` — four lines, the first being the program's own `main()`
at load.

### Known defect — the `.mjs` sidecar is resolved by name, not by the dependency

The sidecar is shipped by `botopink build` (`shipMjsSidecars`, botopink-lang
`modules/compiler-cli/src/cli/libs.zig`) from whatever `libDirByName` answers for
the owning lib name across the **library roots** — never through the resolved
`{ "jhonstart": { "workspace": true } }` dependency the build already has in
hand. A miss is **silent**: the build still exits 0, `out/jhonstart/client_runtime.mjs`
is simply absent, and only `node client.mjs` fails. Owner: front
`00 · 10-cli-residuals`; the fix is to ship from the resolved dependency
directory. Never bypass a gate over it.

Measured on 2026-09-21 with the `zig-out` binary of `botopink-lang` feat, by
appending a distinct marker line to each candidate `client_runtime.mjs`,
building `examples/jhonstart-counter` and grepping the built `out/`. Every row
exits 0 — the sidecar's presence is the only observable:

| Layout, and where `botopink build` runs | Sidecar | Why |
|---|---|---|
| **before** — the flat package (`src/` at the root), no other checkout on the roots | **NOT shipped** | the root's manifest is a *package*, so `rootsFrom` never adds the directory itself; nothing on the roots is named `jhonstart` and `libDirByName` returns `null` |
| **after** — this layout, no other checkout on the roots | **shipped**, from `modules/jhonstart/src/` | the root's manifest is a *workspace*, so `rootsFrom` adds it and `scanRoots` contributes its members: one entry named `jhonstart` |
| **after** — `repository/jhonstart/examples/jhonstart-counter/`, the shape this lands as on `feat` | **shipped**, from `repository/jhonstart/modules/jhonstart/src/` | the enclosing workspace is a root and `repository/` reaches the same directory; `addUnique` de-dups by directory, so still one entry |
| **after** — a `.tasks/` worktree beside a `repository/jhonstart` that also declares the name `jhonstart` (migrated or not) | **NOT shipped** | two entries named `jhonstart` from two directories → `resolveDuplicateNames` marks both *declared by two libraries* → `libDirByName` skips an entry with a `problem` → silent miss |

So the move to `modules/jhonstart/` **fixed** the sidecar for a standalone
checkout and for the shape that lands on `feat`, and the old
`BOTOPINK_LIB_ROOTS` workaround (a real directory literally named `jhonstart`
with a symlinked `src/`) is obsolete: front 02-packaging step 1 replaced the
directory-basename lookup with a lookup by manifest name. What remains is a
worktree-only collision — while a `.tasks/` worktree and the main checkout both
declare the name `jhonstart`, `botopink-lib-test` reports
`"jhonstart" is declared by two libraries: …`, the sidecar is skipped in the
worktree, and `node client.mjs` there needs it copied by hand:

```sh
( cd examples/jhonstart-counter && botopink build \
  && cp ../../modules/jhonstart/src/client_runtime.mjs out/jhonstart/ \
  && node client.mjs )
```
