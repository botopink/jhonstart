# jhonstart — reference

> A React/Next-style UI framework written in botopink, on the language's own
> primitives. Status: **core + hooks + the element surface + the `html` markup
> DSL implemented in real `.bp`** (`Element` tree, builders, the forty-six HTML
> constructors, synchronous `renderToString`, the
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
`files` — `root.bp`, `element.bp`, `hooks.bp`, `html.bp`, `router.bp`,
`elements.bp`, `client_runtime.bp`, `server.d.bp` — are the only modules a
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
    @print(renderToString(Counter()));   // synchronous SSR — a pure string
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
| **void** | `input`, `img`, `meta`, `link`, `br`, `hr` |

Anything else is `el("<tag>", children, attrs: [])`, or `voidEl("<tag>",
attrs: [])` when it cannot have children.

A void constructor keeps the same two-parameter shape and **drops** the
children it was handed — `input([text("x", attrs: [])], attrs: []).children` is
empty. The one-parameter `input(attrs:)` that would make children an arity
error was rejected: it is a second convention, and it is unreachable from the
`html """…"""` DSL's call shape.

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

**A void element cannot be authored inside `html """…"""`.** The DSL lowers a
self-closing tag to a one-positional-argument call and flushes it after the
token loop rather than at its position, so `<div><img/></div>` would be both
an arity error (a declared default is not applied) and misplaced. Build void
elements with the constructor and interpolate the result. `<html>` in markup
is doubly unavailable: the tag would resolve to the DSL's own `html`.

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

**A tag from `elements.bp` is resolved the same way** — there is no wildcard
import and no implicit prelude, so the consumer names every tag the markup
uses:

```bp
import { html, bracketPair } from "jhonstart";                // the DSL
import { nav, span, text, renderToString } from "jhonstart";  // the tags

val bar = html """<nav><span>home</span></nav>""";
```

(`bracketPair` is named because a `[attr]={expr}` hole lowers to a call to it.)
A tag that is not imported is an unbound-name diagnostic at the call site,
which names the tag — the one case where the surface being a plain set of
functions is an advantage.

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

## The router (`router.bp`) — compiled

`router.bp` is a real module since front 26 of 1.0.10-beta; `router.d.bp` is
gone. What a component asks for is a **route snapshot**: a five-field record
the server fills before the render and the client rebuilds after a client-side
navigation, so the same component code produces the same markup on both sides.

```bp
pub type RouterState(
    path: string,                       // "/blog/hi"
    params: Array<#(string, string)>,   // [#("slug", "hi")]
    search: Array<#(string, string)>,   // [#("sort", "new")]
    pattern: string,                    // "/blog/[slug]"
    selected: i32,                      // the layout depth, root layout 0
)
```

Field names and method names are **disjoint** — `params` is the field,
`param(name)` the method — so a field read never shadows a method.

| Call | Answers |
|---|---|
| `r.param(name)` | the path parameter, `""` when absent |
| `r.searchParam(name)` | the query parameter, `""` when absent |
| `r.segments()` | the pattern's segments, root-first, bracket spelling kept — `"/blog/[slug]"` → `["blog", "[slug]"]` |
| `r.segment()` | the segment at `selected`, `""` out of range |

Nothing returns `?string`. A matched route's parameter is always present and
`""` is the natural answer for one that is not — the shape `rakun`'s
`http.bp` accessors already use.

`segments` is **derived** from `pattern`, never transported. One value, one
source: a segment list that travelled separately could disagree with the
pattern it came from, and the disagreement would only show on the routes
nobody tested.

### `pairValue` — the package's one pair-list decoder

```bp
pub fn pairValue(pairs: Array<#(string, string)>, name: string) -> string
```

The **first** match of a duplicated key, `""` when there is none. It is `pub`
and it is the only one: fronts 28 and 32 import it from here rather than each
growing a copy, because three implementations of "the value of `slug`, or the
empty string" is three chances to disagree about a duplicate key.

It is a `loop` over a typed parameter, not
`pairs.find({…}).unwrapOr(#("", ""))._1`. A tuple read off a value that came
back through the optional binder loses its type on the erlang row — the same
measurement that made rakun's front 22 spell `paramOf(m, name)` and front 23
`chunkAt(page, i)`. `patternSegments` and `segmentAt` are typed-parameter
readers for the same reason.

### `decodePairs` — and why it is not `querystring.parse`

```bp
pub fn decodePairs(query: string) -> Array<#(string, string)>
```

`std/querystring.parse` is what this front's spec calls for, and it cannot run
on the front's assigned target. `libs/std/src/querystring.bp:22` writes
`query.slice(1, query.length)`; reached through `from "std"` that module emits
a call to a bare local `slice/3` on the erlang row and never defines it, so
`erlc` refuses the module (`undefined_function {slice,3}`), the test runner's
sibling loader skips a module that does not compile, and the first
`querystring.parse` call dies `{error,undef}`. The same `s.slice(a, b)` in a
project module lowers correctly to an emitted `string_slice/3` — the loss is
specific to a `libs/std` module compiled as a dependency.
`repro/erlang-std-slice-shim/` is the jhonstart-free package.

`encodePairs(pairs) -> string` is the inverse, here for the same reason:
`querystring.stringify` has no `slice` of its own, but it lives in the module
`stripPrefix` kills, and a module `erlc` refuses takes its whole surface down
with it. No leading `?` — the caller adds it when composing a URL. Front 27's
href arithmetic uses these two rather than a third copy.

`decodePairs` is querystring's documented behaviour spelled here: a leading `?`
is stripped, `""` decodes to `[]` (never `[#("", "")]`), empty chunks are
dropped, duplicate keys are preserved in order, and a chunk with no `=` decodes
to an empty value. One divergence, in this one's favour: `a=b=c` keeps `b=c`
where querystring's `split("=")` keeps only `b` — an input querystring's own
header records as not round-tripping. When the shim defect closes this becomes
`querystring.parse` and nothing else moves.

### The snapshot, the five cells and `fill`

```bp
pub fn snapshot() -> RouterState
pub fn fill(path, params, search, pattern, selected) -> i32
```

`snapshot()` reads five host cells and builds the record. Each read maps
**one-to-one** onto a key of rakun front 23's payload envelope, so the record
the server builds and the record the client rebuilds are built from the same
five values:

| `RouterState` field | cell | payload key (front 23) |
|---|---|---|
| `path` | `__jhRoutePath()` | `p` — the pathname |
| `params` | `__jhRouteParams()` | `m` — querystring-encoded |
| `search` | `__jhRouteSearch()` | `q` — querystring-encoded |
| `pattern` | `__jhRoutePattern()` | `r` — the matched pattern, bracket spelling kept |
| `selected` | `__jhRouteSelected()` | — per-layout, supplied during the render |

The two pair-shaped values travel querystring-encoded. No JSON, no record
serialization, nothing that has to agree between an Erlang term and a JS
object. `snapshot()` performs no `?T` unwrap that can fail: `decodePairs`
answers `[]` for an empty string and every cell answers a total value.

`fill` is the one writer, and it is `pub` **surface**, not an internal. The
five values go in together — a half-updated snapshot is a component reading the
previous route's params against the next route's pattern. A server adapter
calls it once per request; a client transition calls it with the values the
`__onze` payload carried, then re-renders. Nothing here is reactive: the router
is a snapshot, not a subscription.

Both halves ship with the package:

| row | host | store |
|---|---|---|
| commonJS | `src/router_runtime.mjs` | a module-global |
| erlang | `src/sidecars/jhonstart_router.erl` | the calling process's dictionary — a request is a process, the snapshot dies with it, and two concurrent renders cannot see each other's route |

An unfilled snapshot answers `""`/`[]`/`0` rather than raising: rendering a
component outside a request is a legitimate thing to do, and it is how the
package's own tests render the server pass.

**Every cell carries both targets.** The front's spec calls for the five reads
to be `#[@External.Erlang]` only; that is not writable. This module is compiled
on both rows of the core member, and an erlang-only cell reds the commonJS row
at its *call site* (`` `__jhRoutePath` has no `#[@External.<Target>(…)]` for the
node backend ``) the moment `snapshot()` calls it — a declared and never-called
cell is fine, which is why `client_runtime.bp`'s node-only `clientRender` does
not red the erlang row. The dual form is also what the mechanism needs: the
client rebuilds the snapshot on every transition and cannot do that through a
cell that exists only on the server.

### The six hooks

Next.js splits route state into five hooks over one internal record
(`useRouter`, `usePathname`, `useParams`, `useSearchParams`,
`useSelectedLayoutSegment(s)`). jhonstart spells them as **nouns** — the keyword
`use` is the activation and the name is the noun — so there is no `useRouter`
and never a doubled `use usePathname()`.

```bp
pub fn router() -> @Context<Element, RouterState>
pub fn pathname() -> @Context<Element, string>
pub fn params() -> @Context<Element, Array<#(string, string)>>
pub fn searchParams() -> @Context<Element, Array<#(string, string)>>
pub fn selectedLayoutSegment() -> @Context<Element, string>
pub fn selectedLayoutSegments() -> @Context<Element, Array<string>>
```

```bp
#[@context]
fn ActiveNav() -> Element {
    val here = use pathname();
    val seg = use selectedLayoutSegment();
    val ps = use params();
    return div([
            span([text(here, attrs: [])], attrs: []),
            span([text(seg, attrs: [])], attrs: [#("class", "active")]),
            span([text(pairValue(ps, "slug"), attrs: [])], attrs: []),
        ], attrs: []);
}
```

The binding never reuses the hook's name (`val r = use router()`, never
`val router = …`): a local that shadows a module-level `pub fn` shadows it for
an importer too.

