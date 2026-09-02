"""Does the Row Level Security actually behave? Asked of a live project.

Reading `pg_policies` only says the policies exist. This signs two real users
in and checks what each of them can and cannot see and write, which is the only
claim about RLS worth making. It found two things on the first run against the
project on 2026-09-02, one of them a real defect fixed by migration 0002.

It is not a vitest test because it needs a live Supabase project and a network
round trip; the suite under `npm test` runs in milliseconds and must stay that
way. Python with nothing but the standard library, so there is no dependency to
install to run it.

    set -a && . ./.env && set +a          # from the workspace root
    python boomball/supabase/checks/rls-check.py

Reads SUPABASE_BOOMBALL_URL, SUPABASE_BOOMBALL_ANON_KEY and
SUPABASE_BOOMBALL_SERVICE_ROLE_KEY. It creates two throwaway users and deletes
everything it made, including on the paths where a check fails.

**A refused write does not answer 403.** With no write policy at all, an UPDATE
or a DELETE matches no rows rather than raising, and PostgREST answers 204,
which is the same 204 it gives a write that worked. Every write check below
therefore reads the row back with the service role and asserts on what the
database kept. The first version of this file asserted on the status code and
reported a passing schema as broken.
"""
import json
import os
import sys
import urllib.error
import urllib.request

URL = os.environ["SUPABASE_BOOMBALL_URL"]
ANON = os.environ["SUPABASE_BOOMBALL_ANON_KEY"]
SERVICE = os.environ["SUPABASE_BOOMBALL_SERVICE_ROLE_KEY"]

UA = "boomball-rls-check/1.0"


def call(method, path, token, body=None, key=ANON, extra=None):
    headers = {
        "apikey": key,
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "User-Agent": UA,
    }
    headers.update(extra or {})
    request = urllib.request.Request(
        URL + path,
        data=None if body is None else json.dumps(body).encode("utf-8"),
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request) as response:
            text = response.read().decode("utf-8")
            return response.status, (json.loads(text) if text.strip() else None)
    except urllib.error.HTTPError as error:
        text = error.read().decode("utf-8")
        try:
            return error.code, json.loads(text)
        except json.JSONDecodeError:
            return error.code, text


def as_service(method, path, body=None, extra=None):
    return call(method, path, SERVICE, body=body, key=SERVICE, extra=extra)


def make_user(email, password):
    status, body = as_service(
        "POST", "/auth/v1/admin/users",
        body={"email": email, "password": password, "email_confirm": True},
    )
    if status not in (200, 201):
        raise SystemExit("could not create " + email + ": " + str(status) + " " + str(body))
    return body["id"]


def sign_in(email, password):
    status, body = call(
        "POST", "/auth/v1/token?grant_type=password", ANON,
        body={"email": email, "password": password},
    )
    if status != 200:
        raise SystemExit("could not sign in " + email + ": " + str(status) + " " + str(body))
    return body["access_token"]


results = []


def check(label, expected, got):
    ok = expected == got
    results.append(ok)
    print(("  ok  " if ok else "  FAIL") + "  " + label
          + ": expected " + repr(expected) + ", got " + repr(got))


def score_of(match_id):
    """What the database kept, read past RLS. The only honest witness here."""
    _, body = as_service("GET", "/rest/v1/matches?id=eq." + match_id + "&select=score_a")
    return (body or [{}])[0].get("score_a")


