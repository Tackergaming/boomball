"""Replays the exact browser path of the lobby button, preflight included.

Sign up, write the profile, found a team, open a match through `create-match`,
read `matches` and `match_state` back through RLS the way `useAccount` and
`useMatch` do, then send one turn to `resolve-action`. Every request carries an
`Origin`, and the CORS headers on every reply are asserted.

**It exists because `scripts/live-match.ts` cannot see what it checks.** That
script plays whole matches through these same functions from Node, where there
are no preflights, so it passed green the entire time both functions answered
the browser's `OPTIONS` with a bare `405 POST only`. In a browser that rejected
the `fetch`, and the lobby button read "Loading the silo" until the tab was
closed. A preflight is only ever sent by a browser, so it is only ever caught by
a check that pretends to be one.

The read after the match opens is the other half. The button waits on it: a
match written but not readable through RLS hangs the screen exactly as a CORS
failure does, and from the player's side the two look identical.

Not a vitest test, for the same reason as `rls-check.py`: it needs a live
project and a network round trip, and the suite under `npm test` runs in
milliseconds and must stay that way. Standard library only, nothing to install.

    python supabase/checks/browser-path.py                # from the workspace root

Reads SUPABASE_BOOMBALL_URL, SUPABASE_BOOMBALL_ANON_KEY and
SUPABASE_BOOMBALL_SERVICE_ROLE_KEY. When they are not already in the
environment it loads the workspace `.env` on its own, so it runs the same way
from PowerShell and from bash. The service key is used for exactly two
things, creating the throwaway player and deleting it, which are admin acts by
nature; everything between them goes through RLS or through a function, because
that is all a browser will ever have.
"""

import json
import os
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path


def load_workspace_env():
    """Fill in missing SUPABASE_BOOMBALL_* variables from the workspace .env.

    Anything already exported wins. No file, nothing to do.
    """
    wanted = (
        "SUPABASE_BOOMBALL_URL",
        "SUPABASE_BOOMBALL_ANON_KEY",
        "SUPABASE_BOOMBALL_SERVICE_ROLE_KEY",
    )
    if all(name in os.environ for name in wanted):
        return
    path = Path(__file__).resolve().parents[2] / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if name:
            os.environ.setdefault(name, value)


load_workspace_env()

URL = os.environ["SUPABASE_BOOMBALL_URL"]
ANON = os.environ["SUPABASE_BOOMBALL_ANON_KEY"]
SERVICE = os.environ["SUPABASE_BOOMBALL_SERVICE_ROLE_KEY"]
# What Vite serves on. After the Vercel deploy, run it once with the real
# origin too: set ORIGIN in the environment to the deployed URL.
ORIGIN = os.environ.get("ORIGIN", "http://localhost:5173")

failures = []


def check(label, condition, detail=""):
    print(f"{'ok  ' if condition else 'FAIL'}  {label}{'  ' + detail if detail else ''}")
    if not condition:
        failures.append(label)


