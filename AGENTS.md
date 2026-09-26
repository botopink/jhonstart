# jhonstart

> Path: `repository/jhonstart/`
> Parent (workspace): [`../AGENTS.md`](../AGENTS.md) · Sibling (core): [`../botopink-lang/AGENTS.md`](../botopink-lang/AGENTS.md)
> Spec: [`../../tasks/v0.beta.7/specs/jhonstart.md`](../../tasks/v0.beta.7/specs/jhonstart.md)
> (port), originally [`../../tasks/v0.beta.5/specs/jhonstart.md`](../../tasks/v0.beta.5/specs/jhonstart.md)

botopink's **React/Next-style** UI framework, written *in* botopink on the
language's own primitives — **no jhonstart-specific compiler features**.
Components are functions returning `@Component<ElementBase, Element>`; hooks are nouns
(`state`, `router` — never `useState`) returning the `@Component<ElementBase, _>`
capability, activated by the `use` keyword (decision 88 of 1.0.10-beta:
`use f(x)` lowers to `f(x)` on every backend); a server component that only
loads data is `fn … -> @Task<Element>` (the return type is the effect — botopink
decisions 118–128, front 24; the `#[@<effect>]` annotations and `@Future` left, and
`*fn` before them); the JSX-like
`html """…"""` DSL reuses `expr-templates` (`@Expr<Element>`), expanding markup
to the builder pipeline at comptime. The compiler is **unaware** of jhonstart (hard rule + `grep -riE
"rakun|jhonstart" modules/compiler-core/src` gate); the framework is a pure
client, reached with `from "jhonstart"`, never embedded.

