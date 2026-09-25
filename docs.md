# jhonstart — reference

> A React/Next-style UI framework written in botopink, on the language's own
> primitives. Status: **core + hooks + the element surface + the `html` markup
> DSL implemented in real `.bp`** (`Element` tree, builders, the forty-six HTML
> constructors, synchronous `renderToString`, the
> `state`/`effect`/`memo`/`ref`/`reducer` family, and the `html """…"""` authoring
> DSL — all compiled & runtime-tested). **No `.d.bp` remains**: 1.0.10-beta's
> front 26 promoted `router.d.bp`, front 28 promoted `server.d.bp`, and front 27
> landed `link.bp`/`reconcile.bp` as real modules. What is still gated is the
> *client* half — the delegated click handler, prefetch, link status and the
> reconciler driver — and it waits on onze front 68's generated bundle and rakun
> front 60's route-kind table, not on a language gap (see **V1 limits**).
> Specs: `tasks/v0.beta.7/specs/jhonstart.md`,
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
// examples/jhonstart-{counter,markup,todo}/ use:
{ "dependencies": { "jhonstart": { "workspace": true } } }
```

```bp
import { div, p, text, state, effect, renderToString } from "jhonstart";
import { html } from "jhonstart-html";   // the markup DSL is its own member
```

The loader walks up from `cwd` and, at each ancestor, considers these roots
(nearest-first): the ancestor itself when its `botopink.json` is a workspace,
`repository/botopink-lang/libs`, `repository/`, a legacy flat `libs/`, then
`.botopinkbuild/deps/`. A root contributes every immediate child holding a
`botopink.json` **and every member of a workspace found there, named by its own
manifest** — so `repository/` contributes `jhonstart` (the member
`repository/jhonstart/modules/jhonstart/`), `jhonstart-html` (the DSL member),
`jhonstart-test`, `jhonstart-counter`, `jhonstart-markup` and `jhonstart-todo`,
and never the umbrella. Each member's `files` — the core's `root.bp`,
`element.bp`, `hooks.bp`, `router.bp`, `elements.bp`, `client_runtime.bp`,
`server.bp`, …; `jhonstart-html`'s `root.bp`, `html.bp` — are the only modules a
consumer sees. A
`{ "workspace": true }` dependency consults no root at all. Nothing about
jhonstart is embedded; the compiler core never names it.

## Component model

A **component** that activates hooks is a `#[@use] fn(...) -> @Component<ElementBase, Element>`
(one that activates none is an ordinary `fn … -> Element`). A **hook** is a
`#[@use]` function named by its **noun** — `state`, `effect`, `memo`, `ref`,
`reducer`, `router`; never a `use` prefix in the name — returning
`@Component<ElementBase, _>`. `Element` carries the tree: `implement
@Context<ElementBase>`. The keyword `use` is the activation: `val c = use
state(0)` is legal only in a `#[@use]` body — a component or a custom hook
(decisions 102/104 of botopink 1.0.10-beta) — and every
`use` sits in the body's **static prefix** — before any `if`, `case`, `loop` or
`return`, at any nesting. A body without `#[@use]` that activates a hook is
`use-without-context-effect`; `#[@Context]` with a capital is an unknown
annotation silently ignored. All of this is the language's context-inference
(decisions 88, 102, 104 of 1.0.10-beta), not jhonstart. On commonJS every
`#[@use]` body is an `async function`: a component's caller `await`s it.

```bp
import { div, p, text, state, renderToString } from "jhonstart";

#[@use]
fn Counter() -> @Component<ElementBase, Element> {
    val c = use state(0);
    return div([
        p([text("count: " + c.value.toString(), [])], []),
    ], []);
}

#[@future]
fn main() -> @Future<void> {
    @print(renderToString(await Counter()));   // SSR — a pure string
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

Custom hooks compose the primitives — a noun for a name, `#[@use]` on the
fn, a return that implements `@Component<ElementBase, _>`:

