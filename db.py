"""SQLite storage and lesson snapshots for the BANSAY prototype."""

import hashlib
import json
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

AUTH_ITERATIONS = 250_000
SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
    salt BLOB NOT NULL, digest BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES users(id),
    mentor_id TEXT NOT NULL REFERENCES users(id),
    class_date TEXT NOT NULL,
    status TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY,
    case_id TEXT NOT NULL REFERENCES cases(id),
    client_id TEXT,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    mode TEXT,
    ended INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE (case_id, client_id)
);
CREATE TABLE IF NOT EXISTS evidence (
    case_id TEXT NOT NULL REFERENCES cases(id),
    kind TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id),
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (case_id, kind)
);
CREATE TABLE IF NOT EXISTS live_usage (
    day TEXT PRIMARY KEY, sessions INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS transcript_corrections (
    turn_id INTEGER PRIMARY KEY REFERENCES turns(id),
    text TEXT NOT NULL,
    corrected_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cases_by_teacher ON cases(teacher_id, class_date);
CREATE INDEX IF NOT EXISTS cases_by_mentor ON cases(mentor_id, class_date);
CREATE INDEX IF NOT EXISTS turns_by_case ON turns(case_id, id);
"""

SCIENCE = {
    "version": "mixtures-and-solutions-v1",
    "scenario": "A Grade 7 science learner watches salt dissolve in water.",
    "belief": "If I can't see the salt, it might no longer be there.",
    "opening": "If it disappeared, how could we get it back?",
    "followUps": [
        "If the salt is still there, why can't I see it?",
        "What would happen if we let the water evaporate?",
        "What would we see that tells us the salt was still there?",
    ],
    "transferPrompt": "You stir sugar into a clear drink until you can no longer see any grains. A learner says, “The sugar is gone because the drink is still clear.” How would you explain what happened and what evidence would support your explanation?",
    "rubric": "Look for the distinction between visibility and presence, an explanation that sugar remains dispersed in the solution, and suitable evidence. Flag claims that the sugar ceased to exist or that boiling it would reliably recover unchanged sugar.",
    "guide": {
        "bridge": "In everyday English, “disappear” can mean either “go away” or “become hard to see.” In this lesson, specify that the salt is no longer visible but is still present in the solution.",
        "misconception": "A clear solution can still contain dissolved material. Ask learners what observation could distinguish “I can't see it” from “it isn't there.”",
        "activity": "Add salt to a small cup of water and stir. Pour a spoonful into a shallow dish. Mark a second dish with plain water for comparison. Let both dishes stand in a suitable place until dry. Compare what remains and ask what it tells you about the clear solution.",
    },
}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def password_hash(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, AUTH_ITERATIONS)


@contextmanager
def connect(path, *, write=False):
    connection = sqlite3.connect(path, timeout=10, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        connection.execute("BEGIN IMMEDIATE" if write else "BEGIN")
        yield connection
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    finally:
        connection.close()


def lesson_snapshot(details, closures=()):
    subject = details.get("subject", "").casefold()
    grade = details.get("grade", "").casefold().replace("grade", "").strip()
    topic = f"{details.get('title', '')} {details.get('competency', '')}".casefold()
    supported = (
        "science" in subject and grade == "7"
        and any(word in topic for word in ("mixture", "solution", "dissolv", "salt", "solubility"))
    )
    snapshot = dict(SCIENCE) if supported else {
        "version": "unsupported-v1",
        "scenario": "",
        "guide": None,
    }
    due_date = date.fromisoformat(details["classDate"])
    for _ in range(2):
        due_date -= timedelta(days=1)
        while due_date.weekday() >= 5 or due_date.isoformat() in closures:
            due_date -= timedelta(days=1)
    snapshot.update(details, reviewDueDate=due_date.isoformat(), supported=supported)
    return snapshot


def create_case(connection, snapshot, teacher_id, *, case_id=None):
    case_id = case_id or secrets.token_urlsafe(12)
    timestamp = now()
    connection.execute(
        "INSERT INTO cases VALUES (?, ?, ?, ?, ?, ?, ?)",
        (case_id, teacher_id, "mentor", snapshot["classDate"], "draft", json.dumps(snapshot), timestamp),
    )
    if snapshot["supported"]:
        connection.execute(
            "INSERT INTO turns(case_id, role, text, created_at) VALUES (?, 'student', ?, ?)",
            (case_id, snapshot["opening"], timestamp),
        )
    return case_id


def initialize(path, closures=()):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10)
    try:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.executescript(SCHEMA)
    finally:
        connection.close()
    with connect(path, write=True) as connection:
        if connection.execute("SELECT 1 FROM users LIMIT 1").fetchone():
            return
        for user_id, name, role in (
            ("mara", "Mara Villanueva", "teacher"),
            ("ana", "Ana Reyes", "teacher"),
            ("mentor", "Rosa Santos", "mentor"),
        ):
            salt = secrets.token_bytes(16)
            connection.execute(
                "INSERT INTO users VALUES (?, ?, ?, ?, ?)",
                (user_id, name, role, salt, password_hash("bansay-demo", salt)),
            )
        today = date.today()
        thursday = today + timedelta(days=(3 - today.weekday()) % 7 or 7)
        snapshot = lesson_snapshot(
            {
                "title": "Mixtures and solutions",
                "specialization": "English",
                "subject": "Science",
                "grade": "7",
                "competency": "Explain what happens when salt dissolves in water.",
                "classDate": thursday.isoformat(),
            },
            closures,
        )
        create_case(connection, snapshot, "mara", case_id="mara-thursday")


def case_turns(connection, case_id):
    return connection.execute(
        """SELECT t.id, t.role, COALESCE(c.text, t.text) AS text, t.text AS original_text,
        t.client_id, t.mode, t.ended, t.created_at, c.corrected_at
        FROM turns t LEFT JOIN transcript_corrections c ON c.turn_id = t.id
        WHERE t.case_id = ? ORDER BY t.id""",
        (case_id,),
    ).fetchall()


def live_day():
    return datetime.now(timezone.utc).date().isoformat()


def live_limit_reached(connection, daily_limit):
    usage = connection.execute("SELECT sessions FROM live_usage WHERE day = ?", (live_day(),)).fetchone()
    return usage is not None and usage["sessions"] >= daily_limit


def reserve_live_session(connection, daily_limit):
    cursor = connection.execute(
        """INSERT INTO live_usage VALUES (?, 1)
        ON CONFLICT(day) DO UPDATE SET sessions = sessions + 1
        WHERE sessions < ?""",
        (live_day(), daily_limit),
    )
    return cursor.rowcount == 1


def save_exchange(connection, case_id, client_id, teacher, learner, mode, ended):
    timestamp = now()
    connection.executemany(
        """INSERT INTO turns(case_id, client_id, role, text, mode, ended, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)""",
        [
            (case_id, client_id, "teacher", teacher, None, 0, timestamp),
            (case_id, None, "student", learner, mode, int(ended), timestamp),
        ],
    )
    connection.execute("UPDATE cases SET status = 'rehearsing' WHERE id = ?", (case_id,))


def public_turns(rows):
    return [
        {
            "role": row["role"], "text": row["text"], "createdAt": row["created_at"],
            **({"mode": row["mode"]} if row["mode"] else {}),
            **({"originalText": row["original_text"], "correctedAt": row["corrected_at"]} if row["corrected_at"] else {}),
        }
        for row in rows
    ]


def visible_cases(connection, user):
    if user["role"] == "teacher":
        where = "c.teacher_id = ?"
    else:
        where = "c.mentor_id = ? AND c.status NOT IN ('draft', 'rehearsing')"
    rows = connection.execute(
        f"""SELECT c.*, t.name AS teacher_name, m.name AS mentor_name
        FROM cases c JOIN users t ON t.id = c.teacher_id JOIN users m ON m.id = c.mentor_id
        WHERE {where} ORDER BY c.class_date, c.created_at""",
        (user["id"],),
    ).fetchall()
    output = []
    for row in rows:
        snapshot = json.loads(row["snapshot"])
        case = {
            key: snapshot.get(key)
            for key in (
                "title", "scenario", "specialization", "subject", "grade",
                "competency", "classDate", "reviewDueDate", "guide", "supported", "version",
            )
        }
        turns = case_turns(connection, row["id"])
        case.update(
            id=row["id"], status=row["status"], teacher=row["teacher_name"],
            mentor=row["mentor_name"], createdAt=row["created_at"], turns=public_turns(turns),
            mode=turns[-1]["mode"] if turns else None,
            rehearsalEnded=bool(turns and turns[-1]["ended"]),
            submission=None, review=None, revision=None, transfer=None, assessment=None,
        )
        if row["status"] in ("revised", "fresh_case_submitted", "assessed"):
            case["transferPrompt"] = snapshot["transferPrompt"]
        if user["role"] == "mentor":
            case["rubric"] = snapshot.get("rubric")
        records = connection.execute(
            """SELECT e.*, u.name AS author FROM evidence e JOIN users u ON u.id = e.author_id
            WHERE e.case_id = ? ORDER BY e.rowid""",
            (row["id"],),
        )
        for record in records:
            case[record["kind"]] = {
                **json.loads(record["payload"]),
                "author": record["author"],
                "createdAt": record["created_at"],
            }
        output.append(case)
    return output
