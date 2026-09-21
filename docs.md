# jhonstart — reference

> A React/Next-style UI framework written in botopink, on the language's own
> primitives. Status: **core + hooks + the `html` markup DSL implemented in real
> `.bp`** (`Element` tree, builders, synchronous `renderToString`, the
> `state`/`effect`/`memo`/`ref`/`reducer` family, and the `html """…"""` authoring
> DSL — all compiled & runtime-tested). Only the router and the Http server
> context remain declarative (`.d.bp`), each gated on a generic language gap (see
> **V1 limits**). Specs: `tasks/v0.beta.7/specs/jhonstart.md`,
> `tasks/v0.beta.8/specs/jhonstart-html.md`.

## Loading

`repository/jhonstart/` is a **workspace** (`"workspaces": ["modules/*", "examples/*"]`,
decision 75 of 1.0.10-beta); the library is its member `modules/jhonstart/`, and
`from "jhonstart"` resolves to that member, never to the umbrella. Declare it as
a dependency — `dependencies` is the object form, exactly one source per entry
(decision 76) — and import what you need:

```jsonc
// botopink.json
{ "name": "myapp", "target": "commonJS", "src": "src/", "entry": "main.bp",
  "dependencies": { "jhonstart": { "git": "https://github.com/botopink/jhonstart.git", "branch": "feat" } } }
```

```jsonc
// …or, from a sibling member of jhonstart's own workspace — which is what
// examples/jhonstart-{counter,html,todo}/ use:
{ "dependencies": { "jhonstart": { "workspace": true } } }
```

```bp
import { html, div, p, text, state, effect, renderToString } from "jhonstart";
```

The loader walks up from `cwd` and, at each ancestor, considers these roots
(nearest-first): the ancestor itself when its `botopink.json` is a workspace,
`repository/botopink-lang/libs`, `repository/`, a legacy flat `libs/`, then
`.botopinkbuild/deps/`. A root contributes every immediate child holding a
`botopink.json` **and every member of a workspace found there, named by its own
manifest** — so `repository/` contributes `jhonstart` (the member
`repository/jhonstart/modules/jhonstart/`), `jhonstart-counter`,
`jhonstart-html` and `jhonstart-todo`, and never the umbrella. The member's
`files` — `root.bp`, `element.bp`, `hooks.bp`, `html.bp`, `elements.bp`,
`client_runtime.bp`, `router.d.bp`, `server.d.bp` — are the only modules a
consumer sees. A
`{ "workspace": true }` dependency consults no root at all. Nothing about
jhonstart is embedded; the compiler core never names it.

## Component model

A **component** is a `#[@context] fn(...) -> Element`. A **hook** is a function
named by its **noun** — `state`, `effect`, `memo`, `ref`, `reducer`, `router`;
never a `use` prefix in the name — whose return implements
`@Context<Element, _>`. The keyword `use` is the activation: `val c = use
state(0)` is legal only in a `#[@context]` body whose return type is `Element`
(a component) or is itself `@Context<Element, _>` (a custom hook), and every
`use` sits in the body's **static prefix** — before any `if`, `case`, `loop` or
`return`, at any nesting. A body without `#[@context]` that activates a hook is
`use-without-context-effect`; `#[@Context]` with a capital is an unknown
annotation silently ignored. All of this is the language's context-inference
(decision 88 of 1.0.10-beta), not jhonstart.

```bp
import { div, p, text, state, renderToString } from "jhonstart";

#[@context]
fn Counter() -> Element {
    val c = use state(0);
    return div([
        p([text("count: " + c.value.toString(), [])], []),
    ], []);
}

fn main() {
    print(renderToString(Counter()));   // synchronous SSR — a pure string
}
```

Children are written as a **list** (`div([a, b])`). A hook yields its value via
`use`: `val c = use state(0)` binds `c : State<i32>` (`c.value`, `c.set(n)`); the
`{value, set}` form also destructures — `val {value, set} = use state(0)`. A
binding never reuses the hook's name (`val r = use router()`, not `val router`).
Called **without** `use`, a hook is an ordinary call — the first-render value —
legal in any body; that is how the tests read the hooks.

## Hooks

Hook **bodies are pure and synchronous** — they model the first render (the
server pass): `state` yields its initial value, `memo` computes eagerly,
`effect` is a no-op, `ref`/`reducer` seed their boxes. `use f(x)` lowers to
`f(x)` on **every** backend — nothing is renamed to React's `useState`, no
dependency array is inferred (a hook that takes one declares it: `memo(compute,
deps)`). Client re-render reactivity is the **client runtime**'s job: see
*Client runtime* below.