```bp
#[@use]
fn counter(start: i32) -> @Component<ElementBase, State<i32>> {
    val s = use state(start);
    return s;
}

#[@use]
fn Widget() -> @Component<ElementBase, Element> {
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
| `<html>` | `htmlTag` | `html` is already the `html """…"""` template fn (member `jhonstart-html`), and a file importing the DSL beside the tags would bind two `html`s — a collision. The DSL keeps the name |
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
import { html } from "jhonstart-html";
import { Element, div, p, text, renderToString } from "jhonstart";

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
import { html } from "jhonstart-html";                                    // the DSL
import { bracketPair, nav, span, text, renderToString } from "jhonstart";  // the tags

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
`import … from "jhonstart-html"` / `from "jhonstart"` via the generic
loader-bare binding. Capitalized
`<Component/>` markup lookup is a **future layer** — today a component is an
ordinary `fn(...) -> Element` (its body may itself author `html """…"""`) reused
by a plain call. See `examples/jhonstart-markup`.

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
#[@use]
pub fn router() -> @Component<ElementBase, RouterState>
#[@use]
pub fn pathname() -> @Component<ElementBase, string>
#[@use]
pub fn params() -> @Component<ElementBase, Array<#(string, string)>>
#[@use]
pub fn searchParams() -> @Component<ElementBase, Array<#(string, string)>>
#[@use]
pub fn selectedLayoutSegment() -> @Component<ElementBase, string>
#[@use]
pub fn selectedLayoutSegments() -> @Component<ElementBase, Array<string>>
```

```bp
#[@use]
fn ActiveNav() -> @Component<ElementBase, Element> {
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

**`use` is not decoration.** A hook called *without* `use` answers its
`@Component<ElementBase, T>` — a future on commonJS, where every `#[@use]` body is an
`async function` — so an ordinary caller `await`s it (a `#[@future]` body or a
test):

```bp
val ps = await params();
pairValue(ps, "slug")
```

Inside a `#[@use]` body `pairValue(use params(), …)` is exactly the array.

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

## Server components (`server.bp`) — compiled

Promoted from `server.d.bp` (front 28). The declaration file listed three
blockers; all three are answered rather than carried. The async data layer is
**not** gated any more — `#[@future] fn … -> @Future<T>` with a statement-level
`await` compiles and RUNS on both rows, `test` blocks included — `request()`
keeps a host half and now ships it, and the `Http` phantom `@Context` base and
the `Request` behavior are **gone** (see `AGENTS.md` § *The `Http` base, and why
it is gone*).

### `RequestData` — the request as a record

```bp
pub type RequestData(
    method: string,
    path: string,
    params: Array<#(string, string)>,
    query: Array<#(string, string)>,
    headers: Array<#(string, string)>,
    cookies: Array<#(string, string)>,
)
```

Six fields, every plural one an `Array<#(string, string)>` — the shape the route
snapshot uses, the shape `decodePairs` produces and the shape `Element.attrs`
takes, so a value read off the request is handed straight to an attribute with
no conversion. No `Dict`: naming `dict.Dict<string, string>` as a type across a
module boundary is unexercised anywhere in this tree, and the pair list is what
actually crosses the wire.

There is **no `body` field**, and its absence is a decision: a render never
reads one. Form bodies are front 24's and route-handler bodies are front 25's.

| Accessor | Reads | Absent key |
|---|---|---|
| `r.param(name)` | `params` | `""` |
| `r.queryParam(name)` | `query` | `""` |
| `r.header(name)` | `headers` | `""` |
| `r.cookie(name)` | `cookies` | `""` |

Every accessor answers a plain `string` and never raises. That is the
ecosystem's decided shape and not laziness — rakun's `Request` does exactly this
— because an optional would force `.unwrapOr` at every call site in every page.
All four funnel through front 26's `pairValue`, so "the value of `slug`, or the
empty string" cannot mean two different things in one package; a duplicated key
answers the FIRST match, in every accessor.

Field names and method names are **disjoint** — `params` the field, `param(n)`
the method, `query` the field, `queryParam(n)` the method — so a field read
never shadows a method. `method` and `path` are plain fields with no accessor:
there is nothing to look up by name in a single string.

### The six cells, and where they point

```bp
pub fn fillRequest(method, path, params, query, headers, cookies) -> i32
pub fn request() -> RequestData
pub fn cookies() -> Array<#(string, string)>
pub fn headers() -> Array<#(string, string)>
```

`params`, `query`, `headers` and `cookies` travel **querystring-encoded**
(`k=v&k=v`), the same encoding the route snapshot's `m`/`q` use and the same
encoding front 23's payload carries. No JSON, no record serialization, nothing
that has to agree between an Erlang term and a JS object. They are decoded with
front 26's `decodePairs` — see *`decodePairs` — and why it is not
`querystring.parse`* above; that std module is dead on the erlang row.

