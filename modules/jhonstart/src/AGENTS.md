# jhonstart/modules/jhonstart/src/

> Path: `repository/jhonstart/modules/jhonstart/src/`
> Parent (workspace): [`../../../AGENTS.md`](../../../AGENTS.md)

Source for the `jhonstart` **core member** — the workspace member
`modules/jhonstart/`, which is what `from "jhonstart"` resolves to (the umbrella
`repository/jhonstart/botopink.json` is a workspace and answers no import).
Its manifest is `../botopink.json`: `src: "src/"`, `entry: "root.bp"`,
`target: "commonJS"`, and the `files` list below as the consumer surface; it
declares no `targets` and so inherits the workspace's `["commonJS", "erlang"]`.
The UI **core and hooks are real botopink** — an `Element` tree, builders, a
synchronous SSR renderer and the hook family, all implemented in `.bp` (no host
intrinsics, no async). The `html """…"""` comptime expander left this member
for `modules/jhonstart-html/` (front 95; see `../../jhonstart-html/src/AGENTS.md`). Only the genuinely host-bound surface
(the Http context) stays as a `.d.bp` **declaration**, carrying an explicit
"STILL GATED" note naming the gap; `router.d.bp` was promoted to `router.bp` by
front 26. `botopink test` compiles
the `.bp` files and runs their `test {}` blocks; the `.d.bp` files are type
surface for consumers.

