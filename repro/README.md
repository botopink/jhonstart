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

## `erlang-std-slice-shim/` — owner `00 · 02-erlang`

**A `libs/std` module reached through `from "std"` loses the `String.slice`
instance-default shim on the erlang row and emits a bare local `slice/3`.**

Measured 2026-09-21 against `botopink-lang` feat (`zig-out` binary of the
workspace checkout).

```sh
cd repro/erlang-std-slice-shim
botopink test --target commonJS   # 2 passed, 0 failed
botopink test --target erlang     # 1 passed, 1 failed — `{error,undef}`
```

Both cells compile. `botopink build --target erlang` exits **0**; it transpiles
and never invokes `erlc`, so a build is not a check on this backend.

### What is emitted

`querystring.parse` is the shortest `libs/std` entry point that reaches
`s.slice(a, b)` — `libs/std/src/querystring.bp:22` strips a leading `?` with
`query.slice(1, query.length)`. `chop` in `src/main.bp` is the same expression,
in a project module.

| call site | emitted erlang | result |
|---|---|---|
| `src/main.bp` — a project module | `string_slice(S, 1, string:length(S))`, with `string_slice/3` emitted below it | correct |
| `libs/std/src/querystring.bp` — a std module compiled as a dependency | `slice(Query, 1, string:length(Query))`, and nothing defines `slice/3` | `erlc`: `undefined_function {slice,3}` |

The failure is **not** a compile error the runner reports. The test runner's
`__bp_load_siblings/0` compiles every `.erl` beside the script with
`compile:file(Src, [binary, return_errors, …])` and **skips** one that does not
compile (`_ -> ok`), so `std@querystring` is simply never loaded and the first
call into it dies `{error,undef}` at run time, pinned to the test rather than to
the module that failed.

```sh
$ erl -noshell -eval 'io:format("~p~n",[compile:file("std/querystring.erl",[binary,return_errors,{i,"."}])]), halt(0).'
{error,[{"std/querystring.erl",[{{41,13},erl_lint,{undefined_function,{slice,3}}}]}],[]}
```

### Where it is

`modules/compiler-core/src/codegen/erlang.zig`. `String.slice` is a
**primitive-interface `default fn`** (`libs/std/src/primitives.bp:201`), not a
bare-symbol prim-op, so the erlang backend reaches it through
`primDefaultShimNode` → `primDefaultFor`, whose table is filled by
`collectPreludeInstanceDefaults` — and that call is guarded by
`comptime_module != null` (`erlang.zig:1425`). A `libs/std` module compiled as
an ordinary dependency module takes neither path, `primDefaultFor` answers
`null`, and the method call falls through to the bare
`b.call(cc.callee, recv_args)` — a local `slice/3` nothing emits.

Closing it means indexing the prelude's instance defaults for every module that
can call one, not only a comptime module.

### Why jhonstart cannot work around it

Front 26's spec decodes both pair-shaped snapshot values with
`querystring.parse`, and erlang is that front's assigned target. jhonstart
therefore carries `decodePairs` in `modules/jhonstart/src/router.bp` — the same
documented behaviour, spelled in a project module — and the header there says it
collapses back to `querystring.parse` the moment this closes. A second copy of a
std function is exactly the duplication the front's own *Definition of done*
argues against, so the cost of this defect is one function and a note, not zero.

---

## `local-binding-leaks-to-later-decls/` — owner `00 · 01-checker`

**A local `val` declared in one top-level body stays visible to the checker in
the body of every top-level declaration that appears after it in the same
module.**

Measured 2026-09-21 against the pinned compiler `2e6bb4ac`, on **both** rows —
it is a checker answer, so every target is wrong in the same place.

```sh
cd repro/local-binding-leaks-to-later-decls
botopink test --target commonJS   # compiles; 0 passed, 1 failed — `v is not defined`
botopink test --target erlang     # compiles; erlc: `variable 'V' is unbound`
```

### The two shapes, and they are one defect

