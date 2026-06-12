# jhonstart

[![CI](https://github.com/botopink/jhonstart/actions/workflows/test.yml/badge.svg?branch=feat)](https://github.com/botopink/jhonstart/actions/workflows/test.yml)

> React/Next-style UI framework written in botopink — on the language's own
> primitives. No compiler-core support; reached via `from "jhonstart"`.

Components are plain functions returning `Element`; hooks are the
`@Context<Element, _>` capability gated by the `use` prefix; server components
are `*fn … -> @Future<Element>`; the JSX-like `html """…"""` DSL reuses
`expr-templates` (`@Expr<Element>`), expanding markup to the builder pipeline at
comptime.

## Install

```bp
import {component, html, useState, useEffect} from "jhonstart";
```

## Quick example

```bp
component Counter() -> Element {
    val (count, setCount) = useState(0);
    html """
        <div>
            <p>count is {count}</p>
            <button onClick={() => setCount(count + 1)}>+1</button>
        </div>
    """
}
```

## Status

- ✅ `Element` tree + builders + synchronous `renderToString`.
- ✅ Hook family (`state`, `effect`, `memo`, `ref`, `reducer`).
- ✅ `html """…"""` comptime expander (real `.bp`, single-pass).
- 🟡 Router + Http server context: still declarative (`.d.bp`), each gated on a
  generic language gap.

See [AGENTS.md](AGENTS.md) for the architectural status notes.

## Docs

- [AGENTS.md](AGENTS.md) — architecture, conventions, the "no compiler-core
  coupling" rule.
- [docs.md](docs.md) — full reference.
- [examples/](examples/) — runnable demos (counter, todo, blog).

## License

Same as the parent botopink workspace.