| Hook | Returns (via `use`) | Notes |
|---|---|---|
| `state<T>(initial)` | `State<T>` = `{value: T, set: fn(next: T)}` | local state + setter |
| `effect(run, deps)` | `#()` | side effect after render (void) |
| `memo<T>(compute, deps)` | `T` | memoized value (computed eagerly in SSR) |
| `ref<T>(initial)` | `#(current: T)` | mutable handle |
| `reducer<S,A>(reduce, init)` | `#(state: S, dispatch: fn(action: A))` | reducer state |

Custom hooks compose the primitives — a noun for a name, `#[@context]` on the
fn, a return that implements `@Context<Element, _>`:

```bp
#[@context]
fn counter(start: i32) -> @Context<Element, State<i32>> {
    val s = use state(start);
    return s;
}

#[@context]
fn Widget() -> Element {
    val c = use counter(5);   // `use` + the noun; never `use useCounter()`
    …
}
```

## Client runtime

The client build resolves `jhonstart/hooks` to `jhonstart/client_runtime.mjs`
(`modules/jhonstart/src/client_runtime.mjs`, shipped next to the emitted modules
by `botopink build`): the same five nouns, the same signatures and shapes, over jhonstart's
own minimal render loop — cursor-indexed cells (the static-prefix rule is what
keeps the order stable), `set`/`dispatch` schedule one re-render per microtask,
effects run after commit when their `deps` change; `render(component, commit)`
drives a component and hands every committed tree to `commit`. Outside a render
every cell yields its first-render value, so the module is a drop-in for the
pure bodies. The substitution itself is the client bundler's step (front 68,
1.0.10-beta); under node it is a `require.cache` seed — `examples/jhonstart-
counter/client.mjs` runs the built `Counter` that way and prints the re-renders
after `set(3)` and `set(-2)`. `modules/jhonstart/src/client_runtime.bp` carries
the one bp-typed cell, `clientRender`, whose
`#[@External.Node("./client_runtime.mjs", "render")]`
is what makes the CLI ship the sidecar (a miss is silent — see `AGENTS.md`
§ Known defect); the five nouns are not re-declared in
bp, because a package's import surface is flat and a second `state` would
shadow `hooks.state` for every consumer.

## DOM builders & rendering

`text(value)` is an explicit text node; `fragment(children)` groups siblings
with no wrapper; `div`/`span`/`p`/`h1`/`ul`/`li` are element builders. Each takes
a `Children` argument, so the call site can pass a **list** (`div([a, b])`), a
single `Element`, or a `string` (the G4 coercion). The **list form is what V1
renders** (and what the `html` DSL emits); a lone-child / `string` argument
type-checks but its render is a recorded follow-up.

`renderToString(e)` serializes a tree to HTML, purely and synchronously:

```bp
renderToString(div([p([text("hi", attrs: [])], attrs: []), text("!", attrs: [])], attrs: []))
// "<div><p>hi</p>!</div>"
```

**Every call spells `attrs:`, inner ones included.** The declared default
(`attrs: Array<#(string, string)> = []`) is part of every builder's signature,
but the compiler does not apply a declared parameter default at the call site
today, so omitting the argument is an arity error rather than an empty list.

## The element surface (`elements.bp`)

`element.bp` is frozen at eight constructors. `elements.bp` carries the rest of
the tag set in exactly the same shape, so a reader cannot tell from a call site
which of the two a tag came from:

```bp
pub fn <tag>(children: Children, attrs: Array<#(string, string)> = []) -> Element
```

Children positional, `attrs:` labeled. The shape is not a free choice: the
`html """…"""` DSL writes `tag([kids], attrs: [pairs])`, so a constructor of any
other arity is unreachable from the markup front-end.

Two builders and two predicates:

| Function | What it is |
|---|---|
| `el(tag: string, children: Children, attrs: Array<#(string, string)>) -> Element` | The single place an ordinary element is built — and the **escape hatch** for a tag the surface does not name: `el("figure", kids, attrs: [])` |
| `voidEl(tag: string, attrs: Array<#(string, string)>) -> Element` | The same, for an element that cannot have children: it stores none |
| `isVoidTag(tag: string) -> bool` | The HTML spec's void-element list — `area`, `base`, `br`, `col`, `embed`, `hr`, `img`, `input`, `link`, `meta`, `param`, `source`, `track`, `wbr`. Written once here so a void-aware renderer consults it instead of restating it |
| `isRawTextTag(tag: string) -> bool` | `script` and `style` — the two elements whose text content is raw text and must **not** be HTML-escaped. `title` and `textarea` are *escapable* raw text, where escaping is correct, and are deliberately absent |