The cells name **`jhonstart_server`** / **`./server_runtime.mjs`**, not front
62's `rakun_request_context`, and both halves ship with the module
(`src/sidecars/jhonstart_server.erl`, `src/server_runtime.mjs`) exactly as the
router's do. Two measurements force it, and `AGENTS.md` § *Why the request cells
are jhonstart's own* carries them: an erlang-only cell reds the **commonJS
compile** at its call site, and rakun's member is `targets: ["commonJS"]` so
`rakun_request_context` has no BEAM row to bind to at all. `fillRequest` is the
one writer and the seam front 62's dispatcher calls once per request — six
values at once, never one at a time, because a half-updated request is a
component reading the previous reader's cookie against this reader's path.

It is **not** the router's `fill` under another name and the two stores stay
separate on purpose: a route snapshot is re-filled DURING a render (its
`selected` is the layout depth and changes per layout) while a request is filled
once and is constant for the whole render.

`after()`, `connection()`, `draftMode()` and per-request memoization are front
62's and are called from there directly. `cookies()` and `headers()` are the
only two shortcuts re-exported here.

`request()` is a hook, `#[@use] pub fn request() -> @Component<ElementBase,
RequestData>`, activated `val r = use request()` inside a `#[@use]` server
component (decisions 102/104 of botopink 1.0.10-beta). Called without `use` it
answers the same `@Use` — a future on commonJS — so a `#[@future]` body or a
test `await`s it.

### The server-component convention

A server component is a `#[@future] pub fn` taking its route params and
returning `@Future<Element>`. There is no decorator for it and there will not be
one — the marker is `#[@future]`, and the language enforces it in **both**
directions:

| Written | Compiler says |
|---|---|
| `pub fn f() -> @Future<i32>` | `a function returning @Future/@ResultGenerator/@FutureGenerator/@Use/@Component needs an effect annotation` |
| `#[@future] pub fn f() -> i32` | `effect-wrapper-mismatch: `#[@future]` requires a `-> @Future<…>` return type` |
| `#[@future] #[@use] fn Page() -> @Future<Element>` | `effect-duplicate-annotation: at most one #[@<effect>] annotation per fn.` |
| `fn Widget() -> Element { val c = use state(0); }` | `use-without-context-effect: `use` needs `#[@use]` on the enclosing fn` |

Row three is why the chain matters: a server component that activates a hook
is `#[@use] fn … -> @Component<ElementBase, Element>` — `@Component` extends `@Future`, so
the one annotation grants `use` and `await` (decision 104 of botopink
1.0.10-beta; a `#[@future]` body activates nothing). `renderComponent` renders
its thunk. Both are asserted in `test/server_test.bp`.

```bp
#[@future]
pub fn renderServerComponent(component: fn() -> @Future<Element>) -> @Future<string>
```

Awaits exactly once and renders synchronously afterwards. The parameter is an
**unstarted thunk**, not an already-running `@Future<Element>`, so a page that
grows a second loader moves to front 02 without changing what it hands anybody.

> **Call it with a lambda, never with a bare function name.**
> `renderServerComponent({ -> Page(params) })` is green on both rows;
> `renderServerComponent(Page)` compiles on commonJS and fails
> `variable 'Page' is unbound` on erlang. A bare function name used as a value
> is a compiler defect, measured against `2e6bb4ac` and reported, not worked
> around. It is the same rule rakun's front 23 records for the fields of its
> `ElementView`.

### The loader convention, and why `@Future` being eager changes it

A loader is an ordinary `#[@future] fn name(args) -> @Future<T>`. `server.bp`
ships **no** loader machinery: `libs/std/src/http.bp:55` already has
`fetch(url) -> @Future<Response>`, a database loader is front 08's, and
parallel awaiting (`all`, `race`, `allSettled`) is **front 02's**.

**Every `await` is at statement level**, in the component or loader body. Never
as the last statement of a lambda: `§2.38` makes a lambda's last statement an
implicit-return expression and no file in this tree awaits inside one. So a
component that needs N rows awaits **one** loader returning `Array<T>` and maps
synchronously afterwards — not N awaits inside a `map`.

```bp
#[@future]
fn loadPost(slug: string) -> @Future<Post> { … }

#[@future]
pub fn PostPage(params: Array<#(string, string)>) -> @Future<Element> {
    val post = await loadPost(pairValue(params, "slug"));
    val comments = await loadComments(post.id);
    return article([
            h1([text(post.title, attrs: [])], attrs: []),
            ul(comments.map({ c -> commentRow(c); }), attrs: []),
        ], attrs: []);
}
```