| File | Kind | Provides |
|---|---|---|
| `element.bp` | **compiled** | `type Element(…) implement @Context<Element, Element>` with a `Children` `children` field (the UI node AND the hook ContextBase), builders (`text`, `fragment`, `div`/`span`/`p`/`h1`/`ul`/`li` — take `Children`), `renderToString` (pure, synchronous), `test {}` (render + the G4 coercion) |
| `hooks.bp` | **compiled** | `type State<T>(value, set: fn(next: T))` (G1) + `state`/`effect`/`memo`/`ref`/`reducer` — nouns, no `use` prefix — returning `@Context<Element, _>` with real server-pass bodies (G2 labeled tuple types `#(current: T)`/`#(state: S, dispatch: fn(action: A))`), `test {}` calling the bodies directly + a `#[@context]` custom hook `counter` and a `#[@context]` component `Counter` (`use state`/`use memo`), rendered plainly as the server pass |
| `elements.bp` | **compiled** | the **element surface** (front 94): `el(tag, children, attrs)` and `voidEl(tag, attrs)` — the only two places an `Element` is built here — the predicates `isVoidTag`/`isRawTextTag` a void-aware renderer consults, and the HTML tags `element.bp` does not declare, each in `element.bp`'s exact shape (`fn <tag>(children: Children, attrs: Array<#(string, string)> = []) -> Element`). `el` is the escape hatch for an unnamed tag. Attribute values are stored verbatim — escaping belongs to the renderer |
| `client_runtime.bp` | **compiled** (`mod`, not `pub mod`) | `clientRender(component, commit)` — the one `#[@External.Node("./client_runtime.mjs", "render")]` cell; its require ships the sidecar (G2). Never called from erlang. The five nouns are deliberately not re-declared (a second `state` shadows `hooks.state` across the flat package surface) |
| `client_runtime.mjs` | host (js) | the client build's hooks: `state`/`effect`/`memo`/`ref`/`reducer` with hook semantics + `render(component, commit)` over jhonstart's own render cycle (cursor-indexed cells, microtask-batched re-render, effects after commit by `deps`); first-render values outside a render. The client build resolves `jhonstart/hooks` to it (bundler, front 68); `../../../examples/jhonstart-counter/client.mjs` does it under node. Shipped into a consumer's `out/jhonstart/` by `shipMjsSidecars` — see the workspace `AGENTS.md` § Known defect for when that silently misses |
| `router.bp` | **compiled** | the **route snapshot** (front 26): `type RouterState(path, params, search, pattern, selected)` with `param`/`searchParam`/`segments`/`segment`, the package's ONE pair-list decoder `pairValue` (first match wins), `patternSegments`/`segmentAt`, and `decodePairs` — `std/querystring.parse` spelled here while that module's `slice` shim is dead on the erlang row (`repro/erlang-std-slice-shim/`), plus `snapshot()` over five dual-target cells and the one writer `fill(path, params, search, pattern, selected)`; the six hooks (`router`/`pathname`/`params`/`searchParams`/`selectedLayoutSegment`/`selectedLayoutSegments`, each `-> @Context<Element, _>`) and the six navigation verbs (`push`/`replace`/`back`/`forward`/`refresh`/`prefetch`) with `lastNavigation()` to read what one recorded. `Link` did NOT come along: it is front 27's `src/link.bp` |
| `router_runtime.mjs` | host (js) | the router's store (a module-global) and the History API half of `navigate`. The js twin of `sidecars/jhonstart_router.erl`, cell for cell, so `test/router_test.bp` is one set of assertions run on both rows |
| `sidecars/jhonstart_router.erl` | host (BEAM) | the same cells over the CALLING PROCESS's dictionary — a request is a process, the snapshot dies with it, two concurrent renders cannot see each other's route. **Not a `files` entry**: `shipErlSidecars` reads the `atom:fun(` qualifiers out of the emitted erlang and copies `src/sidecars/<atom>.erl`. The atom may not be `router` — an atom matching a module the build emitted is skipped, silently |
| `server.bp` | **compiled** | the **request** (front 28, promoted from `server.d.bp`): `type RequestData(method, path, params, query, headers, cookies)` with `param`/`queryParam`/`header`/`cookie` — each a plain `string`, `""` when absent, all four through front 26's `pairValue`; `request()` over six dual-target cells, the one writer `fillRequest(method, path, params, query, headers, cookies)`, the two shortcuts `cookies()`/`headers()`, and `#[@future] renderServerComponent(component: fn() -> @Future<Element>) -> @Future<string>` — one `await`, then a synchronous render, over an **unstarted thunk**. The pair-shaped values travel querystring-encoded and are decoded with `router.decodePairs`. The `Http` phantom base and the `Request` behavior did NOT come along (decision 89: `@Future<Element>` unwraps to the owner `Element`). Ships no escaping (front 01's) and no parallel awaiting (front 02's) |
| `server_runtime.mjs` | host (js) | the request store (a module-global). The js twin of `sidecars/jhonstart_server.erl`, cell for cell, so `test/server_test.bp` is one set of assertions run on both rows. It exists on this row because an **erlang-only cell reds the commonJS COMPILE at its call site** — measured, workspace `AGENTS.md` § *Why the request cells are jhonstart's own* |
| `client.bp` | **compiled** (front 29), PURE | the **server/client boundary**: `#[client]` (emits a PURE `__jhClient_<Name>() -> string`; refuses a non-`fn` and a fn whose reflected `returnType` is not `Element`, so a `#[@future]` server component — reflected `"Future"` — cannot be marked client) and `#[clientProps]` (on the props RECORD, because `@Decl` exposes no function parameters; whitelist `string`/`i32`/`f64`/`bool`, four names and not the spec's six because `Field.typeName` erases an array's element type), `islandId`/`islandAttrOf`/`islandAttr` — decision 77, `islandAttrOf` being the ONE occurrence of `"data-onze-i"` in this tree — `Island` + `clientMount` + `islandEntry` (front 26's `encodePairs`) + `propsOf`, `serverSlotAttr`/`serverSlot` (`data-onze-s="1"`, the Context-Provider hole) and the `serverOnly` poison pill. NO host cell of any target: `hydrate()` and `propsFor(name)` name front 68's generated `jhonstart/client-runtime` and are absent rather than stubbed. **It enforces four comptime refusals and nothing about the module graph** — front 68 is what makes the boundary a guarantee |
| `sidecars/jhonstart_server.erl` | host (BEAM) | the request's six cells + `fill/6` over the CALLING PROCESS's dictionary — a request is a process, the request data dies with it, two concurrent renders cannot see each other's cookies. **Not a `files` entry**, same discovery as the router's. The atom is not `rakun_request_context`: rakun's member is `targets: ["commonJS"]` and has no BEAM row to bind to |

The four language gaps the framework surfaced are closed (spec
`jhonstart-language-gaps`, v0.beta.6) and now **used** here: types carry
function-typed fields (`set: fn(next: T)`, G1 — `State<T>` in `hooks.bp`),
labeled tuple types annotate transient hook shapes (G2 — `#(current: T)`,
`#(state: S, dispatch: fn(action: A))`), a function type returns an array (G3), and
`Element[]`/`Element`/`string` coerce into a `Children` parameter (G4 — the
builders' `children` arg and the `Element.children` field). The list form
(`div([a, b])`) is the rendering contract; the single/`string` forms type-check
(asserted in `element.bp`) but their render is the recorded normalization
follow-up (no runtime type tags to branch a lone child vs a list on).

This port also relies on a generic **cross-module** fix (a local component
returning an imported `Element`, fed to an imported `renderToString`/`use`, now
type-checks) — see `modules/compiler-core/src/comptime/AGENTS.md`
(`type_decl_registry` + `resolveTypeName`). It is lib-agnostic; the
`grep -riE "rakun|jhonstart"` gate stays clean.

Update this index in the same change that adds/renames a file, and keep
`../botopink.json`'s `files` list in sync — `root.bp` first, then every module a
consumer may import. A workspace member that is a library and lists no `files`
ships nothing: `botopink test` inside it fails and every runner cell reads
`✗ ships nothing`.
