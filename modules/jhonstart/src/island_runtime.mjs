// jhonstart — the island hydrate point on the js row (front 29 Step 4).
//
// `hydrate(payloadName)` walks every `[data-jh-i]` not yet started, finds its
// `i` row in the payload (`window[payloadName].i`), and starts the component
// registered for that name in `globalThis.__jhIslandStarters` — the table onze
// front 68's generated entry fills — handing it the element and the encoded
// props. A started island is marked `data-jh-hydrated`, so a second call
// starts nothing: the function is idempotent, and it mounts no link and no
// form (those are `linkMount` / `formMount`, called by the same entry).
// `[data-jh-reset]` controls (front 31's fallback) are bound here too: a click
// dispatches `jh:refresh`, which the client router answers with `refresh()`.
//
// `islandProps(payloadName, name)` answers the encoded props of the first `i`
// row for `name`, `""` when there is none. With no `document` both answer the
// empty value. `sidecars/jhonstart_island.erl` is the BEAM twin.

let started = 0;

function rows(payloadName) {
  const payload = globalThis[payloadName];
  return payload && Array.isArray(payload.i) ? payload.i : [];
}

export function hydrate(payloadName) {
  const doc = globalThis.document;
  if (!doc) return started;
  const table = rows(payloadName);
  const starters = globalThis.__jhIslandStarters || {};
  for (const el of doc.querySelectorAll("[data-jh-i]")) {
    if (el.hasAttribute("data-jh-hydrated")) continue;
    const id = el.getAttribute("data-jh-i");
    const row = table.find((r) => r[0] === id);
    if (!row) continue;
    const start = starters[row[1]];
    if (typeof start !== "function") continue;
    el.setAttribute("data-jh-hydrated", "1");
    start(el, row[2]);
    started += 1;
  }
  for (const btn of doc.querySelectorAll("[data-jh-reset]")) {
    if (btn.hasAttribute("data-jh-bound")) continue;
    btn.setAttribute("data-jh-bound", "1");
    btn.addEventListener("click", () => globalThis.dispatchEvent(new globalThis.Event("jh:refresh")));
  }
  return started;
}

export function islandProps(payloadName, name) {
  const row = rows(payloadName).find((r) => r[1] === name);
  return row ? String(row[2]) : "";
}
