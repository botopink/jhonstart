%% jhonstart — the request's host half on the BEAM (front 28).
%%
%% The erlang twin of `../server_runtime.mjs`, cell for cell, so that
%% `test/server_test.bp` is ONE set of assertions run on both rows.
%%
%% The store is the calling process's dictionary, for the same reason front 26's
%% `jhonstart_router` uses it: a request IS a process, the request data dies
%% with it, and two concurrent renders cannot see each other's cookies. Nothing
%% here is a supervised name, an ETS table or an application — a request that
%% outlives its process is a request that answers the previous reader's headers,
%% and that failure is silent.
%%
%% This module parses nothing. The four pair-shaped values arrive already
%% querystring-encoded (`k=v&k=v`), exactly as front 23's payload carries them,
%% and `router.bp`'s `decodePairs` is the one decoder on the botopink side.
%%
%% Why this module and not `rakun_request_context`: rakun's member is
%% `targets: ["commonJS"]` and has no BEAM row at all, so binding the cells to it
%% would make every request read `{error,undef}` on the row this front is gated
%% on. `fill/6` is the seam front 62's dispatcher calls once per request.
%% `server.bp`'s header carries the measurement.
%%
%% The module atom may not be `server`: `shipErlSidecars` silently skips an atom
%% that collides with a module the build emitted. `jhonstart_server` is the
%% `<lib>_<name>` shape front 26's sidecar and rakun's use for the same reason.
-module(jhonstart_server).

-export([method/0, path/0, params/0, query/0, headers/0, cookies/0]).
-export([fill/6]).

-define(METHOD, jhonstart_req_method).
-define(PATH, jhonstart_req_path).
-define(PARAMS, jhonstart_req_params).
-define(QUERY, jhonstart_req_query).
-define(HEADERS, jhonstart_req_headers).
-define(COOKIES, jhonstart_req_cookies).

%% An unfilled request answers the empty request rather than raising: rendering
%% a component outside a request is a legitimate thing to do — it is how every
%% test in this package renders the server pass — and `""` is already the answer
%% every accessor gives for an absent key.
get_bin(Key) ->
    case get(Key) of
        undefined -> <<"">>;
        Value -> Value
    end.

method() -> get_bin(?METHOD).

path() -> get_bin(?PATH).

params() -> get_bin(?PARAMS).

query() -> get_bin(?QUERY).

headers() -> get_bin(?HEADERS).

cookies() -> get_bin(?COOKIES).

%% Replace the whole request. Six values at once, never one at a time: a
%% half-updated request is a component reading the previous reader's cookie
%% against this reader's path.
fill(Method, Path, Params, Query, Headers, Cookies) ->
    put(?METHOD, Method),
    put(?PATH, Path),
    put(?PARAMS, Params),
    put(?QUERY, Query),
    put(?HEADERS, Headers),
    put(?COOKIES, Cookies),
    0.
