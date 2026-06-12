# jhonstart

> Path: `repository/jhonstart/`
> Parent (workspace): [`../AGENTS.md`](../AGENTS.md) · Sibling (core): [`../botopink-lang/AGENTS.md`](../botopink-lang/AGENTS.md)
> Spec: [`../../tasks/v0.beta.7/specs/jhonstart.md`](../../tasks/v0.beta.7/specs/jhonstart.md)
> (port), originally [`../../tasks/v0.beta.5/specs/jhonstart.md`](../../tasks/v0.beta.5/specs/jhonstart.md)

botopink's **React/Next-style** UI framework, written *in* botopink on the
language's own primitives — **no jhonstart-specific compiler features**.
Components are plain functions returning `Element`; hooks are the
`@Context<Element, _>` capability gated by the `use` prefix; server components are
`*fn … -> @Future<Element>`; the JSX-like `html """…"""` DSL reuses
`expr-templates` (`@Expr<Element>`), expanding markup to the builder pipeline at
comptime. The compiler is **unaware** of jhonstart (hard rule + `grep -riE
"rakun|jhonstart" modules/compiler-core/src` gate); the framework is a pure
client, reached with `from "jhonstart"`, never embedded.

The UI **core + hooks + the `html` markup DSL are real botopink** (`src/element.bp`,
`src/hooks.bp`, `src/html.bp` — all in `botopink.json`'s compiled set): an
`Element` tree, builders, a synchronous SSR renderer, the hook family, and the
`html """…"""` comptime expander — no host intrinsics, no async. Only the
host-bound surface (client navigation, the Http server context) stays as `.d.bp`
declarations, each with an explicit "STILL GATED" note. Nothing is embedded into
the prelude.

## Tree

```text
repository/jhonstart/
├── AGENTS.md          ← you are here
├── botopink.json      ← manifest (files: element.bp, hooks.bp, html.bp, router.d.bp, server.d.bp)
├── docs.md            ← user-facing reference
├── src/
│   ├── AGENTS.md
│   ├── root.bp        ← module-tree root: `pub mod element; pub mod hooks; pub mod html;`
│   ├── element.bp     ← COMPILED CORE: record Element + builders (Children) + renderToString + test {}
│   ├── hooks.bp       ← COMPILED: State<T> + state/effect/memo/ref/reducer (@Context<Element,_>) + test {} (imports `Element`)
│   ├── html.bp        ← COMPILED: the JSX-like `html """…"""` markup DSL (lexer → tokens → stack parser → dual lowering → `q.custom` → `@ExprCustom<Element>`)
│   ├── router.d.bp    ← Router/useRouter/Link (host-bound navigation; GATED)
│   └── server.d.bp    ← Http ContextBase: request() + loaders (host-bound/async; GATED)
└── test/
    └── html_test.bp   ← `botopink test` flat suite: `html` behaviour-parity (renders match the old body)
```

## Module tree (`root.bp`)

`src/root.bp` is the explicit module-tree root — the package builds from it, not
a deprecated blind `src/` scan. It declares the three compiled modules
`pub mod element; pub mod hooks; pub mod html;` (all public surface; `hooks`
imports `Element` from `element`, so the resolver compiles `element` first). The
host-bound declaration modules `router.d.bp` / `server.d.bp` are **not** in the
tree: they are wired through `botopink.json` `files` (consumer surface, loaded
with `.declaration = true` for a `from "jhonstart"` consumer). `.d.bp` modules
are not resolved by `mod` paths (the resolver follows only `<name>.bp` /
`<name>/mod.bp`), mirroring how `libs/std` keeps its ambient `.d.bp` out of
`root.bp`.

## Layers

| Layer | Analog | ContextBase | Surface |
|---|---|---|---|
| core | React | `Element` | `element.bp` + `hooks.bp` + `html.bp` (**compiled**) |
| app | Next.js | `Http` | `router`, `server` (declared, host-bound) |

## Conventions

- **Prefer real `.bp`**: implement in botopink whatever the language can express.
  `element.bp` (record, builders, `renderToString`) and `hooks.bp` (the
  `{value, set}` hook family) are ordinary `.bp`. Keep `.d.bp` only for genuinely
  host-bound intrinsics or async-gated surface — and say which gap gates each one.
- Builders take a `Children` arg (`div([a, b])` / single / `string` — the G4
  coercion); the **list form** is what V1 renders and what `html` emits. The
  trailing-lambda sugar (`div { [a, b] }`) is a recorded follow-up.
- Hook bodies are pure/synchronous (SSR / first render): `state` yields its
  initial value, `memo` computes eagerly, `effect` is a no-op. The `use` prefix's
  per-target lowering (React `useState`/… on `commonJS`) is the host runtime's
  job — so hook bodies are unit-tested by **direct call** (no `use`) in `test {}`.
- `renderToString` is **synchronous** (`.bp`); SSR needs no async.
- Components are PascalCase (`Counter`, `Page`); fns/builders camelCase.
- Not embedded: do **not** wire jhonstart into `comptime/stdlib/prelude.zig` or
  `build.zig`.

## Compiler prerequisites (all generic, none jhonstart-specific)

jhonstart is a *consumer*. What it relies on:

- **Landed**: `context-inference` (`@Context`/`use`), `expr-templates` (`@Expr`),
  the G1–G4 gaps (fn-typed fields, anon record types, `fn() -> T[]`, `Children`
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
  - the generic loader binds a lib's **namespace** but not bare imported
    values/template-fns — `import {html} from "jhonstart"` leaves `html "…"`
    unbound (same gap as `erika "…"`);
  - `use-await-prefix` / `async-generators` (`tasks/v0.beta.1/`) for the server
    data layer;
  - the `Element` model has no **attribute** slot, so `Link`/form controls can't
    render `href`/`onClick` in pure `.bp` yet.

## CI

`.github/workflows/test.yml` runs `zig build test-libs -- --lib jhonstart
--target commonJS` on every push / PR to `feat`/`master`/`main`, across
`ubuntu-22.04`, `macos-14`, `windows-2022`. jhonstart is a frontend
framework — the matrix is **commonJS-only**.

Bootstrap path mirrors the other lib repos: check out this lib + a
fresh `botopink-lang` clone, place this lib under
`botopink-lang/repository/jhonstart/`, then `zig build install && zig
build test-libs`. `BOTOPINK_LANG_REF` repo variable pins a specific
botopink-lang ref (default `main`).

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