**`@Future` is EAGER on the erlang row.** `libs/std/src/http.bp:16-18` states
it: *"Erlang is eager: `@Future<T>` resolves to `T` … so the caller's
`await fetch(url)` is identity on that backend."* Two `#[@future]` loaders do
**not** load in parallel because they are futures — they run in the order the
body reaches them and the page costs the **sum** of its loaders. Porting the
Next.js pattern shape-for-shape and stopping there produces a page slower than
the synchronous version.

The two above are **dependent** (`loadComments` needs `post.id`), so sequence is
what they actually are. When loaders are **independent** the answer is front
02's spawn-and-gather over **unstarted tasks** —
`[{ -> loadPost(slug) }, { -> loadSidebar() }]` — never a `map` over futures,
which would simply run them in order. jhonstart provides no second answer and
exports no `awaitAll`-style helper.

### Escaping is not this file's

`renderToString` writes `e.value` and every attribute value straight into the
output (`element.bp:56`, `:63-65`) and neither escapes. A server component
renders attacker-influenced text — a post body, a comment, a search term echoed
back — so every such value goes through front 01's `escape.html` (text) and
`escape.attribute` (attribute values) **at the point the untrusted value enters
the tree**. `server.bp` hand-rolls no escaping and re-exports none: front 01's
`libs/std/src/escape.bp` does not exist in compiler `2e6bb4ac` yet, and a
stand-in here would be a second answer to "what is an escaped `&`" the day it
lands. `test/server_test.bp` pins the unescaped answer so the change is a red
cell rather than a silent difference.

The `__onze` payload is front 23's to build and to escape. Nothing from
`server.bp` crosses to the client: a value read from a header or a cookie must
not be reachable from an island's props, and the check that it is not is front
68's build-time graph walk.

## Client navigation (`link.bp`, `reconcile.bp`) — compiled

Next.js splits `<Link>` into a **render-time** half and a **runtime** half. The
render-time half emits an anchor with the props encoded on it; the runtime half,
in the browser, intercepts the click, prefetches on viewport entry and performs
the transition. jhonstart keeps that split, and it is what lets a client front
render correctly during the server pass.

**The render-time half is what ships.** It reaches no host cell, so `Link`
renders identically on commonJS and on erlang, and every assertion in
`test/link_test.bp` and `test/reconcile_test.bp` RUNS on both rows.

### The props are a record, and why

`Link(href, children, prefetch = true, replace = false, scroll = true)` is the
signature anyone would write, and it does not work for a consumer. A trailing
declared default is filled at the call site for a declaration in the **calling
module**; it is still not filled for an **imported** one, and `Link` is imported
by construction. Measured against compiler `2e6bb4ac`, on both rows, against
jhonstart's own `text`:

```text
import { text } from "jhonstart";  text("hi")
error: 'text' expects 2 argument(s), got 1
```

So the props are a record and `linkProps(href)` fills Next's documented
defaults. Overriding one is a `with*` helper that returns a **new** record —
there is no assignment to a `self` field anywhere in this tree, and a record has
no copy-with-update expression.

| Function | Shape |
|---|---|
| `LinkProps(href, prefetch, replace, scroll, target, className)` | the six props, a plain record |
| `linkProps(href)` | Next's defaults: `prefetch` true, `replace` false, `scroll` true, no `target`, no `className` |
| `withPrefetch` · `withReplace` · `withScroll` · `withTarget` · `withClass` | `(p, value) -> LinkProps` — each changes one field and copies the other five |

```bp
Link(linkProps("/about"), [text("About", attrs: [])])
Link(withPrefetch(linkProps("/blog/" + slug), false), [text(title, attrs: [])])
```

### The anchor

`Link(props: LinkProps, children: Children) -> Element`. The props
travel to the browser as `data-` attributes **on the anchor**: there is no
second channel and no registry the server has to serialize. An attribute is
emitted only when it **differs** from the default, so a page with two hundred
links does not carry five redundant pairs on each of them.

| Prop | Attribute | Emitted when |
|---|---|---|
| `href` | `href="…"` | always |
| — | `data-onze-l="1"` | always — the marker the runtime queries for |
| `prefetch` | `data-onze-prefetch="0"` | only when `false` |
| `replace` | `data-onze-replace="1"` | only when `true` |
| `scroll` | `data-onze-scroll="0"` | only when `false` |
| `target` | `target="…"` | only when non-empty |
| `className` | `class="…"` | only when non-empty |

```text
renderToString(Link(linkProps("/about"), [text("About", attrs: [])]))
  == "<a href=\"/about\" data-onze-l=\"1\">About</a>"
```

