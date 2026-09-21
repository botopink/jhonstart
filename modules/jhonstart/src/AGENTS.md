# jhonstart/modules/jhonstart/src/

> Path: `repository/jhonstart/modules/jhonstart/src/`
> Parent (workspace): [`../../../AGENTS.md`](../../../AGENTS.md)

Source for the `jhonstart` **core member** — the workspace member
`modules/jhonstart/`, which is what `from "jhonstart"` resolves to (the umbrella
`repository/jhonstart/botopink.json` is a workspace and answers no import).
Its manifest is `../botopink.json`: `src: "src/"`, `entry: "root.bp"`,
`target: "commonJS"`, and the `files` list below as the consumer surface; it
declares no `targets` and so inherits the workspace's `["commonJS", "erlang"]`.
The UI **core, hooks, and the `html` markup
DSL are real botopink** — an `Element` tree, builders, a synchronous SSR renderer,
the hook family, and the `html """…"""` comptime expander, all implemented in
`.bp` (no host intrinsics, no async). Only the genuinely host-bound surface
(client navigation, the Http context) stays as `.d.bp` **declarations**, each
carrying an explicit "STILL GATED" note naming the gap. `botopink test` compiles
the `.bp` files and runs their `test {}` blocks; the `.d.bp` files are type
surface for consumers.

| File | Kind | Provides |
|---|---|---|
| `element.bp` | **compiled** | `type Element(…) implement @Context<Element, Element>` with a `Children` `children` field (the UI node AND the hook ContextBase), builders (`text`, `fragment`, `div`/`span`/`p`/`h1`/`ul`/`li` — take `Children`), `renderToString` (pure, synchronous), `test {}` (render + the G4 coercion) |
| `hooks.bp` | **compiled** | `type State<T>(value, set: fn(next: T))` (G1) + `state`/`effect`/`memo`/`ref`/`reducer` — nouns, no `use` prefix — returning `@Context<Element, _>` with real server-pass bodies (G2 labeled tuple types `#(current: T)`/`#(state: S, dispatch: fn(action: A))`), `test {}` calling the bodies directly + a `#[@context]` custom hook `counter` and a `#[@context]` component `Counter` (`use state`/`use memo`), rendered plainly as the server pass |
| `client_runtime.bp` | **compiled** (`mod`, not `pub mod`) | `clientRender(component, commit)` — the one `#[@External.Node("./client_runtime.mjs", "render")]` cell; its require ships the sidecar (G2). Never called from erlang. The five nouns are deliberately not re-declared (a second `state` shadows `hooks.state` across the flat package surface) |
| `client_runtime.mjs` | host (js) | the client build's hooks: `state`/`effect`/`memo`/`ref`/`reducer` with hook semantics + `render(component, commit)` over jhonstart's own loop (cursor-indexed cells, microtask-batched re-render, effects after commit by `deps`); first-render values outside a render. The client build resolves `jhonstart/hooks` to it (bundler, front 68); `../../../examples/jhonstart-counter/client.mjs` does it under node. Shipped into a consumer's `out/jhonstart/` by `shipMjsSidecars` — see the workspace `AGENTS.md` § Known defect for when that silently misses |
| `html.bp` | **compiled** | `html(comptime template: @Expr<string>) -> @ExprCustom<Element>` — the JSX-like `html """…"""` DSL with a real markup front-end: ① a native-JS-only **lexer** walks `template.parts()` into a token stream (tags/attrs/text/holes, each carrying a byte `Span`), ② a **flat stack parser** lowers it twice — to the builder pipeline (`<tag>` → `tag([...])`, text → `text("…")`, `${expr}` → `text(<code>)`, lowercase tags resolved in the **caller's** scope) AND to a generic `CustomNode` reference overlay (tags `label "tag"` + `q.lookup` `ref`, attrs `property`, values/text `string`, holes neutral), returned together via `q.custom(...)`. Mismatched/unexpected/unclosed tags → `q.failAt(span, …)` at the offending tag. Sibling of erika's `erika "…"` SQL front-end. Exercised by `test/html_test.bp` (parity) + the `jhonstart-html` example member. See the file header for the comptime-eval constraints (no `?T`, no in-body comments, helper closures at fn level not nested in the loop, `i32` cursor only in the flat parser loop) |
| `router.d.bp` | declarative (GATED) | `Router`, `router` (the hook — `val r = use router()`), `Link` — host-bound navigation (fields read as zero-argument methods); `#[@External.Node]` + no Element attribute slot |
| `server.d.bp` | declarative (GATED) | `Http` ContextBase: `Request`, `request()` — host-bound + async loaders |

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