`selectedLayoutSegments()` answers **root-first**, because `pattern` is
root-first and `segments` is derived from it by dropping the empty parts —
nothing on the path reorders.

**`use` is not decoration.** `use f(x)` lowers to `f(x)` on every backend, so a
hook is also an ordinary call and the server render uses it that way. But a
hook called *without* `use` keeps its `@Context<Element, T>` type, and that
type is transparent to a property or a method (`ps.length`, `segs.join("/")`,
`r.param("slug")`) and **not** to a typed parameter:

```bp
val ps = params();
pairValue(ps, "slug")   // type mismatch: expected array, got Context
```

Binding through a `val` does not change it — only `use` strips the capability,
and inside a `#[@context]` body `pairValue(use params(), …)` is exactly the
array. So a hook whose `T` is an array is usable as a value only under `use`;
`pathname()` and `selectedLayoutSegment()`, whose `T` is a `string`, compare
directly either way.

### The navigation verbs

botopink records are immutable and there is no assignment to a `self` field
anywhere in the tree, so navigation cannot be a method on `RouterState`. It is a
call against host state, and the record is a read-only snapshot of that state.
The six are free functions over one cell:

```bp
pub fn push(href) -> i32       pub fn back() -> i32      pub fn refresh() -> i32
pub fn replace(href) -> i32    pub fn forward() -> i32   pub fn prefetch(href) -> i32
```

