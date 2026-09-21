// jhonstart-counter — the built example under the client runtime, on node.
//
// `botopink build` emits `out/main.js`, which binds `state` to
// `out/jhonstart/hooks.js` (the server pass). The client build resolves
// `jhonstart/hooks` to `jhonstart/client_runtime.mjs` (decision 88 of
// 1.0.10-beta; the bundler's step, front 68) — under node the same substitution
// is a `require.cache` seed before `main.js` loads. `Counter` then runs under
// the runtime's loop and its `use state(0)` cell re-renders on `set`:
//
//   botopink build && node client.mjs      (see the sidecar note below)
//   <div><p>count: 0</p><span>non-negative</span></div>   ← main() of the built program, at load
//   <div><p>count: 0</p><span>non-negative</span></div>   ← Counter, first render
//   <div><p>count: 3</p><span>non-negative</span></div>   ← after set(3)
//   <div><p>count: -2</p><span>negative</span></div>      ← after set(-2)
//
// `out/jhonstart/client_runtime.mjs` is shipped by `botopink build` (the G2
// sidecar step) from the jhonstart checkout it finds by NAME across the library
// roots (`shipMjsSidecars`, botopink-lang `modules/compiler-cli/src/cli/libs.zig`),
// NOT through the `path` dependency. From a checkout whose directory is not
// named `jhonstart` — a worktree under `.tasks/` — the build still succeeds and
// the sidecar is silently NOT shipped, and `node client.mjs` then fails to
// resolve it. Point `BOTOPINK_LIB_ROOTS` at a root holding a REAL directory
// named `jhonstart` (`scanRoots` names an entry by its directory basename and
// keeps `kind == .directory` only, so a symlinked entry is skipped; `src/`
// inside it may be a symlink):
//
//   mkdir -p /tmp/roots/jhonstart
//   cp botopink.json /tmp/roots/jhonstart/
//   ln -s "$PWD/../../src" /tmp/roots/jhonstart/src
//   BOTOPINK_LIB_ROOTS=/tmp/roots botopink build && node client.mjs

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as runtime from "./out/jhonstart/client_runtime.mjs";

const require = createRequire(import.meta.url);
const out = join(dirname(fileURLToPath(import.meta.url)), "out");

// The substitution: `jhonstart/hooks` → `jhonstart/client_runtime.mjs`.
const hooks = join(out, "jhonstart", "hooks.js");
require.cache[hooks] = { id: hooks, filename: hooks, loaded: true, exports: runtime };

const { Counter } = require(join(out, "main.js"));
const { renderToString } = require(join(out, "jhonstart", "element.js"));

const handle = runtime.render(Counter, (tree) => console.log(renderToString(tree)));
handle.cells[0].set(3); // `Counter`'s `use state(0)` cell
handle.flush();
handle.cells[0].set(-2);
handle.flush();
handle.dispose();