def call(method, path, token, body=None, key=None, extra=None):
    headers = {
        "apikey": key or ANON,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Origin": ORIGIN,
    }
    headers.update(extra or {})
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(URL + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as reply:
            raw = reply.read().decode()
            return reply.status, (json.loads(raw) if raw.strip() else None), dict(reply.headers)
    except urllib.error.HTTPError as failure:
        raw = failure.read().decode()
        return failure.code, (json.loads(raw) if raw.strip() else None), dict(failure.headers)


def preflight(function):
    request = urllib.request.Request(
        f"{URL}/functions/v1/{function}",
        headers={
            "Origin": ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,apikey,content-type",
        },
        method="OPTIONS",
    )
    try:
        with urllib.request.urlopen(request) as reply:
            return reply.status, dict(reply.headers)
    except urllib.error.HTTPError as failure:
        return failure.code, dict(failure.headers)


# -- The preflight the browser sends before it will post anything -------------

for function in ("create-match", "resolve-action"):
    status, headers = preflight(function)
    allowed = {k.lower(): v for k, v in headers.items()}.get("access-control-allow-origin")
    check(f"{function}: preflight answered", status in (200, 204), f"status {status}")
    check(f"{function}: preflight allows the origin", allowed in ("*", ORIGIN), f"origin {allowed}")

# -- A throwaway player -------------------------------------------------------

password = "boomball-" + secrets.token_hex(8)
email = f"lobby.{secrets.token_hex(4)}@example.invalid"

status, created, _ = call("POST", "/auth/v1/admin/users", SERVICE,
                          {"email": email, "password": password, "email_confirm": True},
                          key=SERVICE)
if status >= 300:
    print(f"could not create the player: {status} {created}")
    sys.exit(1)
user_id = created["id"]

status, signed, _ = call("POST", "/auth/v1/token?grant_type=password", ANON,
                         {"email": email, "password": password})
check("signed in", status == 200, f"status {status}")
jwt = signed["access_token"]

try:
    # -- Everything below is what the browser does, anon key only -------------

    status, _, _ = call("POST", "/rest/v1/profiles", jwt,
                        {"id": user_id, "display_name": "Lobby Test"})
    check("profile written", status in (200, 201, 204), f"status {status}")

    status, team, headers = call("POST", "/rest/v1/teams", jwt,
                                 {"owner": user_id, "name": "Preflight Battery"},
                                 extra={"Prefer": "return=representation"})
    check("team founded and read back", status in (200, 201) and team, f"status {status}")
    team_id = team[0]["id"]

    status, reply, headers = call("POST", "/functions/v1/create-match", jwt, {
        "teamId": team_id,
        "seats": [{"profileId": user_id, "role": "striker", "characterName": "Test Giff"}],
    })
    allowed = {k.lower(): v for k, v in headers.items()}.get("access-control-allow-origin")
    check("create-match accepted", status == 200 and reply and reply.get("accepted"),
          f"status {status} {reply if not (reply or {}).get('accepted') else ''}")
    check("create-match reply carries CORS", allowed in ("*", ORIGIN), f"origin {allowed}")
    match_id = reply["matchId"]
    check("opening events came back", len(reply.get("events", [])) > 0,
          f"{len(reply.get('events', []))} events")

    # -- The read the lobby button actually waits on --------------------------

    status, rows, _ = call(
        "GET",
        f"/rest/v1/matches?team_id=eq.{team_id}&select=id,phase,round,score_a,score_b,winner,is_draw"
        "&order=created_at.desc&limit=10",
        jwt,
    )
    check("useAccount reads the match through RLS", status == 200 and rows, f"status {status}")
    live = next((r for r in (rows or []) if r["phase"] != "finished"), None)
    check("an unfinished match is found, so App swaps to the board",
          live is not None and live["id"] == match_id, f"{live}")

    status, snapshot, _ = call(
        "GET", f"/rest/v1/match_state?match_id=eq.{match_id}&select=seq,snapshot", jwt)
    check("useMatch reads the snapshot through RLS",
          status == 200 and snapshot and snapshot[0].get("snapshot"), f"status {status}")

    # -- One turn, which is resolve-action seen from a browser ----------------

    state = snapshot[0]["snapshot"]
    turn = state.get("turn") or {}
    unit_id = turn.get("unitId")
    check("it is the human's turn on arrival", bool(unit_id), f"unit {unit_id}")

    # Since 2H.12 (ecart 58) a human Striker or Breaker first chooses its place
    # in its role, and the door refuses any other action until it has. The
    # place prompt is what the browser shows on arrival, so the check answers
    # it the way the browser does: place 1, which opens the turn in the same
    # reply. A Trajector or a Bulwark has no prompt and skips this.
    if turn.get("placing") is not None:
        status, placed, headers = call("POST", "/functions/v1/resolve-action", jwt,
                                       {"matchId": match_id, "unitId": unit_id,
                                        "action": {"kind": "choosePlace", "place": 1}})
        ok = status == 200 and placed.get("accepted")
        check("resolve-action accepted the place choice (ecart 58)", ok,
              f"status {status}" + ("" if ok else f" {placed}"))

    # -- The turn clock belongs to the turn, not to the request ---------------
    # A turn is several requests, walk, act, walk again, end, and each one used
    # to be handed a fresh sixty seconds. A player who kept clicking was never
    # on a clock at all, while the display restarted at sixty every time.

    status, row, _ = call("GET", f"/rest/v1/matches?id=eq.{match_id}&select=turn_deadline", jwt)
    first = (row or [{}])[0].get("turn_deadline")
    check("a human turn carries a deadline", bool(first), f"{first}")

    # Dodge spends the Action without ending the turn, so the same unit is
    # still on the clock afterwards and the deadline must not have moved.
    status, played, headers = call("POST", "/functions/v1/resolve-action", jwt,
                                   {"matchId": match_id, "unitId": unit_id,
                                    "action": {"kind": "dodge"}})
    allowed = {k.lower(): v for k, v in headers.items()}.get("access-control-allow-origin")
    ok = status == 200 and played.get("accepted")
    check("resolve-action accepted a turn action", ok,
          f"status {status}" + ("" if ok else f" {played}"))
    check("resolve-action reply carries CORS", allowed in ("*", ORIGIN), f"origin {allowed}")
    status, row, _ = call("GET", f"/rest/v1/matches?id=eq.{match_id}&select=turn_deadline", jwt)
    second = (row or [{}])[0].get("turn_deadline")
    check("acting again inside the same turn does not restart the clock",
          second == first, f"{first} then {second}")

    later = call("GET", f"/rest/v1/match_state?match_id=eq.{match_id}&select=snapshot", jwt)[1]
    turn = (later[0]["snapshot"].get("turn") or {}) if later else {}
    if turn.get("unitId") == unit_id and turn.get("placing") is None:
        status, ended, _ = call("POST", "/functions/v1/resolve-action", jwt,
                                {"matchId": match_id, "unitId": unit_id,
                                 "action": {"kind": "endTurn"}})
        check("ending the turn is accepted", status == 200 and ended.get("accepted"),
              f"status {status}")

    # -- Orders to AI team-mates ----------------------------------------------
    # The channel `ai/orders.ts` describes as most of what a solo player does,
    # which nothing ever wrote into.

    snap = call("GET", f"/rest/v1/match_state?match_id=eq.{match_id}&select=snapshot", jwt)[1]
    board = snap[0]["snapshot"] if snap else {}
    mine = next((u for u in board.get("units", [])
                 if u.get("controller", {}).get("kind") == "human"), None)
    mates = [u for u in board.get("units", [])
             if u["team"] == (mine or {}).get("team")
             and u["id"] != (mine or {}).get("id")
             and u.get("controller", {}).get("kind") != "human"]
    check("the board has AI team-mates to order", len(mates) > 0, f"{len(mates)} mates")

    if mine and mates:
        status, said, _ = call("POST", "/functions/v1/resolve-action", jwt, {
            "matchId": match_id,
            "orders": [{"kind": "callForPass", "to": m["id"], "receiverId": mine["id"]}
                       for m in mates],
        })
        check("an orders-only request is accepted", status == 200 and said.get("accepted"),
              f"status {status} {said if status != 200 else ''}")
        check("it plays nothing and spends no turn", said.get("events") == [], f"{said.get('events')}")

        status, row, _ = call("GET", f"/rest/v1/matches?id=eq.{match_id}&select=orders", jwt)
        stored = (row or [{}])[0].get("orders") or []
        check("the orders are standing on the match", len(stored) == len(mates), f"{len(stored)} stored")

        # An order for the other side is a refusal, not a silent no-op.
        foe = next((u for u in board["units"] if u["team"] != mine["team"]), None)
        status, refused, _ = call("POST", "/functions/v1/resolve-action", jwt, {
            "matchId": match_id,
            "orders": [{"kind": "callForPass", "to": foe["id"], "receiverId": mine["id"]}],
        })
        check("ordering the house is refused", status == 400 and not refused.get("accepted"),
              f"status {status}")

    # -- Recording a win ------------------------------------------------------
    # `teams.wins` was written by no code at all, so no battery could leave
    # Rookie. The function is service-role only; a signed-in player must not be
    # able to award themselves the ladder.

    status, cheat, _ = call("POST", "/rest/v1/rpc/record_team_win", jwt, {"team": team_id})
    check("a player cannot record their own win", status >= 400, f"status {status}")

    status, row, _ = call("GET", f"/rest/v1/teams?id=eq.{team_id}&select=wins,tier", jwt)
    check("the win counter is still zero", (row or [{}])[0].get("wins") == 0, f"{row}")

finally:
    call("DELETE", f"/auth/v1/admin/users/{user_id}", SERVICE, key=SERVICE)
    print("\nthrowaway player deleted, everything cascades off it")

print("\n" + ("ALL GREEN" if not failures else f"{len(failures)} FAILED: {failures}"))
sys.exit(1 if failures else 0)
