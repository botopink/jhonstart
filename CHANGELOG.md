# jhonstart · CHANGELOG

## Unreleased

- **`use` activation after decision 88 (botopink-lang 1.0.10-beta front 19):**
  `use f(x)` lowers to `f(x)` on every backend and a body that activates a hook
  carries `#[@context]`. Every component and custom hook is annotated
  (`hooks.bp`'s `Counter`/`counter`, the counter and todo examples); hooks are
  nouns — `useCounter` → `counter`, `useRouter` → `router` (and its host
  symbol), `useToggle` → `toggle` — called as `use counter(…)`, bound under
  another name. `hooks.bp`'s header no longer claims the prefix lowers to
  React's `useState`. `router.d.bp` imports `Element`.
- **Client runtime.** `src/client_runtime.mjs` exports the five nouns with hook
  semantics (plus `render(component, commit)`) over jhonstart's own re-render
  loop; the client build resolves `jhonstart/hooks` to it. `src/client_runtime.bp`
  (`mod`, not consumer surface) carries the `clientRender` cell whose
  `./client_runtime.mjs` require makes `botopink build` ship the sidecar.
  `examples/jhonstart-counter/client.mjs` runs the built `Counter` under it on
  node and prints the re-renders after `set`.
- The three examples depend on jhonstart by `{ "path": "../.." }` (decision
  76), the checkout they live in — a `git` dependency resolved by name to
  `repository/jhonstart`, the main checkout, from inside a worktree.

- **1.0.3 surface** (botopink-lang front 12): `Element` and `State<T>` are
  `type Name(fields)`; `Router` / `Request` are `behavior`s whose bodiless members
  end with `;`; the hook shapes are labeled tuple types — `effect` yields `#()`,
  `ref` `#(current: T)`, `reducer` `#(state: S, dispatch: fn(action: A))`; the
  `html` lexer's tokens are tuples typed by `tokens`' written element type. Two
  compiler gaps are worked around with positional access: labels of a generic
  labeled return are lost when `T` is instantiated (the hooks test reads `r.0`),
  and label access on a lambda parameter is not rewritten in a template body
  (`t.0` … `t.6`). `botopink format` is not applied: it currently emits code that
  does not compile here.

- The examples gate no longer aborts silently on a `scripts/known-broken-examples.txt`
  holding only comments or blank lines: the runner reads the list with `awk`, whose
  "no entry" is not a failure under `set -euo pipefail`.

- `examples/jhonstart-counter`, `jhonstart-html` and `jhonstart-todo` build again:
  their element builder calls pass `attrs` explicitly — the `attrs = []`
  default is not applied by the compiler yet — and they leave
  `scripts/known-broken-examples.txt`.

- **MIT license.** `LICENSE` (`Copyright (c) 2026 Eric Fillipe and botopink
  contributors`) backs the README's License section, which now points at it.

- The gate builds the examples: after `botopink test`, the pre-commit hook
  and CI run `botopink build` in every `examples/*/` with a `botopink.json`;
  `scripts/known-broken-examples.txt` lists the ones allowed to fail, and a
  listed example that builds fails the gate.
- `examples/jonhstar` removed: a misspelled early expr-templates showcase with
  its own stale copy of the `html` template (`src/jhonstart.bp`), no
  dependency on jhonstart, not referenced by the README, and failing to
  build (`unbound variable 'html'`); `jhonstart-html` covers the same ground.
- The pre-commit hook is self-contained: the dead delegation to a meta
  workspace runner is gone, and `AGENTS.md` documents the install
  (`git config core.hooksPath scripts/git-hooks`) instead of a
  `scripts/install-hooks.sh` that exists in no repository.
- Promoted from workspace subdir to standalone repository under
  `botopink/jhonstart`. Tracked from `botopink/projects` as a git submodule on
  the `feat` branch.
- `Router` and `Request` read their fields through zero-argument methods
  (`router.pathname()`, `req.params()`, `req.query()`): `get` is no longer a
  keyword, so the `get name(self: Self)` accessors did not parse. Their host
  hooks are `pub declare fn`, so both declaration files parse whole.

## 0.0.1 — v0.beta.8

- `html """…"""` DSL implemented in real `.bp` (stack-based parser, dual lowering
  via `@ExprCustom<Element>`).
- Component model: function returning `Element`, real builder chain.
- Hook family in real `.bp`: `useState`, `useEffect`, `useMemo`, `useRef`,
  `useReducer`.
- Server components: `*fn … -> @Future<Element>` skeleton (the `*fn`
  carrier was migrated to the `#[@future]` annotation in v0.beta.12 and
  the legacy prefix removed in v0.beta.19).
- Synchronous SSR (`renderToString`).

## 0.0.0 — v0.beta.5

- Initial spec and framework scaffold (the port).
