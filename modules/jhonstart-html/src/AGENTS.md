# jhonstart/modules/jhonstart-html/src/

> Path: `repository/jhonstart/modules/jhonstart-html/src/`
> Parent (workspace): [`../../../AGENTS.md`](../../../AGENTS.md) · Core: [`../../jhonstart/src/AGENTS.md`](../../jhonstart/src/AGENTS.md)
> Front: [`specs/1.0.12-beta/08-bpp/118-bpp-components/`](../../../../../specs/1.0.12-beta/08-bpp/118-bpp-components/README.md)

Source for the `jhonstart-html` member — what `from "jhonstart-html"` resolves
to: the `html """…"""` template language. Cut out of the core by front 95; it
returns to the core as its `pub default fn` at `05-jhonstart/26` step 0
(decision 200). Its manifest `../botopink.json` lists `files` `[root.bp,
html.bp]` and depends on the core with `{ "jhonstart": { "workspace": true }
}`; the core does not depend on this member. The expansion resolves every tag
in the CALLER's scope, so a consumer imports the builders and components it
writes; the names the expansion itself writes (`htmlText`, `htmlNode`,
`htmlAttr`, …) are this module's and resolve here (decision 112's hygiene).

| File | Kind | Provides |
|---|---|---|
| `root.bp` | module-tree root | `pub mod html;` |
| `html.bp` | **compiled** | `html(comptime template: @Expr<string>) -> @ExprCustom<Element>` — the grammar and lowering in its header: elements and components (`<Card a="x" b={v}>kid</Card>` → `Card(a: "x", b: v, children: kid)`), `<>`/`<Fragment>`, `{expr}` holes (`htmlNode` over core `Node`, decision 191), `${expr}` text holes, attributes `name="text"` / `name={expr}` (a `string`, a `bool` bare or absent, a `?string` absent when null) / bare / `{...pairs}` (elements only), void and self-closing tags in place, comments and `<!doctype>` rendered, `script`/`style`/`textarea`/`title` bodies unparsed, markup inside a lambda body, an `if` / `else` block and a `case` arm (an `if` without `else` renders nothing), `<slot />` / `<slot>fallback</slot>` over the `children` parameter, the tag annotation `#[isRaw]`. Refusals located with `failAt`: an unbound tag or annotation, a mismatched / unexpected / unclosed tag, `[name]={…}`, `class:list` / `set:html` / `set:text` / any `prefix:name`, `slot="…"` and `<slot name>` (props-e), a spread on a component (props-f), markup as an operand, an unknown entity. Also `pub fn isRaw`, `classList`, `classIf`, `hasContent`, and the private runtime helpers the expansion calls |

Exercised by `../test/` on both targets — `template_test.bp` (steps 1–5),
the three spec examples landed as `template_expressions_example_test.bp`,
`components_and_slots_example_test.bp`, `directives_example_test.bp`,
`defects_test.bp` (the four defects front 118 found), `view_test.bp`
(decision 276), `platform_test.bp` (what a template body may write),
`html_test.bp` / `elements_test.bp` — and by the workspace's
`refusals/html_*` cases (each compile-time refusal, its message pinned).

## Comptime constraints

`html`'s body runs on the comptime runtimes — BEAM for an erlang build, wat for
a commonJS one. Measured by `../test/platform_test.bp` (front 118 step 0), on
both:

| Construct | Result |
|---|---|
| a call to a function of this module (private or `pub`) or an imported one | **refused** — `the template module did not compile: … call to undefined function helper/1`; a helper is a lambda in the body |
| recursion | **impossible** — a lambda cannot name itself (`unbound variable`) and nothing else can be called; nested markup is walked with an explicit frame stack |
| `xs.at(i)` | works (`?T`, read with `??`) |
| a `?T` binding read with `??`, `if (x == null) … else x.f` | works |
| an `i32` reassigned inside a nested lambda (`forEach` bodies) | works |
| a `//` comment in the body | works |

Three more, met while writing the body (each a `language-gaps.md` row):

- **a lambda that writes a `var` of the body** must be called only at statement
  position of the body, never from another lambda (decision 148,
  `captured-var-write`); a lambda that only reads takes the state as arguments,
  since on the BEAM a closure holds a copy of what it captured when made;
- **a labelled tuple element read by its label** (`t.kind`) is `{badmap, …}` at
  run time; read the position (`t.0`);
- **one function has a bounded frame**: a large body is `{load_binary, …,
  badfile}` on the BEAM runtime and `compiling function overran its stack height
  limit` on wat. Each large branch of the loop runs in a one-pass `while
  (split…)` loop — a function of its own.

The built code is padded to start at the literal's own line and column: two
expansions in one module otherwise share the locations of their calls, and a
default argument filled for one lands on a call of the other (also a row).