The UI **core + hooks + the element surface + the `html` markup DSL are real
botopink** (`modules/jhonstart/src/{element,hooks,elements}.bp` in the core
member's compiled set, `modules/jhonstart-html/src/html.bp` in the
`jhonstart-html` member's — front 95 cut the DSL out of the core): an
`Element` tree, builders, a synchronous SSR renderer, the hook family, and the
`html """…"""` comptime expander — no host intrinsics, no async. Since fronts 26
and 28 there is **no `.d.bp` module left**: the route snapshot and the request
are compiled and each ships its own host half on both rows
(`router_runtime.mjs` / `sidecars/jhonstart_router.erl`, `server_runtime.mjs` /
`sidecars/jhonstart_server.erl`). Client navigation is compiled too since
front 27 (`link.bp`, `reconcile.bp`, in the `jhonstart-link` member since front
95's relocation): the render-time half is pure, and the browser half —
`linkMount`, `linkPrefetch`, `linkRouteKind`, `linkStatus` — sits over four
dual-target cells whose erlang twins answer the server's idle truth; the
transition driver and front 60's route-kind table are still to come. The
server/client BOUNDARY is compiled since front 29 (`client.bp`): `#[client]` and
`#[clientProps]` are comptime markers with four refusals, and the island, the
hole and the poison pill are ordinary `.bp`; what ENFORCES the boundary over the
module graph is front 68's and is not stubbed either. Nothing is embedded
into the prelude.

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
│   ├── jhonstart/     ← CORE — what `from "jhonstart"` gives a consumer
│   │   ├── botopink.json  ← name jhonstart, src src/, entry root.bp, target commonJS, files [root.bp, element.bp, hooks.bp, router.bp, server.bp, globals.bp, client.bp, error_boundary.bp, metadata.bp, elements.bp, suspense.bp, plugin.bp, routes.bp, render.bp, streaming.bp, client_app.bp, client_runtime.bp] (DEPENDENCY order — a dependent loads the files in this order, so a module comes after every module it imports; `root.bp` keeps front-number order)
│   │   ├── src/
│   │   │   ├── AGENTS.md
│   │   │   ├── root.bp        ← module-tree root: `pub mod element; pub mod hooks; pub mod router; pub mod server; pub mod client; pub mod suspense; pub mod streaming; pub mod render; pub mod plugin; pub mod globals; pub mod routes; pub mod error_boundary; pub mod metadata; pub mod elements; mod client_runtime;`
│   │   │   ├── element.bp     ← COMPILED CORE: type Element + builders (Children) + renderToString + test {}
│   │   │   ├── hooks.bp       ← COMPILED: State<T> + state/effect/memo/ref/reducer (@Component<ElementBase,_>, pure server-pass bodies) + test {} (imports `Element`)
│   │   │   ├── elements.bp    ← COMPILED: the element surface (front 94) — `el`/`voidEl`, `isVoidTag`/`isRawTextTag`, and the tags `element.bp` does not declare
│   │   │   ├── client_runtime.bp  ← COMPILED: the `clientRender` `#[@External.Node("./client_runtime.mjs", "render")]` cell — ships the sidecar
│   │   │   ├── client_runtime.mjs ← HOST: the client build's hooks (state/effect/memo/ref/reducer + render) over jhonstart's own re-render loop
│   │   │   ├── router.bp      ← COMPILED: the route snapshot (front 26) — `RouterState`, `pairValue`, `snapshot`/`fill`, `navigationFor`/`applySignal` (the envelope's `n`, through `routing`), `resolveRoute` (`routing`'s `matchPath` over the payload's `t`)
│   │   │   ├── client_app.bp  ← COMPILED (front 26 Step 6): `ClientApp` / `clientApp(routes, mount, allowedRedirects).start()` — a client-only app over `routing`'s matcher, front 30's `compose` and the one browser write `__jhMount`; `notFound` / `redirect` handled as the server render handles them. Host halves `client_app.mjs` / `sidecars/jhonstart_client_app.erl` (a module store when there is no `window`)
│   │   │   ├── router_runtime.mjs ← HOST (js): the router's store and the History API half of `navigate`
│   │   │   ├── sidecars/
│   │   │   │   ├── jhonstart_router.erl ← HOST (BEAM): the same cells over the calling process's dictionary. NOT a `files` entry — `shipErlSidecars` finds it under the package's `src/sidecars/`
│   │   │   │   └── jhonstart_server.erl ← HOST (BEAM): the request's six cells + `fill/6`, same process dictionary, same non-`files` discovery
│   │   │   ├── server.bp      ← COMPILED: the request (front 28) — `RequestData` + four accessors, `request`/`enterRequest`/`leaveRequest`/`cookies`/`headers`, `renderServerComponent`
│   │   │   ├── server_runtime.mjs ← HOST (js): the request store, the twin of `jhonstart_server.erl` cell for cell
│   │   │   ├── client.bp      ← COMPILED (front 29): `#[client]` + `#[clientProps]` (comptime markers, four refusals), `islandId`/`islandAttrOf`/`islandAttr` (decision 77 — the ONE spelling of `data-jh-i`), `Island` + `clientMount` + `islandEntry` + `propsOf`, `serverSlotAttr`/`serverSlot`, `serverOnly`, and `hydrate()` / `propsFor(name)` over two dual-target cells (`island_runtime.mjs` / `sidecars/jhonstart_island.erl`). The graph walk is front 68's
│   │   │   ├── suspense.bp    ← COMPILED (front 30): `Boundary(id, fallback, child: fn() -> @Component<…>)` (an UNSTARTED thunk), `Suspense` (the `data-jh-h` hole; registers the boundary with the render), `holeId`
│   │   │   ├── render.bp      ← COMPILED (front 30): `renderNode` (the escaping, void-aware walker over std `escape`), `raw`, `shellHtml`, `mountIsland` (i0, i1 … through front 29's `islandAttr`), `compose` (layout > template > error > loading > not-found > page; layouts run first), `Payload`/`writePayload` (std `json` + `escape.scriptJson`), `RenderHooks`/`setHooks`, the document
│   │   │   ├── streaming.bp   ← COMPILED (front 30): `Chunk`/`resolve`/`fillHtml`, the late-signal markup, `Response` + `guarded`, `PageInput`, `App`/`app` with `render` / `renderStream` (→ `@Task<@Result<void, string>>`), the signal translation and the redirect-target check
│   │   │   ├── plugin.bp      ← COMPILED (front 30): `RenderPlugin(name, head, chunk, close, payload)` — a record of async functions, called in `app`'s order
│   │   │   ├── globals.bp     ← COMPILED (front 30): the registry `payload, fill, signal` → `__bp0/1/2` via `globals()`; `readPayload` (std `json.decode`), `registerFill`, `registerSignal`
│   │   │   ├── routes.bp      ← COMPILED (front 30): `#[page]`/`#[layout]`/`#[template]`/`#[defaultView]`, `PageContext`, `LayoutProps`, the UI registry (`jhPage`… `uiTable()`), `UiSegment` + `segment`/`with*`/`segmentFor`
│   │   │   ├── render.mjs     ← HOST (js): per-render state + `eachCompleted`, and the browser half (fill / signal functions, payload text)
│   │   │   ├── routes.mjs     ← HOST (js): the UI registry
│   │   │   ├── sidecars/jhonstart_render.erl ← HOST (BEAM): per-render state in the process dictionary, hooks in `persistent_term`, `each_completed/2` (one process per boundary, values handed back in completion order)
│   │   │   ├── sidecars/jhonstart_routes.erl ← HOST (BEAM): the UI registry, an ETS table with an owner process
│   │   │   ├── error_boundary.bp ← COMPILED (front 31): `ErrorInfo`/`ErrorBoundary`, `renderBoundary`/`renderBoundaryChecked`/`catchError`, the digest (std `hash.contentHash`), `notFound`/`redirect` raising `routing`'s `nav:` reasons, `isSignal`
│   │   │   ├── metadata.bp    ← COMPILED (front 32), PURE: `Metadata`/`OpenGraph`/`TwitterCard`/`Icons`/`Viewport`, the merge rule, `renderHead`/`renderViewport` over std `escape`
│   │   │   ├── signal_runtime.mjs ← HOST (js): `raise` / `capture` / `captureTask` / `tryValue` / `tryTask` — the one place a raise becomes a `@Result` value
│   │   │   └── sidecars/jhonstart_signal.erl ← HOST (BEAM): the same cells
│   │   └── test/
│   │       ├── render_test.bp ← `botopink test` flat suite: the walker, the hole, the fill, the globals, the payload (front 30) — both rows
│   │       ├── streaming_test.bp ← `botopink test` flat suite: `render`/`renderStream` over a recording `Response`, composition, signals before and after the first chunk, the plugin order (front 30) — both rows
│   │       ├── routes_test.bp ← `botopink test` flat suite: the four markers, `uiTable()` through `routing`, the params accessors (front 30) — both rows
│   │       ├── metadata_test.bp ← `botopink test` flat suite: the merge rule row by row, the head's order and escaping, the viewport (front 32) — both rows
│   │       ├── error_boundary_test.bp ← `botopink test` flat suite: the catch, the digest, signals passing through, the file conventions (front 31) — both rows
│   │       ├── client_app_test.bp ← `botopink test` flat suite: `clientApp` start, the two signals, the target check (front 26 Step 6) — both rows
│   │       ├── router_test.bp   ← `botopink test` flat suite: the route snapshot, its accessors and the pair decoder (front 26) — both rows
│   │       ├── server_test.bp   ← `botopink test` flat suite: the request record, the six cells, the `@Task` component and loader conventions (front 28) — both rows
│   │       └── client_test.bp   ← `botopink test` flat suite: the `#[client]` emit, a whitelisted props record, the island, the hole and the poison pill (front 29) — both rows
│   ├── jhonstart-emilia/ ← MEMBER (front 30, additive): the bridge — `plugin() -> RenderPlugin` over emilia's `flush()`, contributing the payload's `s`; the ONE member naming both jhonstart and emilia
│   │   ├── botopink.json  ← name jhonstart-emilia, files [root.bp], dependencies { jhonstart: { workspace: true }, emilia: { path: ../../../emilia/modules/emilia } }
│   │   ├── src/root.bp    ← `plugin()`, `classesIn(css)`; the flushed names per render in a host cell
│   │   └── test/bridge_test.bp ← `botopink test`: the styled page's one head `<style>`, a streamed boundary's fill style before its markup, `s`, `close` (front 30) — both rows
│   ├── jhonstart-forms/ ← MEMBER (front 67, additive): a form bound to a server action — `formAction`/`formAttrs`/`hiddenActionField`/`actionForm`, `submitForm`/`invokeAction`/`formMount`, the `actionState`/`formStatus`/`optimistic` hooks, `applyOptimistic`, the GET search form (`searchFormAttrs`, `searchHref`, `prefetchSearch`); the envelope, the state grammar and the RPC body are the bundled library `actions`'. Wire names come from `setWireNames(field, header)` (onze, at boot) — no literal here
│   │   ├── botopink.json  ← name jhonstart-forms, files [root.bp, form.bp], dependencies { jhonstart, jhonstart-link: { workspace: true } }
│   │   ├── src/{root.bp, form.bp, form_runtime.mjs, sidecars/jhonstart_forms.erl} ← the six browser cells, dual-target (the erlang twin answers the server's quiet truth and records the call for the test)
│   │   └── test/form_test.bp ← `botopink test`: the binding's markup, the body handed to the cell and the state read back, the hooks' server pass, the search form (front 67) — both rows
│   ├── jhonstart-html/ ← MEMBER (front 95): the `html """…"""` DSL — what `from "jhonstart-html"` gives a consumer; the core does not depend on it
│   │   ├── botopink.json  ← name jhonstart-html, src src/, entry root.bp, target commonJS, files [root.bp, html.bp], dependencies { jhonstart: { workspace: true } }
│   │   ├── src/
│   │   │   ├── AGENTS.md
│   │   │   ├── root.bp    ← `pub mod html;`
│   │   │   └── html.bp    ← COMPILED: the JSX-like `html """…"""` markup DSL (lexer → tokens → stack parser → dual lowering → `q.custom` → `@ExprCustom<Element>`); imports `Element` from "jhonstart"
│   │   └── test/
│   │       ├── html_test.bp     ← `botopink test` flat suite: `html` behaviour-parity (renders match the old body) — builders from "jhonstart"
│   │       └── elements_test.bp ← `botopink test` flat suite: a tag from `elements.bp` resolves inside `html """…"""` (the DSL resolves in the CALLER's scope, so the only honest test is written from a consumer's position)
│   ├── jhonstart-link/ ← MEMBER (front 27's code, relocated by front 95): client navigation's render-time half — what `from "jhonstart-link"` gives a consumer; the core does not depend on it
│   │   ├── botopink.json  ← name jhonstart-link, src src/, entry root.bp, target commonJS (inherits [commonJS, erlang]), files [root.bp, link.bp, reconcile.bp], dependencies { jhonstart: { workspace: true } }
│   │   ├── src/
│   │   │   ├── root.bp        ← `pub mod link; pub mod reconcile;`
│   │   │   ├── link.bp        ← COMPILED (front 27): `LinkProps` + `linkProps` + five `with*`, `Link`, `prefetchMode`, `layoutKey`, `LinkStatus`/`linkStatusOf`, and the browser half `linkMount` / `linkPrefetch` / `linkRouteKind` / the `linkStatus` hook over four DUAL-target cells (`link_runtime.mjs` / `sidecars/jhonstart_link.erl`); imports `Element` from "jhonstart"
│   │   │   └── reconcile.bp   ← COMPILED (front 27), PURE: `layoutKeys` + `sharedDepth` — the remount decision of a client transition, asserted without a DOM
│   │   └── test/
│   │       ├── link_test.bp     ← `botopink test` flat suite: the props, the anchor's seven attribute rows, the prefetch table and the layout key (front 27) — both rows
│   │       └── reconcile_test.bp ← `botopink test` flat suite: `layoutKeys`/`sharedDepth`, the whole remount decision without a DOM (front 27) — both rows
│   └── jhonstart-test/ ← MEMBER (front 95): the test-helper member — `assert<Subject>(loc, …)` helpers, fixtures, builders; EMPTY `pub` surface until the track-C fronts fill it (`specs/1.0.10-beta/04-jhonstart/modules.md` § 5)
│       ├── botopink.json  ← name jhonstart-test, files [root.bp], dependencies { jhonstart: { workspace: true } }
│       └── src/root.bp    ← one inline `test` proving the core resolves from the member
├── examples/
│   ├── jhonstart-counter/  ← MEMBER: `use state` + the client runtime under node (targets [commonJS])
│   ├── jhonstart-markup/   ← MEMBER: the `html """…"""` DSL cross-module (inherits [commonJS, erlang]) — was `examples/jhonstart-html/`, renamed by front 95 because a member name is unique in the workspace and the DSL member took it
│   ├── jhonstart-todo/     ← MEMBER: builders + hooks + SSR (targets [commonJS])
│   └── jhonstart-app/      ← NOT a member: no botopink.json, so the `examples/*` glob skips it (by design)
└── repro/                  ← NOT members: jhonstart-free packages handed back to botopink-lang, one per open compiler defect (see repro/README.md)
```

`modules/jhonstart-test/` is the `<lib>-test` member
(`specs/1.0.10-beta/02-packaging/README.md` § 5), created empty by front 95: it
stands on std's `asserts` and `snapshots`, and each track-C front adds its
`assert_<subject>.bp` and `pub mod` line. It re-exports nothing from std.

`modules/jhonstart-link/` holds front 27's `link.bp` and `reconcile.bp` and
their two suites, moved out of the core by front 95 as a relocation only: the
one edit is `import {Element, ElementBase} from "jhonstart";` in `link.bp` (and
the same line in `link_test.bp`); nothing in the core imported either module.
The member declares no `targets`, so it inherits both rows — its code is pure;
the four `#[@External.Node]` cells front 68 brings reopen that question
(`specs/1.0.10-beta/04-jhonstart/modules.md` § 4).

The other members `specs/1.0.10-beta/04-jhonstart/modules.md` § 1 plans —
`jhonstart-forms` (67) and the `jhonstart-emilia` bridge (30, decision 113) —
are created by those fronts, not here.

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

Front 27's own README § Step 5 says its two lines are HANDED to front 94 rather
than written by the front, and front 29's § Step 5 and § *Does not touch* say the
same. That is not what the landed tree does: front 26 (`d9f1f3c`), front 94
(`dc979b6`) and front 28 (`6d6c007`) each appended their own line to `root.bp`
and `botopink.json` in their own commit, and fronts 27 and 29 do the same.
Recorded as a spec/tree disagreement, not resolved here — front 94 is closed and
there is nobody left to hand a line to.

**A sibling-module import always names its module** — `import { Element } from
"element";`, never the bare `import { Element };`. Both type-check, but
commonJS lowers the bare form to `require("../module")`: a path that resolves
while jhonstart is compiled on its own and not when it is a dependency, which
is how `examples/jhonstart-counter` and `-todo` came to build and then die with
`Cannot find module '../module'`. Reported to botopink-lang as a codegen defect
(`src/codegen/commonJS.zig`, the require path of a dependency's sibling
module); naming the module is the workaround and reads better anyway.

There is no declaration module left in this package. `.d.bp` modules are not
resolved by `mod` paths (the resolver follows only `<name>.bp` /
`<name>/mod.bp`), so a `.d.bp` had to be wired through `files` alone and was
never in the build tree — which is exactly why `router.d.bp` and `server.d.bp`
were promoted rather than filled in. A host-bound module here is now an ordinary
`.bp` that ships its two host halves beside it.

## Layers

| Layer | Analog | ContextBase | Surface |
|---|---|---|---|
| core | React | `Element` | `element.bp` + `elements.bp` + `hooks.bp` (**compiled**); the `html.bp` DSL in the `jhonstart-html` member (**compiled**) |
| app | Next.js | `Element` | `router` (**compiled** — front 26), `server` (**compiled** — front 28), `link` + `reconcile` (**compiled, pure** — front 27), `client` (**compiled, pure** — front 29) |

## Conventions

- **Prefer real `.bp`**: implement in botopink whatever the language can express.
  `element.bp` (type, builders, `renderToString`) and `hooks.bp` (the
  `{value, set}` hook family) are ordinary `.bp`. Keep `.d.bp` only for genuinely
  host-bound intrinsics or async-gated surface — and say which gap gates each one.
- Builders take a `Children` arg (`div([a, b])` / single / `string` — the G4
  coercion); the **list form** is what V1 renders and what `html` emits. The
  trailing-lambda sugar (`div { [a, b] }`) is a recorded follow-up.
- A hook is `pub fn <noun>(…) -> @Component<ElementBase, R>` — the noun, never a
  `use` prefix (`counter`, `router`, `toggle`; not `useCounter`). Activation is
  `val x = use <noun>(…)` in the static prefix of a body whose return is
  `@Component<ElementBase, _>` (the return is the effect) — a
  component (`-> @Component<ElementBase, Element>`) or a custom hook (`-> @Component<ElementBase, _>`);
  the binding never reuses the hook's name (`val r = use router()`).
- Hook bodies are pure/synchronous (the server pass / first render): `state`
  yields its initial value, `memo` computes eagerly, `effect` is a no-op. Hook
  bodies are unit-tested by **direct call** (no `use`) in `test {}`, awaited —
  on commonJS every `@Component` body is an `async function` (botopink decisions
  104/128) — and a component called and awaited renders the server pass. Client reactivity is
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
  - (closed) the server data layer. `fn … -> @Task<T>` (then spelled with the
    pre-front-24 annotation) with a statement-level `await` compiles and RUNS on
    both rows, `test` blocks included — measured for front 28 against compiler
    `2e6bb4ac`. What remains
    of `use-await-prefix` / `async-generators` is not on this path;
  - (closed) `use request()` — `request()` is a hook since botopink front 21;
  - (closed) the `Element` model **does** carry an `attrs: Array<#(string,
    string)>` slot, so `href`/`value`/`class` render in pure `.bp`. `Link` is
    written and compiled since front 27; what it still lacks is the host
    navigation runtime, which is front 68's bundle and front 60's route-kind
    table, not an attribute slot and not a language gap;
  - **an imported declared default is not applied.** A trailing default IS
    filled at the call site for a declaration in the CALLING module (C-04), and
    is still not filled for an imported one. Measured 2026-09-21 against
    compiler `2e6bb4ac`, on BOTH rows (it is a checker answer, so every target
    fails the same way), against jhonstart's own `text`:

    ```text
    import { text } from "jhonstart";  text("hi")
    error: 'text' expects 2 argument(s), got 1
     --> src/gap.bp:4:27
    ```

    This is why front 27's `Link` takes a `LinkProps` RECORD and not six
    parameters with five defaults, and why every example in this tree spells
    `attrs:` at every constructor call.

  (The "bare imported template-fn binding" gap that originally lived here
  closed in v0.beta.8 via the generic-loader-binding keystone, with the
  package-default-dsl handle binding following in v0.beta.14 — consumers
  can `import {html} from "jhonstart-html"` beside `import {div, …} from
  "jhonstart"` today.)

## What jhonstart fronts 27–32 consume from front 26

Front 26 (the router) is the first landed front of this track after the element
surface, and fronts **27** (link), **28** (server components), **29** (client
directive), **30** (streaming), **31** (error boundaries) and **32** (metadata)
all read the answer it produces. This is the surface they may rely on; none of
it changes without a note here. Everything below is reached by a consumer as
`import { … } from "jhonstart"` and is green on **both** rows — measured with a
`path` dependency on `modules/jhonstart/` from a package outside this tree,
rendering a `@Component<ElementBase, Element>` component through `use pathname()` /
`use selectedLayoutSegment()` / `use params()` and asserting the markup.

| What | Where | Shape |
|---|---|---|
| The snapshot | `RouterState(path, params, search, pattern, selected)` | a plain record, no behavior. `params`/`search` are `Array<#(string, string)>`, `selected` the layout depth (root layout `0`) |
| Its accessors | `r.param(n)` · `r.searchParam(n)` · `r.segments()` · `r.segment()` | every one answers a plain `string`/`Array<string>`, `""` when absent or out of range. Never `?string` |
| The pair decoder | `pairValue(pairs, name)` | the package's ONE pair-list decoder, FIRST match of a duplicated key. Fronts 28 and 32 import it from here rather than growing a copy |
| The pair codec | std's `encoding.formParse` · `encoding.formStringify` | decision 116 rule 4: percent-aware, the codec rakun uses; the package carries no copy. `formStringify` writes NO leading `?` — the caller adds it |
| The segment readers | `patternSegments(pattern)` · `segmentAt(segments, i)` | typed-parameter readers. An `xs.at(i).unwrapOr("")` written at a call site reads the element back unwrapped on the erlang row |
| The build | `snapshot()` | five cells in, the record out. No `?T` unwrap that can fail |
| **The writer** | `fill(path, params, search, pattern, selected)` | the ONE way route state is installed, and the seam fronts 27/28/29 need. `params`/`search` go in querystring-encoded, exactly as the payload's `m` and `q` carry them. Every field at once — a half-updated snapshot is a component reading the previous route's params against the next route's pattern |
| The six hooks | `router` · `pathname` · `params` · `searchParams` · `selectedLayoutSegment` · `selectedLayoutSegments` | each `-> @Component<ElementBase, T>`, each one read of `snapshot()`. `selectedLayoutSegments()` is root-first |
| The six verbs | `push` · `replace` · `back` · `forward` · `refresh` · `prefetch` | free functions over one cell, `-> i32` nobody reads. Free and not methods: records are immutable and there is no assignment to a `self` field anywhere in this tree |
| What a verb recorded | `lastNavigation()` | `"<kind> <href>"`, `""` when nothing has. On erlang this is the 307 front 28's dispatcher writes; in the browser the last href the History API was handed |
| The host halves | `src/router_runtime.mjs` · `src/sidecars/jhonstart_router.erl` | cell for cell, so one set of assertions runs on both rows. The BEAM store is the CALLING PROCESS's dictionary: a request is a process, the snapshot dies with it, two concurrent renders cannot see each other's route |

**One call-site rule, and it only shows on the erlang row** — the same one
rakun's front 23 records: a function-valued record field must be read into a
local before it is called (`val tagOf = v.tagOf; tagOf(e)`, never `v.tagOf(e)`,
which lowers to a method call and dies `function tagOf/2 undefined` while
staying silent on commonJS).

**One rule that shows on both** — a hook called WITHOUT `use` keeps its
`@Component<ElementBase, T>` type. The type is transparent to a property or a method
(`ps.length`, `segs.join("/")`, `r.param("slug")`) and **not** to a typed
parameter: `pairValue(params(), "slug")` is `type mismatch: expected array, got
Context`, and binding through a `val` does not change it. Only `use` strips the
capability. So an array-valued hook is usable as a value only under `use`, and
the two `string` hooks compare directly either way.

**Three things front 26 does NOT provide, so nobody looks for them here.**

1. **A matcher and a route table parser.** `matchPath`, `parseTable` and
   `writeTable` are rakun front 22's, written once and compiled twice. A router
   with its own matcher is a router that disagrees with the server about
   precedence on the routes nobody tested. `matchPath`'s result already carries
   the **root-first layout chain** — do not rebuild it — and a route parameter
   is read with **`paramOf(m, name)`**, never `m.params.at(name).unwrapOr("")`:
   through the optional binder the match's type is lost.
2. **The `ElementView<Element>` adapter.** rakun front 23's handoff says "front
   26 writes it". It cannot be written here, and the reason is structural, not
   a preference: `ElementView<El>` is rakun's type, so the adapter needs
   `import { ElementView } from "rakun"`; jhonstart declares no dependency on
   rakun; and rakun's member is `targets: ["commonJS"]`, so adding one would
   red jhonstart's erlang row — the row front 26 is assigned to. The adapter
   belongs to **front 28**, the front where jhonstart meets rakun's SSR
   pipeline, together with the `dependencies` entry that makes it possible and
   the targets decision that entry forces. Front 28 should also expect rakun's
   own rule above to bite it: every field of the adapter is a **lambda**
   (`{ t -> isVoidTag(t) }`), never a bare function name.
3. **A `Link`.** It did not come along from `router.d.bp`. It is front 27's
   `link.bp` (landed; the `jhonstart-link` member since front 95), and front 26 adds nothing to it and reads nothing
   from it.

### The `query` hole front 23 left, and what front 26 says about it

rakun front 23's README claims the dynamic marking "is done by the accessor,
not by a developer remembering to declare it", and front 23 **measured that
this cannot be true as written**: `searchParams(route)` marks, but `route.query`
is a public field of front 22's `PageContext` and a direct field read cannot be
intercepted. Front 23 declined to close it by reaching into another front's
file, which was right.

**Front 26 needs the guarantee, and states so.** A render that reads the query
and is cached as static serves one reader's `?sort=desc` to every other reader:
the failure is silent, it is a correctness failure rather than a performance
one, and it is invisible in every test that renders one request. A convention
("always use the accessor") cannot close it, because the whole point of the
sentence is that it holds for people who do not know the convention.

**What would close it**, in order of preference, all of them front 22's file
and none of them front 26's to make:

1. **Make `query` private on `PageContext` and leave `searchParams(route)` /
   `searchParam(route, name)` as the only readers.** One edit, no new concept,
   and the accessor's marking becomes the only way to reach the value — which
   is exactly what front 23's sentence asserts.
2. **Drop `query` from `PageContext` entirely** and have the dispatcher pass it
   to the accessor's store instead. Stronger, because there is then no field to
   find, but it moves a value fronts other than 23 may already read.
3. Failing both: **delete the sentence**, and say instead that the marking is
   the accessor's and a direct `route.query` read is undefined behaviour for
   caching. This is the honest fallback, not a fix — it converts a guarantee
   into a documented hazard, and front 26 would rather have the guarantee.

Front 26 does **not** work around it: this library's `searchParams()` reads its
own snapshot and never touches `PageContext`, so nothing here papers over the
hole. It is recorded because fronts 28 and 30 — the two that decide what may be
cached — inherit it.

## Front 28 — the request, and the three things it dropped

### The `Http` base, and why it is gone

`server.d.bp` carried a `behavior Request` with three bodyless methods and a
phantom `@Context` base called `Http` — "no members … supplied by the host, the
server-side mirror of `Element`". Front 28 drops both, and the reason is
the base rather than taste: every hook anchors at `ElementBase`, the base
`Element` names in `implement @Context<ElementBase>` (botopink decisions 96/128),
and a server component is `fn Page() -> @Component<ElementBase, Element>`. One base
serves the whole render tree, a client hook
is type-legal inside a server component, and the client boundary is front 29's
`#[client]` rule rather than a type. A second, memberless base would be a base
nothing implements and a base no `use` could ever resolve against.

The `Request` behavior goes with it. A behavior with bodyless methods had no
verified implementor anywhere in this tree; `RequestData` is a plain record, the
same call front 26 made for `RouterState`, and a record is what a `use`
capability has to yield anyway.

`server.d.bp` was never in the build tree (`.d.bp` is not resolved by `mod`), so
no built consumer existed to break.

### Why the request cells are jhonstart's own

Front 28's README binds the six cells to front 62's
`#[@External.Erlang("rakun_request_context", …)]` and says there is to be no
Node cell in the file. Neither half is writable, and both halves were measured
against compiler `2e6bb4ac` on 2026-09-21:

1. **An erlang-only cell reds the commonJS COMPILE at its call site.** Not at
   run time — the README's test plan expects "a js run of `request()` is
   expected to fail at the first cell", and it is worse than that:

   ```text
   error: `__jhReqMethod` has no `#[@External.<Target>(…)]` for the node backend
    --> src/main.bp:5:12
   ```

   `modules/jhonstart` is compiled on **both** rows, so an erlang-only cell
   takes the whole member — every landed assertion in it — off the commonJS
   row the moment `request()` calls it. Front 26 measured the same thing for
   the router's five reads and carries the same note.

2. **`rakun_request_context` has no BEAM row to bind to.** rakun's member is
   `targets: ["commonJS"]`. On erlang — front 28's *assigned* target — every
   cell answers `{error,undef}` at run time, so no assertion that reads the
   request could RUN, and `botopink build --target erlang` would still exit 0
   because a build transpiles and never invokes `erlc`.

So the seam is **here** and it is `pub`, which is the conclusion front 26 already
reached and wrote down for the route snapshot: a server that reached into
another library's process dictionary keys would be coupled to them forever.
`jhonstart_server` / `server_runtime.mjs` are the two halves, cell for cell;
`enterRequest(req)` is the one writer and `leaveRequest()` its pair; front 30's
render calls both, once per render, with the `RequestData` onze handed it.

`enterRequest` is deliberately **not** front 26's `fill` under another name, and
the two stores stay separate: a route snapshot is re-filled DURING a render (its
`selected` is the layout depth) while a request is entered once and is constant
for the whole render. Folding them would make "the request" mutate mid-page.

### Two things front 28 does NOT provide

1. **`escape.html` / `escape.attribute`.** They are front 01's and
   `libs/std/src/escape.bp` does **not exist** in compiler `2e6bb4ac` — the
   nineteen std modules have no escaping among them. `renderToString` escapes
   nothing (`element.bp:56`, frozen), so a server component renders
   attacker-influenced text verbatim today. `server.bp` hand-rolls no
   replacement: a stand-in would be a second answer to "what is an escaped `&`"
   the day the real one lands. `test/server_test.bp` PINS the unescaped answer,
   so the change shows as a red cell rather than a silent difference.
2. **Parallel awaiting.** No `awaitAll`, no `race`, no `allSettled`. `@Task`
   is eager on the erlang row (botopink decision 120), so two loaders
   awaited in sequence cost the **sum** of their round trips even when their
   results are independent. The fix is front 02's spawn-and-gather over
   **unstarted tasks** (`[{ -> loadPost(s) }, { -> loadSidebar() }]`), not a
   `map` over Tasks, which would simply run them in order. jhonstart names
   front 02 and ships no second answer.

### The `ElementView<Element>` adapter is still unassignable here

§ *What jhonstart fronts 27–32 consume from front 26* hands the adapter to front
28 "together with the `dependencies` entry that makes it possible and the
targets decision that entry forces". Front 28's own README does **not** ask for
it — it cites rakun 23 and 62 read-only and nothing more — and the structural
obstacle front 26 recorded has not moved: `ElementView<El>` is rakun's type, so
the adapter needs `import { ElementView } from "rakun"`, jhonstart declares no
dependency on rakun, and rakun's member is `targets: ["commonJS"]`, so the entry
would red jhonstart's erlang row — the row front 28 is assigned to. It is not
written here. The two specs disagree about who owns it and that is a spec
question, not a code one.

### What fronts 29–32 consume from front 28

| What | Where | Shape |
|---|---|---|
| The request | `RequestData(method, path, params, query, headers, cookies)` | a plain record, no behavior. Every plural field `Array<#(string, string)>`; **no `body` field** — form bodies are front 24's, route-handler bodies front 25's |
| Its accessors | `r.param(n)` · `r.queryParam(n)` · `r.header(n)` · `r.cookie(n)` | plain `string`, `""` when absent, never raises. All four through front 26's `pairValue`, so a duplicated key means one thing |
| The build | `request()` | six cells in, the record out. A plain function, not a hook, until front 19 step 2 |
| **The writer pair** | `enterRequest(req)` · `leaveRequest()` | the ONE way request state is installed and removed, called by front 30's render once per render. The four pair lists are stored `encoding.formStringify`-encoded. Between the two `request()`/`cookies()`/`headers()` read it; outside them they RAISE |
| The shortcuts | `cookies()` · `headers()` | the only two re-exported. `after`, `connection`, `draftMode` and memoization are front 62's, called from there |
| The render entry | `renderServerComponent(component) -> @Task<string>` | takes an **unstarted thunk** `fn() -> @Task<Element>`, awaits exactly once, renders synchronously afterwards; `renderComponent` takes a `fn() -> @Component<ElementBase, Element>` thunk |
| The host halves | `src/server_runtime.mjs` · `src/sidecars/jhonstart_server.erl` | cell for cell, so one set of assertions runs on both rows. The BEAM store is the CALLING PROCESS's dictionary: a request is a process, it dies with it, two concurrent renders cannot see each other's cookies |

**Two call-site rules.** The first only shows on the erlang row and is a compiler
defect, not a convention: **a bare function name used as a value lowers to an
unbound erlang variable**, so `renderServerComponent({ -> Page(ps) })` is green
on both rows while `renderServerComponent(Page)` compiles on commonJS and fails
`variable 'Page' is unbound` on erlang. It is the same shape rakun's front 23
records for the fields of its `ElementView` and it is **reported, not worked
around**. The second shows on both: a function has one return and so one effect
(botopink decision 118), so a server component that loads data is
`fn … -> @Task<Element>`, and one that also activates a hook is
`fn … -> @Component<ElementBase, Element>` (decision 128: `@Component` extends
`@Task`). Neither is a `@Result`, so neither can propagate a failed load with
`try` — a component handles the error in its body (`try await load() catch …`,
`case`, an error screen; decision 121).

## Front 27 — client navigation, and the half that is not written

`link.bp` and `reconcile.bp` are the RENDER-TIME half of a `<Link>`: the anchor,
its props, the prefetch decision and the remount decision. Every one of them is
**pure** — the two files declare no host cell of any target, which is stronger
than the front's "no `#[@External.Erlang]` cell" acceptance row — so all 35
assertions run on both rows and `Link` renders during the server pass exactly as
it renders in the browser.

| What | Where | Shape |
|---|---|---|
| The props | `LinkProps(href, prefetch, replace, scroll, target, className)` | a plain record. `linkProps(href)` fills Next's defaults; `withPrefetch`/`withReplace`/`withScroll`/`withTarget`/`withClass` each return a NEW record with one field changed |
| The anchor | `Link(props, children) -> Element` | `<a href=… data-jh-l="1">`, plus one attribute per prop that DIFFERS from its default. `target` and `class` are real attributes, the other three are `data-jh-*` |
| The prefetch decision | `prefetchMode(kind, hasLoading, requested) -> string` | `"full"` / `"partial"` / `"skip"`, Next's § 8 table verbatim. BOTH inputs are front 60's; jhonstart computes neither |
| The layout key | `layoutKey(segments, depth)` | `"/" + segments.take(depth).join("/")`. `segments` is front 26's `RouterState.segments()`, so the client's key and the server's are the same string |
| The remount decision | `layoutKeys(segments)` · `sharedDepth(current, target)` | root-first keys including the root; the common-prefix length. `[0, keep)` stays mounted, `[keep, n]` is replaced. Never `0` — the root layout is never remounted |
| The in-flight status | `LinkStatus(pending, href)` · `linkStatusOf(href)` | the pure derivation from the href the browser half reports, `""` being idle |

**No arbitrary-attribute parameter.** `Link` has no pass-through `attrs` list —
only `target` and `className`, through `LinkProps`. An anchor that accepts any
attribute is an anchor that can be handed its own `data-jh-l`, and that marker
is what the browser half queries on.

### What fronts 60 · 67 · 68 have to bring, and why none of it is stubbed here

| Missing | Owner | Note |
|---|---|---|
| `__jhLinkMount()` | 68 | delegated click interception + an intersection observer over `[data-jh-l]`. The generated entry calls it ONCE, after hydrating the islands, alongside front 67's `__jhFormMount()`. Front 29 owns the per-island hydrate point, not the entry, and does not call this |
| `__jhLinkPrefetch(href, mode)` | 68 | warms the client route cache; `mode` is `prefetchMode`'s answer |
| `__jhLinkStatus()` and `linkStatus() -> @Component<ElementBase, LinkStatus>` | 68 | the hook is then `return linkStatusOf(__jhLinkStatus());` and nothing else in `link.bp` moves |
| `__jhLinkRouteKind(href)` | 60 | reads the route-kind table front 60 emits into the bundle |
| `reconcile(current, target)` | 68 (+ 60) | the transition driver: front 68's DOM primitives for the two ranges, front 60's flag for whether the payload had to be fetched, front 29's `data-jh-s` adoption and front 31's `data-jh-e` re-anchoring |

Two measurements make declaring them today wrong rather than merely early, and
they point in opposite directions:

1. **A called node-only cell reds the ERLANG build at its call site.** Measured
   2026-09-21 against compiler `2e6bb4ac`, smallest program:

   ```bp
   #[@External.Node("./rt.mjs", "status")]
   declare fn __cellStatus() -> string;
   pub fn statusOf() -> string { return __cellStatus(); }
   ```

   ```text
   $ botopink build --target commonJS     # Compiled in 95.64ms
   $ botopink build --target erlang
   error: `__cellStatus` has no `#[@External.<Target>(…)]` for the erlang backend
    --> src/main.bp:5:12
   ```

   It is the exact mirror of the erlang-only → commonJS measurement `router.bp`
   and `server.bp` both carry, and it applies because these modules land in the
   core member, compiled on both rows. A `linkStatus()` wrapper would take all
   103 landed assertions off the erlang row.

2. **A declared and never-called node-only cell is fine** — that is why
   `client_runtime.bp`'s `clientRender` does not red erlang, and it was
   re-measured here. So the four declarations are cheap. What is not cheap is
   the module they name: `jhonstart/client-runtime` is front 68's generated
   bundle and does not exist, so the declaration would emit a `require` of a
   file nobody writes, silently at build time and loudly at run time. A host
   cell that answers what nobody can check is exactly what `router.d.bp`'s
   one-line `Link` was, and the reason it never became real.

## Front 29 — the client boundary, and what it does NOT check

`client.bp` is the boundary's VOCABULARY. It is pure — no host cell of any
target — so all 22 assertions run on both rows and an island renders during the
server pass exactly as it renders in the browser.

| What | Where | Shape |
|---|---|---|
| The marker | `#[client]` | a `@Decl`-first comptime fn. Emits `pub fn __jhClient_<Name>() -> string` — a PURE function, never a call into a host registry, because an `@emit` fires on every target and a Node-only call would break the erlang server render |
| The props rule | `#[clientProps]` | on the props RECORD, because `@Decl` does not expose a function's parameters. Whitelist: `string` · `i32` · `f64` · `bool` |
| The island marker | `islandId(n)` · `islandAttrOf(id)` · `islandAttr(n)` | decision 77: `islandAttrOf` is the ONE occurrence of `"data-jh-i"` in this tree. Front 23 fills `RenderHooks.islandAttr` from `islandAttr`; front 68's entry imports the same function |
| The island | `Island(id, component, props)` · `clientMount(island, children)` | the placeholder carries the id and NOTHING else; the component name and encoded props go to the payload's `i` row |
| The payload row | `islandEntry(island)` | `#(id, component, "k=v&k=v")`, encoded with std's `encoding.formStringify` (decision 116 rule 4) |
| The decode | `propsOf(raw)` | the pure half of the front's `propsFor(name)`; `propsOf("")` is `[]` |
| The hole | `serverSlotAttr()` · `serverSlot(children)` | `data-jh-s="1"` — the server-rendered subtree the client ADOPTS and must not reconstruct |
| The poison pill | `serverOnly()` | the value is meaningless; its presence in a module's import list is the signal |

**What is enforced today** — four comptime refusals, no flag that turns them off
(decision 67), each located at the annotation: `#[client]` on a non-`fn`;
`#[client]` on a fn whose reflected `returnType` is not `Element` (a
`-> @Task<Element>` server component reflects as `"Task"`); `#[clientProps]` on an
enum; a field outside the four-scalar whitelist.

**What is NOT enforced by anything in this tree**, and it is the front's whole
reason to exist, so it is written here rather than implied:

- that a `#[client]` component's parameter record carries `#[clientProps]` at
  all — `@Decl` has no parameters;
- that no module reachable from a `#[client]` component imports `serverOnly`, or
  `request`/`cookies`/`headers`;
- that the props written into an island's `i` row are the ones the record
  declares.

All three are module-GRAPH predicates. **Front 29 defines the boundary; front 68
enforces it.** Today a secret read on the server still reaches the browser if it
is written into an island's props, and nothing here notices.

### The whitelist is four names, not the spec's six

`Field.typeName` cannot express `string[]` or `i32[]`. Measured against compiler
`2e6bb4ac` over one record carrying a field of each shape:

```text
a: string -> "string"   e: Array<string>            -> "Array"
b: i32    -> "i32"      f: string[]                 -> ""
c: f64    -> "f64"      g: Array<i32>               -> "Array"
d: bool   -> "bool"     h: Element                  -> "Element"
                        i: fn(x: i32) -> i32        -> ""
                        j: #(string, string)        -> ""
                        k: Array<#(string, string)> -> "Array"
```

The element type is ERASED, so `Array<string>` and `Array<Element>` are the same
string; admitting `"Array"` would admit an array of `Element`s through a check
whose whole purpose is to refuse exactly that. The refusal wins — no array
crosses today, an array-valued prop is spelled as an encoded `string`, and the
front's first § Language gaps row widens from "no parameters on `Decl`" to "no
ELEMENT TYPE on `Field`".

### What front 68 has to bring, and why none of it is stubbed here

| Missing | Owner | Note |
|---|---|---|
| `hydrate()` — the PER-ISLAND hydrate point: walks `[data-jh-i]`, decodes that island's props from the payload's `i` row, starts the component | 68 | it is not the bundle entry and it mounts no links and no forms; front 68's generated entry calls it, then front 27's `__jhLinkMount()` and front 67's `__jhFormMount()` once each |
| `islandProps(name)` / `__jhClientPropsRaw(name)` and the `propsFor(name)` wrapper | 68 | `propsFor` is then `return propsOf(__jhClientPropsRaw(name));` and nothing else in `client.bp` moves |
| every "may not" rule above | 68 | the walk over the client module graph |

Same two measurements front 27 records, re-measured for this file: a **called**
node-only cell reds the ERLANG build at the call site and this module is
compiled on both rows, so a `propsFor` wrapper would take every landed assertion
off erlang; and a **declared, never called** node-only cell is fine, but the
module it would name — `jhonstart/client-runtime` — is front 68's generated
bundle and does not exist, so the declaration would emit a `require` of a file
nobody writes.

### One naming rule, and the checker defect behind it

**No local may be named after an imported builder.** A local `val` leaks into
the module scope the checker sees for every top-level declaration that appears
AFTER its body — so `val p = LikeProps(…)` in a `test {}` reds a `@Component`
component declared further down with `error: type mismatch: expected Element,
got LikeProps`, at a call site that is correct, with no line or column. Measured
on both rows against `2e6bb4ac`; twelve jhonstart-free lines in
[`repro/local-binding-leaks-to-later-decls/`](repro/local-binding-leaks-to-later-decls/).
`p`, `a`, `li`, `text`, `form`, `link`, `title` and `body` are all exported tag
constructors, so this is one declaration order away from any file in this tree.

## CI

`.github/workflows/test.yml` runs `zig build test-libs -- --lib jhonstart
--target <t>` on every push / PR to `feat`/`master`/`main`, over
`{ubuntu-22.04, macos-14} × {commonJS, erlang}` plus `commonJS` on
`windows-2022` (`escript` ships cleanly only on linux + macos). Both target
rows are hard cells — no `allow_fail`. Nothing about jhonstart is
commonJS-only: `renderToString` turns an `Element` tree into a string, which is
pure string work on either backend, and the core suite is 68/68 on erlang. The
examples stage reads each example's own manifest target, so it is pinned to the
commonJS row and runs once.

Since the umbrella is a workspace, the `repository/` root contributes its
**members** by manifest name: `--lib jhonstart` selects `modules/jhonstart/`,
the umbrella has no row, and `jhonstart-html`, `jhonstart-link`, `jhonstart-test`,
`jhonstart-counter` / `jhonstart-markup` / `jhonstart-todo` are rows of their own. Over the workspace the runner prints
(measured 2026-09-21 against the `zig-out` binary of the workspace's
`botopink-lang` checkout; the core member's rows are `botopink test` inside
`modules/jhonstart/`, counted in `test {}` blocks):

| lib | commonJS | erlang |
|---|---|---|
| `jhonstart` | ✓ 187/187 | ✓ 187/187 |
| `jhonstart-html` (member) | ✓ 5/5 | ✓ 5/5 |
| `jhonstart-link` (member) | ✓ 38/38 | ✓ 38/38 |
| `jhonstart-emilia` (member) | ✓ 6/6 | ✓ 6/6 |
| `jhonstart-forms` (member) | ✓ 15/15 | ✓ 15/15 |
| `jhonstart-test` | ✓ 1/1 | ✓ 1/1 |
| `jhonstart-counter` | ✓ 4/4 | ✗ does not compile (`set/2 undefined`) |
| `jhonstart-markup` | ✓ 7/7 | ✓ 7/7 |
| `jhonstart-todo` | ✓ 3/3 | ✓ 3/3 |

Measured 2026-09-26 against botopink-lang `f011850c` (`botopink test` in each
member, summed per module). Track C's second wave took the core from 85 to 187:
fronts 26/28's codec and writer cells (+7), front 29 (+3), front 31's
`error_boundary_test.bp` (19), front 32's `metadata_test.bp` (16), front 30's
`render_test.bp` (22), `streaming_test.bp` (23) and `routes_test.bp` (8), and
front 26's `client_app_test.bp` (4); `jhonstart-link` gained front 27's three
browser-cell tests.

Front 95 moved `html_test.bp` (2) and `elements_test.bp` (3) with the DSL into
`jhonstart-html`, so the core reads 120 where it read 125 (measured 2026-09-25
against botopink-lang feat `29b5a725`); front 95's second cut moved
`link_test.bp` (25) and `reconcile_test.bp` (10) with their modules into
`jhonstart-link`, so the core reads 85 and the member 35 (measured 2026-09-26
against botopink-lang feat `248d0896`). The core member was 103/103 on both rows before front 29, 68/68 before front 27,
51/51 before front 28 and 27/27 before front 26; the client boundary adds 22, all
of them in `client_test.bp`, and every one RUNS on **both** rows because
`client.bp` reaches no host cell at all. Front 29's assigned target is commonJS;
the erlang column is not an extra but the front's own claim that `clientMount`
and `serverSlot` are pure — a placeholder that did not render on the server
would be a boundary that never starts. The same holds for front 27's 35 (25 in
`link_test.bp`, 10 in `reconcile_test.bp`). Counted with the pinned compiler
`2e6bb4ac` by summing the per-module summaries: `botopink test` prints one
summary PER MODULE, so its last line is the last module's count and not the
run's total (for the record: 3 + 15 + 4 + 22 + 3 + 2 + 25 + 10 + 24 + 17).

`jhonstart-counter` and `jhonstart-todo` **restrict** `targets` to
`["commonJS"]` (a member may only restrict the workspace's targets, never widen
them), so the runner marks their erlang cell `~` and skips it; the erlang column
above is what `--include-unsupported` measures underneath the restriction, which
is what the compiler's `scripts/restricted-targets.txt` ledger pins.
`jhonstart-markup` declares no `targets` and inherits both, because it is green on
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
   `botopink-lang/docs.md` shows and the form `jhonstart-html` (now `jhonstart-markup`) already used,
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
| `jhonstart-markup` | `<div><p>hello, world</p></div>` |
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
