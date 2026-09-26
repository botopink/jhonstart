%% jhonstart — the signal host half on the BEAM (front 31).
%%
%% The erlang twin of `../signal_runtime.mjs`, cell for cell. `raise/1` raises
%% the reason and never returns; `capture/1` calls a boundary's thunk exactly
%% once and turns a raise into the `{error, Reason}` Result value a `case` can
%% branch on; `capture_task/1` is the same for a component thunk — `@Task` is
%% eager on the erlang row, so its value is already the element.
%%
%% A raised signal reason is `{jh_signal, Reason}`; a failed `assert` in a
%% component is `{bp_assert, Msg, Where}`; anything else is formatted, so a
%% crashing component is caught like one that answered `Error`.
-module(jhonstart_signal).

-export([raise/1, capture/1, capture_task/1, try_value/1, try_task/1]).

raise(Reason) ->
    erlang:error({jh_signal, Reason}).

reason_of({jh_signal, Reason}) -> Reason;
reason_of({bp_assert, Msg, _Where}) when is_binary(Msg) -> Msg;
reason_of(Other) -> iolist_to_binary(io_lib:format("~p", [Other])).

capture(Child) ->
    try Child() of
        Value -> Value
    catch
        error:E -> {error, reason_of(E)};
        throw:E -> {error, reason_of(E)};
        exit:E -> {error, reason_of(E)}
    end.

capture_task(Child) ->
    try Child() of
        Value -> {ok, Value}
    catch
        error:E -> {error, reason_of(E)};
        throw:E -> {error, reason_of(E)};
        exit:E -> {error, reason_of(E)}
    end.

%% The generic pair `render.bp` / `streaming.bp` use. `@Task` is eager here,
%% so both are the same call.
try_value(F) -> capture_task(F).
try_task(F) -> capture_task(F).