### The tags

| Group | Constructors |
|---|---|
| in `element.bp` (frozen) | `text`, `fragment`, `div`, `span`, `p`, `h1`, `ul`, `li` |
| sectioning and flow | `a`, `nav`, `section`, `article`, `header`, `footer`, `main`, `aside` |
| headings and text-level | `h2`, `h3`, `h4`, `h5`, `h6`, `label`, `timeTag` |
| forms | `form`, `button`, `select`, `option`, `textarea` |
| tables | `table`, `thead`, `tbody`, `tr`, `th`, `td` |
| document | `htmlTag`, `head`, `body`, `title`, `script`, `style` |

Anything else is `el("<tag>", children, attrs: [])`.

### Three names that could not be the obvious one

| Tag | Constructor | Why |
|---|---|---|
| `<html>` | `htmlTag` | `html` is already a `pub fn` in this package — the `html """…"""` template fn — and two `pub fn html` reachable from `import {…} from "jhonstart"` is a collision. The DSL keeps the name |
| `<time>` | `timeTag` | `time` is a std module, and a consumer doing `import {time} from "std"` in the same file would collide |
| `<main>` | `main` | Shipped under its own name, because the consuming fronts import it that way |

**The `main` caveat.** A module that declares the program entry point `fn main()`
must not also `import {main} from "jhonstart"` in that same module. The remedy is
`el("main", children, attrs: [])`. Import aliasing is *not* a remedy: `import
{main as mainTag} from "jhonstart"` parses, but nothing outside the parser reads
the alias for a package import, so the binding still lands under `main`.

**Attribute values are stored verbatim.** A constructor never escapes: an `href`
of `/a&b` is kept as `/a&b`. Escaping happens once, at render, in the renderer
that emits HTML; doing it in the constructor as well would double-escape the
moment both layers are present, and a constructor cannot know whether its output
is bound for HTML, for a payload envelope, or for a test.

**`renderToString` is not void-aware.** It is `element.bp`'s in-repo test
renderer and writes a closing tag unconditionally, so
`renderToString(el("br", [], attrs: []))` answers `<br></br>`. That is why the
void set is *exported* rather than applied here: the renderer that ships reads
`isVoidTag`.

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

- `router() -> @Context<Element, Router>` (`val r = use router()`), `Link(href,
  …)` — client navigation (host runtime; `Link` also needs an Element attribute
  slot for `href`).
- `request() -> @Context<Http, Request>` — server hook; used inside a server
  component (`#[@future] fn … -> @Future<Element>` — the legacy `*fn`
  carrier was removed in v0.beta.19). A `#[@future]` body cannot carry
  `#[@context]` today (`effect-duplicate-annotation`: at most one
  `#[@<effect>]` annotation per fn), so a server component
  cannot activate it yet — question 90 of 1.0.10-beta.
- File routing (`app/`, `page.bp`, `layout.bp`, `[id]`) is a **convention** (V1),
  wired manually until a CLI/build step lands.
- `renderToString(app)` (SSR, real `.bp`) / client `mount` (host).

## V1 limits

- **Implemented now** (`element.bp` + `hooks.bp` + `html.bp`, compiled +
  `test {}`-checked): the `Element` type, builders (`Children` args, list-form
  render), a synchronous `renderToString`, the `state`/`effect`/`memo`/`ref`/
  `reducer` hook family (real SSR bodies), and the `html """…"""` markup DSL
  (comptime expansion to the builder pipeline). Author trees as `div([…])` or as
  `html """…"""`.
- **Gated / declarative** (each a generic core gap, none jhonstart-specific):
  - `router`/`server` host hooks (`router`/`request`, `#[@External.Node]`), `Link`
    and form controls (the `Element` model has no attribute slot for
    `href`/`value`/`onClick`) — `Router` and `Request` expose their fields as
    zero-argument methods (`router.pathname()`, `req.params()`);
  - the `#[@future]` + `await` data-loading path (`use-await-prefix`,
    `async-generators`);
  - the trailing-lambda children sugar (`div { … }`) and lone-child / `string`
    `Children` *rendering* (type-checks today; render needs normalization).