def run(alice_id, bob_id, alice, bob, made):
    print("== reference data, readable once signed in ==")
    status, body = call("GET", "/rest/v1/role_stats?select=role,tier", alice)
    check("alice reads role_stats", (200, 12), (status, len(body or [])))
    status, body = call("GET", "/rest/v1/arenas?select=id", alice)
    check("alice reads arenas", (200, 1), (status, len(body or [])))
    status, body = call("GET", "/rest/v1/role_stats?select=role", ANON)
    check("the anon key on its own reads nothing", (200, 0), (status, len(body or [])))

    print("== profiles ==")
    status, _ = call("POST", "/rest/v1/profiles", alice,
                     body={"id": alice_id, "display_name": "Alice"})
    check("alice writes her own profile", 201, status)
    status, _ = call("POST", "/rest/v1/profiles", bob, body={"id": bob_id, "display_name": "Bob"})
    check("bob writes his own profile", 201, status)
    status, _ = call("POST", "/rest/v1/profiles", bob,
                     body={"id": alice_id, "display_name": "Not Alice"})
    check("bob cannot write a profile as alice", 403, status)
    status, body = call("GET", "/rest/v1/profiles?select=id", bob)
    check("bob sees only his own profile", (200, [bob_id]),
          (status, [row["id"] for row in body or []]))

    print("== teams ==")
    # `return=representation` is what supabase-js `.insert().select()` sends, and
    # it is the shape migration 0002 exists for. Insert without it and the bug
    # this suite found comes back unnoticed.
    status, body = call("POST", "/rest/v1/teams", alice,
                        body={"owner": alice_id, "name": "The Powder Kegs"},
                        extra={"Prefer": "return=representation"})
    check("alice creates her team and reads it back in one call", 201, status)
    if status != 201:
        raise SystemExit("no team to carry on with")
    team = body[0]
    made["team"] = team["id"]
    check("the tier is derived, never supplied", "rookie", team.get("tier"))

    status, body = call("GET", "/rest/v1/teams?select=id", bob)
    check("bob sees no team of hers", (200, 0), (status, len(body or [])))
    call("PATCH", "/rest/v1/teams?id=eq." + team["id"], bob, body={"wins": 99})
    _, body = as_service("GET", "/rest/v1/teams?id=eq." + team["id"] + "&select=wins")
    check("bob cannot bump her wins", 0, (body or [{}])[0].get("wins"))

    status, _ = call("PATCH", "/rest/v1/teams?id=eq." + team["id"], alice, body={"tier": "star"})
    check("nobody writes the generated tier by hand", 400, status)
    call("PATCH", "/rest/v1/teams?id=eq." + team["id"], alice, body={"wins": 6})
    _, body = as_service("GET", "/rest/v1/teams?id=eq." + team["id"] + "&select=wins,tier")
    check("six wins derive the star tier", ("star", 6),
          ((body or [{}])[0].get("tier"), (body or [{}])[0].get("wins")))
    call("PATCH", "/rest/v1/teams?id=eq." + team["id"], alice, body={"wins": 0})

    print("== match tables: read through team membership, written by nobody ==")
    status, body = as_service(
        "POST", "/rest/v1/matches",
        body={"team_id": team["id"], "arena_id": "kill-silo", "tier": "rookie", "rng_seed": 5},
        extra={"Prefer": "return=representation"},
    )
    check("the service role opens a match", 201, status)
    if status != 201:
        raise SystemExit("no match to carry on with")
    match_id = body[0]["id"]
    made["match"] = match_id

    status, body = call("GET", "/rest/v1/matches?id=eq." + match_id + "&select=id", alice)
    check("alice reads her team's match", (200, 1), (status, len(body or [])))
    status, body = call("GET", "/rest/v1/matches?id=eq." + match_id + "&select=id", bob)
    check("bob cannot read it", (200, 0), (status, len(body or [])))

    status, _ = call("POST", "/rest/v1/match_events", alice,
                     body={"match_id": match_id, "seq": 0, "kind": "goal", "payload": {}})
    check("alice cannot write herself a goal", 403, status)
    status, _ = call("POST", "/rest/v1/match_state", alice,
                     body={"match_id": match_id, "seq": 0, "snapshot": {}})
    check("alice cannot write a snapshot", 403, status)
    status, _ = call("POST", "/rest/v1/match_participants", alice,
                     body={"match_id": match_id, "unit_id": "A1", "profile_id": alice_id,
                           "role": "striker", "character_name": "Bombast"})
    check("alice cannot seat herself", 403, status)

    # These two answer 204 whether they worked or matched nothing, so the row is
    # what gets asserted on.
    call("PATCH", "/rest/v1/matches?id=eq." + match_id, alice, body={"score_a": 10})
    check("alice cannot edit the score", 0, score_of(match_id))
    call("DELETE", "/rest/v1/matches?id=eq." + match_id, alice)
    _, body = as_service("GET", "/rest/v1/matches?id=eq." + match_id + "&select=id")
    check("alice cannot delete the match", 1, len(body or []))

    status, _ = as_service(
        "POST", "/rest/v1/match_events",
        body={"match_id": match_id, "seq": 0, "kind": "roundStarted", "payload": {"round": 1}},
    )
    check("the service role appends an event", 201, status)
    status, body = call("GET", "/rest/v1/match_events?match_id=eq." + match_id + "&select=seq",
                        alice)
    check("alice reads that event through her team", (200, 1), (status, len(body or [])))
    status, body = call("GET", "/rest/v1/match_events?match_id=eq." + match_id + "&select=seq", bob)
    check("bob reads nothing of it", (200, 0), (status, len(body or [])))


def main():
    password = "boomball-rls-check-" + os.urandom(8).hex()
    alice_email = "alice." + os.urandom(4).hex() + "@example.invalid"
    bob_email = "bob." + os.urandom(4).hex() + "@example.invalid"

    alice_id = make_user(alice_email, password)
    bob_id = make_user(bob_email, password)
    made = {}
    try:
        run(alice_id, bob_id, sign_in(alice_email, password), sign_in(bob_email, password), made)
    finally:
        if "match" in made:
            as_service("DELETE", "/rest/v1/matches?id=eq." + made["match"])
        if "team" in made:
            as_service("DELETE", "/rest/v1/teams?id=eq." + made["team"])
        as_service("DELETE", "/auth/v1/admin/users/" + alice_id)
        as_service("DELETE", "/auth/v1/admin/users/" + bob_id)

    passed = sum(1 for ok in results if ok)
    print("")
    print(str(passed) + "/" + str(len(results)) + " checks passed")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
