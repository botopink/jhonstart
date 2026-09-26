// jhonstart — the signal host half on the js row (front 31).
//
// Two cells. `raise(reason)` throws the reason on the host and never returns:
// a page, layout or template is a `-> @Component<…>` body and cannot `throw`
// (decision 121), so `notFound()` / `redirect(url)` are CALLS that raise.
// `capture(child)` calls a boundary's thunk exactly once and turns any raise
// into the `{ error }` Result value a `case` can branch on — the one place a
// raise becomes a value, because botopink's own `try … catch` unwraps a
// `@Result` and nothing else. `captureTask(child)` is the same for a thunk
// whose value is a Promise (a `@Component` body is an `async function` here,
// decision 104).
//
// `src/sidecars/jhonstart_signal.erl` is the same three cells on the BEAM.

class JhSignal extends Error {
  constructor(reason) {
    super(reason);
    this.jhReason = reason;
  }
}

function reasonOf(e) {
  if (e && typeof e.jhReason === "string") return e.jhReason;
  if (e && typeof e.message === "string") return e.message;
  return String(e);
}

export function raise(reason) {
  throw new JhSignal(reason);
}

export function capture(child) {
  try {
    return child();
  } catch (e) {
    return { error: reasonOf(e) };
  }
}

export async function captureTask(child) {
  try {
    return { ok: await child() };
  } catch (e) {
    return { error: reasonOf(e) };
  }
}

// The generic pair `render.bp` / `streaming.bp` use: a plain value answered
// as `{ ok }` or `{ error: reason }`, and a Promise-valued thunk answered as
// the thunk's own Promise — the commonJS backend wraps every host cell typed
// `@Task<@Result<…>>` so that a rejection becomes `{ error: message }` (a
// `JhSignal`'s message is its reason) and a value `{ ok }`; wrapping here too
// would answer `{ ok: { error } }`.
export function tryValue(f) {
  try {
    return { ok: f() };
  } catch (e) {
    return { error: reasonOf(e) };
  }
}

export async function tryTask(f) {
  return await f();
}