**a) The leaked name binds where nothing declares it.** The module compiles and
dies at run time. This is the repro's `src/main.bp`, twelve lines:

```bp
fn holder() -> string { val v = "inner"; return v; }
fn later()  -> string { return v; }
test "t" { assert later() == "inner"; }
```

```text
commonJS   FAIL t  (v is not defined)  at main.bp:3
erlang     main.erl:8:5: variable 'V' is unbound
```

**b) The leaked name SHADOWS a function of the same name**, and the module is
rejected at a call site that is correct:

```bp
type Box(n: i32)
fn p(n: i32) -> i32 { return n; }
test "a val in a test block" { val p = Box(n: 1); assert p.n == 1; }
fn later() -> i32 { return p(2); }
```

```text
error: type mismatch: expected i32, got Box
```

No line, no column — the diagnostic names neither the leaking binding nor the
call it broke.

**Order is the whole defect.** Move `later` ABOVE the body that declares the
local and shape (a) is correctly rejected as unbound, and shape (b) compiles and
passes. A `val` inside a `test {}` block leaks exactly as one inside an ordinary
`fn` body does; a *later* `test {}` block is unaffected, only later
declarations.

### Why jhonstart cannot work around it

It can only avoid it, and only by luck. `test/client_test.bp` writes
`val like = LikeProps(…)` rather than the `val p` anyone would write, because
`p` is one of `element.bp`'s builders and a `@Component` component declared
further down the same file calls `p([text(…)], attrs: [])`. Nothing warns; the
file simply reds at the component with a type mismatch naming a record the
component never mentions. Every `.bp` file in this ecosystem that binds a local
named after an imported builder — `p`, `a`, `li`, `text`, `form`, `link`,
`title`, `body` are all exported tag constructors — is one declaration order
away from the same red.

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

---

## `commonjs-await-in-if-block/` — owner `00 · 24-effects-by-return` (commonJS lowering)

**An `if` block that `await`s without returning, inside a `@Task` body, is
lowered into a non-`async` arrow — the module does not load.** Found by front
30's `onResolved`; measured 2026-09-26 against botopink-lang `f011850c`.

```text
$ botopink test --target commonJS
    (() => { if (flag) { const got = await one(); … } })();
SyntaxError: await is only valid in async functions and the top level bodies of modules
$ botopink test --target erlang      # 1 passed, 0 failed
```

The runner then prints no summary line for the module and still reports
`1 MODULE(S) RAN`: a crashed module is not counted as failed. The workaround in
jhonstart is a branch that ends in `return` (`streaming.bp` `onResolved`).

## `erlang-void-return-in-if/` — owner `00 · 02-erlang`

**A bare `return;` inside an `if` block of a `@Task<void>` body does not leave
the function on erlang** — the statements after the block still run. commonJS
returns. Found by front 30; measured against `f011850c`.

```text
$ botopink test --target erlang
  FAIL a bare return inside an if block leaves a @Task<void> fn  (assertion failed)
```

## `self-param-free-fn/` — owner `00 · 01-checker`

**A free function whose first parameter is named `self` loses that parameter**:
erlang emits `twice/1` (`variable 'Self' is unbound`, `function twice/2
undefined`) and commonJS computes with `self` unbound (the assertion fails).
Either `self` is refused outside a `type` body or it is an ordinary name; today
it is neither. Found by front 30 (`renderWith(self: App, …)` became
`renderWith/4`, and the `App` method calling it with five arguments failed to
compile); measured against `f011850c`.

## `dependency-files-order/` — owner `00 · 10-cli-residuals`

**A dependency's modules are compiled in its `botopink.json` `files` order, not
in import order**: `dep` lists `b.bp` (which imports `a`) before `a.bp`, and
the consuming `app` fails with `unbound variable 'base'` on both rows, while
`dep`'s own build resolves the same modules fine. Found when front 30's modules
joined jhonstart's `files` (the core's list is now kept in dependency order);
measured against `f011850c`.

```sh
cd repro/dependency-files-order/app && botopink test --target erlang
error: unbound variable 'base'
```