`data-onze-` is the milestone's marker family; this front owns the link markers
inside it and adds no other vocabulary.

### The prefetch decision

`prefetchMode(kind, hasLoading, requested) -> string` is Next's documented rule,
as a pure function so that it is testable without a browser. Both inputs come
from **front 60**'s route-kind table; jhonstart computes neither.

| Route kind | `loading` boundary | Mode |
|---|---|---|
| `"static"` | — | `"full"` |
| `"dynamic"` | yes | `"partial"` |
| `"dynamic"` | no | `"skip"` |
| any | `prefetch: false` | `"skip"` |

An unknown kind is not static, so it falls through to the boundary question —
the conservative answer, which is the one a missing table should produce.

### Layout keys and the remount decision

A client transition must not remount a layout the two routes share, or the
sidebar's scroll position and every client component's state inside it are lost.
A layout is keyed by its **segment path** — never by its position in the tree.

| Function | Shape |
|---|---|
| `layoutKey(segments, depth)` | `"/" + segments.take(depth).join("/")`; root layout is `"/"`; a depth past the end is the whole path |
| `layoutKeys(segments)` | `layoutKey` at every depth, root-first and root included: `["docs","api"]` → `["/", "/docs", "/docs/api"]` |
| `sharedDepth(current, target)` | the length of the common prefix: `[0, keep)` stays mounted, `[keep, n]` is replaced |

`segments` is front 26's `RouterState.segments()`, derived from the matched
pattern, so the key a client transition computes and the key the server rendered
under are the same string. `sharedDepth` is never `0` — both lists start with
`"/"` — which is the same statement as "the root layout is never remounted".

### The in-flight status

`LinkStatus(pending, href)` is what a link renders a spinner from while its own
navigation is in flight, and `linkStatusOf(href)` is the whole derivation from
the href the browser half reports (`""` when idle).

### What is NOT shipped, and what it needs

The browser half is **not** written, and it is not stubbed either. Four cells
and one hook are missing, all of them blocked on fronts that have not started:

| Missing | Needs |
|---|---|
| `__onzeLinkMount()` — delegated click interception + an intersection observer over `[data-onze-l]` | front 68's generated client bundle (the module the cell binds to), which calls it once after hydrating the islands |
| `__onzeLinkPrefetch(href, mode)` — warms the client route cache | the same bundle |
| `__onzeLinkStatus() -> string` and `linkStatus() -> @Component<ElementBase, LinkStatus>` | the same bundle. The hook is then `return linkStatusOf(__onzeLinkStatus());` |
| `__onzeLinkRouteKind(href) -> string` | **front 60**'s route-kind table, emitted into that bundle |
| `reconcile(current, target)` — the transition driver | front 68's DOM primitives (mount/unmount), plus front 60's flag for whether the target payload had to be fetched |

Two measurements make stubbing them the wrong move rather than a shortcut:

1. A **called** node-only cell reds the **erlang** build at its call site —
   ``error: `__cellStatus` has no `#[@External.<Target>(…)]` for the erlang
   backend`` — and this module is compiled on both rows of the core member, so
   a `linkStatus()` wrapper would take every landed assertion off the erlang
   row. It is the mirror of the erlang-only → commonJS measurement `router.bp`
   and `server.bp` both carry.
