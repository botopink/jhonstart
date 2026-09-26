%% jhonstart — the BEAM twin of `../island_runtime.mjs` (front 29 Step 4).
%%
%% There is no browser on the server: nothing hydrates and no island has
%% props to read. The twin exists because `client.bp` lives in the core, which
%% is compiled on both rows, and a called node-only cell reds the erlang
%% compile at its caller.
-module(jhonstart_island).

-export([hydrate/1, island_props/2]).

hydrate(_PayloadName) -> 0.
island_props(_PayloadName, _Name) -> <<"">>.