| Verb | erlang (during a server render) | js (in the browser) |
|---|---|---|
| `push(href)` | records a 307 redirect on the response | `history.pushState` + re-render |
| `replace(href)` | records a 307 redirect on the response | `history.replaceState` + re-render |
| `back()` / `forward()` | no-op — there is no history on the server | `history.back()` / `history.forward()` |
| `refresh()` | no-op | re-requests the current route's payload and re-reconciles without a reload |
| `prefetch(href)` | no-op | warms the client route cache; front 27 drives it |

The `-> i32` is the ecosystem's shape for a host cell whose value is not used
(`rakun/src/runtime.bp` does the same for `rkScan`/`rkEnter`/`rkDone`). It is
not a status code and callers ignore it.

```bp
pub fn lastNavigation() -> string
```

What the last verb recorded, as `"<kind> <href>"`, and `""` when nothing has.
On the server this is the redirect a dispatcher turns into a 307; in the
browser it is the last href the History API was handed. It is `pub` because a
verb that records where nobody can look is a verb that does nothing.

A navigation never disturbs the snapshot: `fill` is the only writer of route
state, and the suite asserts that a `push` leaves the current `path` and
`params` exactly as they were.

## App layer (Next-style) — declared, host-bound

- `Link(href, …)` — client navigation (front 27's `src/link.bp`; not shipped
  yet). The router itself is no longer declared: see *The router* above.
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

- **Implemented now** (`element.bp` + `elements.bp` + `hooks.bp` + `html.bp`, compiled +
  `test {}`-checked): the `Element` type, builders (`Children` args, list-form
  render), the element surface (`el`/`voidEl`, `isVoidTag`/`isRawTextTag` and
  thirty-eight further tag constructors), a synchronous `renderToString`, the
  `state`/`effect`/`memo`/`ref`/`reducer` hook family (real SSR bodies), the
  route snapshot and its six hooks and six navigation verbs (`router.bp`, with
  both host halves), and the `html """…"""` markup DSL
  (comptime expansion to the builder pipeline). Author trees as `div([…])` or as
  `html """…"""`.
- **Gated / declarative** (each a generic core gap, none jhonstart-specific):
  - the `server` host hook (`request()`, `#[@External.Node]`) — `Request`
    exposes its fields as zero-argument methods (`req.params()`). The router is
    no longer here: `router.bp` is compiled, with both host halves shipped (see
    *The router*). `Link` and the form controls are no longer gated on an
    attribute slot either: `Element` carries `attrs`, and `elements.bp` ships
    `form`/`input`/`button`/`label`/`select`/`textarea`; `Link` is front 27's
    `src/link.bp` and it reads the router rather than replacing it;
  - the `#[@future]` + `await` data-loading path (`use-await-prefix`,
    `async-generators`);
  - the trailing-lambda children sugar (`div { … }`) and lone-child / `string`
    `Children` *rendering* (type-checks today; render needs normalization).
