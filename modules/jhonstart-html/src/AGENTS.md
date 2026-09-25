# jhonstart/modules/jhonstart-html/src/

> Path: `repository/jhonstart/modules/jhonstart-html/src/`
> Parent (workspace): [`../../../AGENTS.md`](../../../AGENTS.md) · Core: [`../../jhonstart/src/AGENTS.md`](../../jhonstart/src/AGENTS.md)

Source for the `jhonstart-html` member — what `from "jhonstart-html"` resolves
to. Cut out of the core by front 95 (`specs/1.0.10-beta/04-jhonstart/modules.md`
§ 2, "keep, narrowed"): the DSL is comptime template evaluation a builder-only
consumer never invokes. Its manifest `../botopink.json` lists `files`
`[root.bp, html.bp]` and depends on the core with `{ "jhonstart": { "workspace":
true } }`; the core does not depend on this member. `html.bp` imports `Element`
from "jhonstart" — the one line the move changed — and its expansion resolves
every tag in the CALLER's scope, so a consumer imports the builders it writes
from "jhonstart" (the tests in `../test/` do exactly that). Front 48's
`html_attrs.bp` lands here too (`modules.md` § 1.1).

| File | Kind | Provides |
|---|---|---|
| `root.bp` | module-tree root | `pub mod html;` |
| `html.bp` | **compiled** | `html(comptime template: @Expr<string>) -> @ExprCustom<Element>` — the JSX-like `html """…"""` DSL with a real markup front-end: ① a native-JS-only **lexer** walks `template.parts()` into a token stream (tags/attrs/text/holes, each carrying a byte `Span`), ② a **flat stack parser** lowers it twice — to the builder pipeline (`<tag>` → `tag([...])`, text → `text("…")`, `${expr}` → `text(<code>)`, lowercase tags resolved in the **caller's** scope) AND to a generic `CustomNode` reference overlay (tags `label "tag"` + `q.lookup` `ref`, attrs `property`, values/text `string`, holes neutral), returned together via `q.custom(...)`. Mismatched/unexpected/unclosed tags → `q.failAt(span, …)` at the offending tag. Sibling of erika's `erika "…"` SQL front-end. Exercised by `../test/html_test.bp` (parity), `../test/elements_test.bp` (a tag from the core's `elements.bp` resolving inside a template) + the `jhonstart-markup` example member. See the file header for the comptime-eval constraints (no `?T`, no in-body comments, helper closures at fn level not nested in the loop, `i32` cursor only in the flat parser loop) |