2. A **declared and never called** node-only cell is fine (that is why
   `client_runtime.bp`'s `clientRender` does not red erlang) — but the module
   it names, `jhonstart/client-runtime`, does not exist, so the declaration
   would emit a `require` of a file nobody writes. A host stub returning an
   answer no one can check is exactly the shape `router.d.bp`'s one-line `Link`
   was, and the reason it never became real.

## The client boundary (`client.bp`) — compiled

Next.js `'use client'` does two things: it marks a module as the boundary, and it
makes everything imported from that module part of the client bundle. botopink
has no directive syntax and the milestone forbids compiler changes, so jhonstart
splits those two into the two places they belong: **`#[client]` marks the
component** (here), and **front 68 walks the module graph** (not here).

> **Read this first.** `#[client]` is a convention with four comptime refusals
> around it. **Front 29 defines the boundary; front 68 enforces it at build
> time.** 29 without 68 is a convention nobody walks — a secret read on the
> server still reaches the browser today if someone writes it into an island's
> props, and nothing in this package notices. § *What is checked today* below
> says exactly which line is which.

### `#[client]` — the marker

```bp
#[client]
#[@use]
pub fn LikeButton(props: LikeProps) -> @Component<ElementBase, Element> {
    val c = use state(props.likes);
    return button([text(c.value.toString() + " likes", attrs: [])], attrs: [
        #("data-onze-on-click", "LikeButton:like"),
    ]);
}
```

It is an ordinary `@Decl`-first comptime function. It emits **one pure
declaration** — `pub fn __jhClient_LikeButton() -> string { return
"LikeButton"; }` — and checks placement.

The emitted declaration is a pure function returning a string and **not** a call
into a runtime registry, deliberately: an `@emit` fires on *every* target, so
emitting a call into a Node-only cell would make every `#[client]` component
fail to link during the erlang server render — the exact case the boundary
exists to support. A pure marker links everywhere and carries the same
information; front 68 reads the set of `__jhClient_*` names off the graph.

`#[client]` is a decorator and `#[@use]` is the effect (decision 88), so the
two coexist on one component. A **server** component is `#[@future] fn … ->
@Future<Element>` and cannot be marked client: its reflected `returnType` is
`"Future"`, which the second check below rejects.

Applying it requires importing it — `import { client, clientProps } from
"jhonstart";` — and **`botopink check` cannot see the emitted name**: `check`
skips decorator invocation entirely, so `__jhClient_<Name>` reads as unbound
there. The gate is `botopink test`, never `check`.

### `#[clientProps]` — the serializable whitelist

The rule that actually causes production incidents is that props crossing the
boundary must be serializable. It is checked on the **record**, not on the
component, because `@Decl` exposes `fields`/`variants`/`methods`/`returnType`
and **does not expose a function's parameters** — so `#[client]` alone can check
nothing about props. That one omission is why the marker is split in two.

```bp
#[clientProps]
pub type LikeProps(postId: string, likes: i32)
```

The whitelist is **closed**: `string`, `i32`, `f64`, `bool`. Anything else is
refused rather than guessed at, with a message located at the declaration.
`Element` is not on it — a client component receives server-rendered children as
*children*, never as a prop.

**It is four names and not the six the front specified,** and that is a
deliberate tightening. `Field.typeName` cannot express `string[]` or `i32[]`:
measured against compiler `2e6bb4ac`, `Array<string>` and `Array<Element>` both
reflect as `"Array"` (the element type is erased) and `string[]`, a function
type and a tuple type all reflect as `""`. Admitting `"Array"` would admit an
array of `Element`s through a check whose whole purpose is to refuse exactly
that. So no array crosses today; an array-valued prop is spelled as an encoded
`string` until reflection can name its element type.

### The island — and the one place its marker is spelled

During the server render a client component contributes an **island**. The
element carries the id and nothing else; the component name and the encoded
props live in front 23's payload, in the `i` array as `[id, component, props]`,
which is how the client finds the island without parsing attributes off the DOM
— and what makes the boundary auditable: every crossing value is in one place,
in render order, and front 68 can walk it.

| Function | Shape |
|---|---|
| `islandId(ordinal)` | `0` → `"i0"` — what an ordinal is written as |
| `islandAttrOf(id)` | `#("data-onze-i", id)` — **the only occurrence of the attribute name in this tree** |
| `islandAttr(ordinal)` | `0` → `#("data-onze-i", "i0")` — decision 77's export |
| `Island(id, component, props)` | one island; `props` is `Array<#(string, string)>` |
| `clientMount(island, children)` | the placeholder: `<div data-onze-i="i0">…children…</div>` |
| `islandEntry(island)` | the payload row `#(id, component, "k=v&k=v")` |
| `propsOf(raw)` | the inverse decode; `propsOf("")` is `[]` |

```text
renderToString(clientMount(Island(id: "i0", component: "Counter",
                                  props: [#("start", "3")]), []))
  == "<div data-onze-i=\"i0\"></div>"

islandEntry(Island(id: "i0", component: "Counter", props: [#("start", "3")]))
  == #("i0", "Counter", "start=3")
```

**Decision 77 — one definition, passed in, never two that must agree.** Front 23
assigns the ordinals in render order and fills `RenderHooks.islandAttr` from
`islandAttr` rather than spelling the pair a second time; front 68's generated
entry imports the same function for the selector it walks. It must pass a
**lambda** — `islandAttr: { n -> islandAttr(n) }`, never the bare name — because
a bare function name used as a value lowers to an unbound erlang variable, and
the field must then be read into a local before it is called (`val f =
hooks.islandAttr; f(0)`).

The encoder is front 26's `encodePairs`, not `std/querystring.stringify`: that
module is dead on the erlang row, which is why front 26 spelled the codec in
`router.bp` in the first place. It does **not** percent-encode, so a prop value
containing `&` or `=` does not round-trip — front 26's codec to widen, not a
second answer to grow here. Nothing about the payload is escaped or built here;
front 23 collects the rows and escapes the script.

### The hole — `serverSlot`

A client component may wrap server-rendered children: the Context Provider
pattern puts a `'use client'` provider in the root layout with the entire server
tree inside it. The provider is client code; its children are not.

So the payload has a **hole**: inside `data-onze-i`, the subtree is server markup
the client must adopt as-is and must not re-render — re-rendering it would need
the server's data and the server's secrets. jhonstart marks the hole explicitly.

```text
renderToString(serverSlot([])) == "<div data-onze-s=\"1\"></div>"
```

Three rules follow, and **front 68** enforces all three:

1. a `data-onze-s` subtree is adopted by the client reconciler, never
   reconstructed;
2. a server component may be a *child* of a client component and never a *prop*
   of one — which is why `Element` is off the whitelist;
3. a client component may not read request scope: `request()`, `cookies()` and
   `headers()` are `server.bp`'s, and reaching them from a `#[client]` module is
   a build failure, not a runtime one.

### `serverOnly` — the poison pill

```bp
pub fn serverOnly() -> i32
```

`import 'server-only'` upstream is a module that exists only to fail the build
when it lands in the client graph. This is the same trick in botopink's
vocabulary: a module that touches the server imports `serverOnly`, and front 68
fails the build when a module reachable from a `#[client]` component imports it.
**The returned value is meaningless and is never read** — its presence in a
module's import list is the whole signal.

### What is checked today, and what is not

Enforced **today**, at comptime, as a refusal with no flag that turns it off
(decision 67 — a boundary that warns is a boundary that is ignored). Each is
located at the annotation; measured against compiler `2e6bb4ac`:

| Refusal | Message |
|---|---|
| `#[client]` on anything but a `fn` | `#[client] must annotate a function` |
| `#[client]` on a fn not returning `Element` (a server component is `"Future"`) | `#[client] must annotate a component returning Element` |
| `#[clientProps]` on an enum-shaped `type` | `#[clientProps] must annotate a record, not an enum` |
| a field outside the four-scalar whitelist | ``a client prop must be serializable; 'e' is Element`` |

**Not** enforced by anything in this package:

- that a `#[client]` component's parameter record carries `#[clientProps]` at
  all — `@Decl` has no parameters, so a client component declared with a bare
  `Element` parameter is accepted;
- that no module reachable from a `#[client]` component imports `serverOnly`, or
  `request`/`cookies`/`headers`;
- that the props written into the payload's `i` row are the ones the
  `#[clientProps]` record declares — `islandEntry` encodes what it is handed.

All three are module-**graph** predicates and there is no graph here.

### The front-68 contract

| Front 68 input | Produced by |
|---|---|
| the set of client component names | the `__jhClient_<Name>` functions `#[client]` emits |
| the island rows | `islandEntry` per island, collected into the payload's `i` key by front 23 |
| the island selector | `islandAttr(ordinal)` — decision 77, the only spelling of the pair |
| the client module graph | the transitive imports of every module declaring one |
| the poison-pill predicate | a module in that graph importing `serverOnly` |
| the request-scope predicate | a module in that graph importing `request`/`cookies`/`headers` from `server.bp` |

### What is NOT shipped, and what it needs

| Missing | Needs |
|---|---|
| `hydrate()` — walks every `[data-onze-i]`, decodes that island's props from the payload's `i` row and starts the component | front 68's generated module `jhonstart/client-runtime`, which the cell would bind to. It is the **per-island** hydrate point, not the bundle entry: front 68 generates the entry, which calls `hydrate()` and then front 27's link mount and front 67's form mount once each |
| `__onzeClientPropsRaw(name)` and the `propsFor(name)` wrapper over it | the same module. `propsFor` is then `return propsOf(__onzeClientPropsRaw(name));` and nothing else moves |
| every "may not" rule above | front 68's walk over the client module graph |

Neither cell is declared and neither is stubbed, for the two measurements
`link.bp` records for its own four cells and this file re-measured:

1. a **called** node-only cell reds the **erlang** build at its call site, and
   this module is compiled on both rows of the core member — a `propsFor`
   wrapper would take every landed assertion off erlang;
2. a **declared and never called** node-only cell is fine, but the module it
   names does not exist, so the declaration would emit a `require` of a file
   nobody writes — silently at build time, loudly at run time.

## App layer (Next-style) — declared, host-bound

- `Link` is no longer declared: see *Client navigation* above. `link.bp` and
  `reconcile.bp` are compiled and pure; what is still missing is the **browser
  half** — front 68's generated bundle and front 60's route-kind table.
  The router itself is no longer declared either: see *The router* above.
- The server context is no longer declared either: see *Server components*
  above. `server.bp` is compiled, with both host halves shipped.
- File routing (`app/`, `page.bp`, `layout.bp`, `[id]`) is a **convention** (V1),
  wired manually until a CLI/build step lands.
- `renderToString(app)` (SSR, real `.bp`) / client `mount` (host).

## V1 limits

- **Implemented now** (`element.bp` + `elements.bp` + `hooks.bp`, and `html.bp` in `jhonstart-html`, compiled +
  `test {}`-checked): the `Element` type, builders (`Children` args, list-form
  render), the element surface (`el`/`voidEl`, `isVoidTag`/`isRawTextTag` and
  thirty-eight further tag constructors), a synchronous `renderToString`, the
  `state`/`effect`/`memo`/`ref`/`reducer` hook family (real SSR bodies), the
  route snapshot and its six hooks and six navigation verbs (`router.bp`, with
  both host halves), the request record, its four accessors, `request()` and
  the server-component convention (`server.bp`, with both host halves), the
  render-time half of client navigation — `Link`, `LinkProps` and its five
  `with*` helpers, `prefetchMode`, `layoutKey`, `layoutKeys`, `sharedDepth`,
  `linkStatusOf` (`link.bp` + `reconcile.bp`, pure, no host cell), the client
  boundary — `#[client]`, `#[clientProps]` and the four comptime refusals
  around them, `islandId`/`islandAttrOf`/`islandAttr`, `Island`, `clientMount`,
  `islandEntry`, `propsOf`, `serverSlotAttr`/`serverSlot` and the `serverOnly`
  poison pill (`client.bp`, pure, no host cell) — and the
  `html """…"""` markup DSL
  (comptime expansion to the builder pipeline). Author trees as `div([…])` or as
  `html """…"""`.
- **Gated / declarative** (each a generic core gap, none jhonstart-specific):
  - (closed) `use request()`: `request()` is `#[@use] … -> @Component<ElementBase,
    RequestData>` (botopink decisions 102/104), activated inside a `#[@use]`
    server component.
    The server surface itself is no longer gated: `server.bp` is compiled with
    both host halves shipped (see *Server components*). `Link` and the form
    controls are no longer gated on an attribute slot either: `Element` carries
    `attrs`, and `elements.bp` ships
    `form`/`input`/`button`/`label`/`select`/`textarea`; `Link` is front 27's
    `src/link.bp`, compiled and pure — see *Client navigation*;
  - the **browser half** of client navigation. `link.bp` and `reconcile.bp`
    ship the render-time half; the four `#[@External.Node]` cells
    (`__onzeLinkMount`, `__onzeLinkPrefetch`, `__onzeLinkStatus`,
    `__onzeLinkRouteKind`), the `linkStatus()` hook and the transition driver
    `reconcile(current, target)` wait on front 68's generated bundle and front
    60's route-kind table, and are not stubbed;
  - the **build-time half** of the client boundary. `client.bp` ships the
    markers, the island and the hole; the two `#[@External.Node]` cells
    (`hydrate`, `islandProps`), the `propsFor(name)` wrapper over the second,
    and every "may not" rule — no `serverOnly` in the client graph, no request
    scope in a client module, a server component as a child and never a prop —
    wait on **front 68**'s walk over the module graph and its generated bundle,
    and are not stubbed. **Today the boundary is a vocabulary with four
    comptime refusals, not a guarantee**: a secret read on the server still
    reaches the browser if it is written into an island's props;
  - parallel loading. `@Future` is eager on the erlang row, so independent
    loaders awaited in sequence cost the sum of their round trips; the
    spawn-and-gather over unstarted tasks is front 02's and jhonstart ships no
    second answer;
  - HTML escaping. `renderToString` escapes nothing and front 01's
    `escape.html` / `escape.attribute` do not exist yet;
  - the trailing-lambda children sugar (`div { … }`) and lone-child / `string`
    `Children` *rendering* (type-checks today; render needs normalization).
