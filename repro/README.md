# `repro/` — minimal reproductions handed back to botopink-lang

Each subdirectory is a **self-contained botopink package that contains no
jhonstart at all**, written to hand a compiler defect back to the front that
owns it with a measurement instead of a description. They are not workspace
members: the root `botopink.json` globs `modules/*` and `examples/*`, so neither
the pre-commit gate nor `botopink-lib-test` builds or runs anything here. Run one
by hand, from its own directory.

A directory is deleted in the commit that lands the compiler fix.

---

## `erlang-imported-fn-field/` — owner `00 · 02-erlang`

**A record's function-typed field, called across a module boundary, is emitted as
a bare local function the program never defines.**

Measured 2026-09-21 against `botopink-lang` feat `ecf9fd1c`.

```sh
cd repro/erlang-imported-fn-field
botopink test --target commonJS   # 1 passed, 0 failed  ×2 (both cells green)
botopink test --target erlang     # the owning module's cell passes; the consumer does not compile
```

```text
.botopinkbuild/test-out/main.erl: function set/2 undefined
escript: There were compilation errors.
```

`botopink build --target erlang` exits **0** — it transpiles and never invokes
`erlc`, so a build is not a check on this backend. `botopink run --target erlang`
fails the same way a test run does.

### What is emitted

`src/cell.bp` declares `pub type Cell(value: i32, set: fn(next: i32))`. Calling
`c.set(5)` lowers two different ways depending on which module the call sits in:

| call site | emitted erlang | result |
|---|---|---|
| `src/cell.bp`, the owning module | `(element(3, C))(5)` | correct — the field is read and applied |
| `src/main.bp`, a consumer | `set(C, 5)` | `function set/2 undefined` |

The field **read** resolves in both (`element(2, C)`), so the record's *shape*
crosses the module boundary; only its fields' *types* do not.

### Where it is

`modules/compiler-core/src/codegen/erlang.zig`:

- `collectTypeShapes` walks the module's **own** `type` declarations and, for
  every field whose `typeRef` is `.function`, records it in `fn_typed_fields` /
  `fn_typed_field_names` (the comment there says it plainly: "A field of function
  type is CALLED like a method (`c.set(9)`), and the record emits no `set/2`").
- `collectImportedTypes`' `.record` arm copies the imported record's
  `info.fields` into `record_fields` — **names only**. The cross-module index
  carries no per-field type, so nothing joins `fn_typed_field_names`.
- The fn-typed-field arm of the method-call lowering therefore never fires for an
  imported record, and the call falls through to the bare
  `b.call(cc.callee, recv_args)` at the end of that function.

Closing it means the cross-module export index has to carry each record field's
type — or at least a "this field is function-typed" flag — so
`collectImportedTypes` can populate the same two tables `collectTypeShapes` does.

### Why jhonstart cannot work around it

`c.set(5)` is the only spelling: `State<T>`'s `set` is a `fn(next: T)` field
(jhonstart's G1), it is `pub` surface a consumer reaches through
`import { state } from "jhonstart"`, and the consumer is by construction a
different module from `jhonstart/hooks`. `examples/jhonstart-counter`'s
`test "the state hook seeds the initial count and exposes a setter"` is exactly
this shape and is left untouched.

---

## Secondary finding, no repro directory — a bare `print(x)` call

Not a jhonstart bug (see `AGENTS.md` § CI), but measured here and worth routing:
**the checker accepts `print(x)` as an ordinary call on every target, and only
commonJS can lower it.**

`print` is seeded as a binding by `registerBuiltins`
(`modules/compiler-core/src/comptime/env.zig`) and declared
`pub declare fn print(message: string)` in the prelude
(`libs/std/src/builtins.d.bp`), so `print("hello")` type-checks with no import on
every backend. What each backend then emits, measured 2026-09-21 on a one-file
package whose `main` is `print("hello")`:

| target | emitted | outcome |
|---|---|---|
| commonJS | `console.log("hello")` | prints `hello` |
| erlang | `print(<<"hello">>)` | `function print/1 undefined` |
| beam | `{move, {literal, {unresolved_call, print, 1}}, {x, 0}}` | unresolved |
| wasm | — | `wasm trap: unreachable` |

The `@`-form `@print("hello")` is correct on all four, and it is the only form
the language reference (`botopink-lang/docs.md`, 40-odd occurrences) ever shows:
commonJS is the outlier, because its `builtin_node_dispatch` table is consulted
on the plain-call path as well as the `@`-builtin one, while erlang's
`builtin_erlang_dispatch` and `isPrintBuiltin` are reached only from
`builtinCallNode` — the `@name(...)` path.

So the bare spelling should either be lowered everywhere or **rejected with a
"did you mean `@print`?" diagnostic**; today it is silently accepted and dies at
the backend. It is not only jhonstart's two examples:
`repository/onze/examples/onze/src/main.bp:77` writes `print(...)` too and its
erlang row fails identically.
