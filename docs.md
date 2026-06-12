# jhonstart — reference

> A React/Next-style UI framework written in botopink, on the language's own
> primitives. Status: **core + hooks + the `html` markup DSL implemented in real
> `.bp`** (`Element` tree, builders, synchronous `renderToString`, the
> `state`/`effect`/`memo`/`ref`/`reducer` family, and the `html """…"""` authoring
> DSL — all compiled & runtime-tested). Only the router and the Http server
> context remain declarative (`.d.bp`), each gated on a generic language gap (see
> **V1 limits**). Specs: `tasks/v0.beta.7/specs/jhonstart.md`,
> `tasks/v0.beta.8/specs/jhonstart-html.md`.

## Component model

A **component** is any `fn(...) -> Element`. A **hook** is any function whose
return implements `@Context<Element, _>`; the `use` prefix is only legal inside a
component body (enforced by the language's context-inference, not by jhonstart).

```bp
import { div, p, text, state, renderToString } from "jhonstart";

fn Counter() -> Element {
    val c = use state(0);
    return div([
        p([text("count: " + c.value.toString())]),
    ]);
}

fn main() {
    print(renderToString(Counter()));   // synchronous SSR — a pure string
}
```

Children are written as a **list** (`div([a, b])`). A hook yields its value via
`use`: `val c = use state(0)` binds `c : State<i32>` (`c.value`, `c.set(n)`); the
`{value, set}` form also destructures — `val {value, set} = use state(0)`.

## Hooks

Hook **bodies are pure and synchronous** — they model the first render (SSR):
`state` yields its initial value, `memo` computes eagerly, `effect` is a no-op,
`ref`/`reducer` seed their boxes. Client re-render reactivity is the host
runtime's job: the `use` prefix lowers to the target's hook convention (React
`useState`/`useEffect`/… on `commonJS`).

| Hook | Returns (via `use`) | Notes |
|---|---|---|
| `state<T>(initial)` | `State<T>` = `{value: T, set: fn(next: T)}` | local state + setter |
| `effect(run, deps)` | `{}` | side effect after render (void) |
| `memo<T>(compute, deps)` | `T` | memoized value (computed eagerly in SSR) |
| `ref<T>(initial)` | `{current: T}` | mutable handle |
| `reducer<S,A>(reduce, init)` | `{state: S, dispatch: fn(action: A)}` | reducer state |

Custom hooks compose the primitives — their return implements
`@Context<Element, _>`, propagated transitively:

```bp
fn useCounter(start: i32) -> @Context<Element, State<i32>> {
    return state(start);
}
```

## DOM builders & rendering

`text(value)` is an explicit text node; `fragment(children)` groups siblings
with no wrapper; `div`/`span`/`p`/`h1`/`ul`/`li` are element builders. Each takes
a `Children` argument, so the call site can pass a **list** (`div([a, b])`), a
single `Element`, or a `string` (the G4 coercion). The **list form is what V1
renders** (and what the `html` DSL emits); a lone-child / `string` argument
type-checks but its render is a recorded follow-up.

`renderToString(e)` serializes a tree to HTML, purely and synchronously:

```bp
renderToString(div([p([text("hi")]), text("!")]))   // "<div><p>hi</p>!</div>"
```

## The `html` DSL — shipped (`html.bp`)

`html` captures markup **unevaluated** (`@Expr<string>` — the `"""…"""`
triple-quoted literal) and expands it, at compile time, into the `Element` builder
pipeline — at zero runtime cost. Its body is a real markup front-end (a lexer →
token stream → stack parser, the sibling of erika's `erika "…"` SQL form), so it
returns `@ExprCustom<Element>`: the executable builder code PLUS a generic
`CustomNode` reference tree the language server reads to highlight and navigate
the markup (tags, attributes, text), with each `<div>` tied to the builder it
resolves to. `val page = html """…"""` compiles straight to the builder calls;
`html` never reaches codegen.

```bp
import { html, Element, div, p, text, renderToString } from "jhonstart";

val name = "world";
val page = html """
<div>
  <p>hello, ${name}</p>
</div>
""";

fn main() {
    @print(renderToString(page));   // <div><p>hello, world</p></div>
}
```

The expansion is:

- a lowercase `<tag>` → a bare `tag([...])` call resolved in **the caller's
  scope** (the expr-template `lookup` model), so the caller must `import` the
  builders the markup names (`div`/`p`/`li`/…); an unknown tag surfaces as an
  unbound diagnostic at the call site, pointing inside the template;
- a text run → a `text("…")` leaf (whitespace-only runs between tags are dropped,
  so the markup can be indented);
- each `${expr}` → the caller's already-typed expression, spliced as a
  `text(<expr>)` child (`html """<li>item ${n.toString()}</li>"""` →
  `li([text("item "), text(n.toString())])`).

A single root tag is returned bare; multiple top-level siblings wrap in
`fragment([...])` (which then must be imported too). Attributes (`<div
class="card">`) are parsed and surface in the reference tree for tooling, but —
as before — do not change the built `Element` (the builders take only
`Children`). A mismatched, unexpected, or unclosed tag is a `q.failAt`
diagnostic pinned to the offending tag inside the template (e.g. `html
"""<div><p>hi</div>"""` → *mismatched closing tag `</div>`, expected `</p>`*),
not a whole-template error. Bare `html`/`div`/… are reached unqualified after
`import … from "jhonstart"` via the generic loader-bare binding. Capitalized
`<Component/>` markup lookup is a **future layer** — today a component is an
ordinary `fn(...) -> Element` (its body may itself author `html """…"""`) reused
by a plain call. See `examples/jhonstart-html`.

## App layer (Next-style) — declared, host-bound

- `useRouter() -> @Context<Element, Router>`, `Link(href, …)` — client navigation
  (host runtime; `Link` also needs an Element attribute slot for `href`).
- `request() -> @Context<Http, Request>` — server hook; used inside a server
  component (`*fn … -> @Future<Element>`).
- File routing (`app/`, `page.bp`, `layout.bp`, `[id]`) is a **convention** (V1),
  wired manually until a CLI/build step lands.
- `renderToString(app)` (SSR, real `.bp`) / client `mount` (host).

## V1 limits

- **Implemented now** (`element.bp` + `hooks.bp` + `html.bp`, compiled +
  `test {}`-checked): the `Element` record, builders (`Children` args, list-form
  render), a synchronous `renderToString`, the `state`/`effect`/`memo`/`ref`/
  `reducer` hook family (real SSR bodies), and the `html """…"""` markup DSL
  (comptime expansion to the builder pipeline). Author trees as `div([…])` or as
  `html """…"""`.
- **Gated / declarative** (each a generic core gap, none jhonstart-specific):
  - `router`/`server` host hooks (`useRouter`/`request`, `#[@external]`), `Link`
    and form controls (the `Element` model has no attribute slot for
    `href`/`value`/`onClick`), and `get`-accessor interfaces (`.d.bp` syntax);
  - the `*fn`/`await` data-loading path (`use-await-prefix`, `async-generators`);
  - the trailing-lambda children sugar (`div { … }`) and lone-child / `string`
    `Children` *rendering* (type-checks today; render needs normalization).
