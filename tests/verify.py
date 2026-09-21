#!/usr/bin/env python3
"""Validate 2017 HKDSE session data and countdown arithmetic."""

from __future__ import annotations

import datetime as dt
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
HKT = dt.timezone(dt.timedelta(hours=8))

NODE_DUMP = r"""
const fs = require("fs");
const vm = require("vm");
const ctx = { window: {}, globalThis: {} };
vm.runInNewContext(fs.readFileSync(process.argv[1], "utf8"), ctx);
const data = ctx.window.HKDSE_2017 || ctx.globalThis.HKDSE_2017;
if (!data) throw new Error("HKDSE_2017 not found");
console.log(JSON.stringify(data.sessions));
"""


def load_sessions() -> list[dict]:
    result = subprocess.run(
        ["node", "-e", NODE_DUMP, str(ROOT / "exams.js")],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(f"failed to load exams.js:\n{result.stderr}")
    return json.loads(result.stdout)


def split_duration(ms: int) -> tuple[int, int, int, int]:
    safe = max(0, int(ms) // 1000)
    days, rem = divmod(safe, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, seconds = divmod(rem, 60)
    return days, hours, minutes, seconds


def main() -> None:
    sessions = load_sessions()
    assert len(sessions) >= 50, f"expected a full timetable, got {len(sessions)}"

    required = {
        "視覺藝術",
        "綜合科學",
        "物理",
        "組合科學（物理）",
        "通識教育",
        "中國語文",
        "英國語文",
        "數學必修部分",
        "科技與生活",
        "化學",
        "組合科學（化學）",
        "英語文學",
        "設計與應用科技",
        "音樂",
        "體育",
        "中國歷史",
        "數學延伸部分",
        "歷史",
        "資訊及通訊科技",
        "地理",
        "生物",
        "組合科學（生物）",
        "倫理與宗教",
        "企業、會計與財務概論",
        "健康管理與社會關懷",
        "經濟",
        "旅遊與款待",
        "中國文學",
        "後備",
    }
    names = {row["subjectZh"] for row in sessions}
    missing = required - names
    assert not missing, f"missing subjects: {missing}"

    starts = []
    ids = []
    for row in sessions:
        ids.append(row["id"])
        start = dt.datetime.fromisoformat(row["start"])
        starts.append(start)
        assert start.tzinfo is not None, f"{row['id']} missing timezone"
        assert start.utcoffset() == dt.timedelta(hours=8), f"{row['id']} is not +08:00"
        assert start.year == 2017, f"{row['id']} is not 2017"
        assert row["period"] in {"AM", "PM"}
        if row["period"] == "AM":
            assert start.hour == 8 and start.minute == 30 and start.second == 0, row["id"]
        else:
            assert start.hour == 13 and start.minute == 30 and start.second == 0, row["id"]

    assert len(ids) == len(set(ids)), "duplicate session ids"
    assert min(starts).date() == dt.date(2017, 3, 31)
    assert max(starts).date() == dt.date(2017, 5, 6)

    chi_lit = next(row for row in sessions if row["id"] == "chilit-p1")
    chi_lit_day = dt.datetime.fromisoformat(chi_lit["start"])
    assert chi_lit_day.weekday() == 3, "4 May 2017 must be Thursday"

    lit_pm = next(row for row in sessions if row["id"] == "liteng-p2")
    assert dt.datetime.fromisoformat(lit_pm["start"]) == dt.datetime(2017, 4, 13, 13, 30, tzinfo=HKT)

    chi3 = next(row for row in sessions if row["id"] == "chi-p3")
    eng3 = next(row for row in sessions if row["id"] == "eng-p3")
    assert dt.datetime.fromisoformat(chi3["start"]).hour == 8
    assert dt.datetime.fromisoformat(eng3["start"]).hour == 8

    now = dt.datetime(2026, 9, 21, 14, 54, 0, tzinfo=HKT)
    first = dt.datetime.fromisoformat(sessions[0]["start"])
    elapsed_ms = int((now - first).total_seconds() * 1000)
    days, hours, minutes, seconds = split_duration(elapsed_ms)
    assert days > 3000
    assert hours < 24 and minutes < 60 and seconds < 60

    future = dt.datetime(2017, 3, 30, 8, 30, tzinfo=HKT)
    remain_ms = int((first - future).total_seconds() * 1000)
    days, hours, minutes, seconds = split_duration(remain_ms)
    assert (days, hours, minutes, seconds) == (1, 0, 0, 0)

    for path in (ROOT / "exams.js", ROOT / "countdown.js", ROOT / "app.js"):
        result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
        if result.returncode != 0:
            raise SystemExit(f"syntax error in {path.name}: {result.stderr}")

    countdown = subprocess.run(
        [
            "node",
            "-e",
            r"""
const fs = require("fs");
const vm = require("vm");
const ctx = { window: {}, globalThis: {}, module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(process.argv[1], "utf8"), ctx);
const c = ctx.HKDSECountdown || ctx.module.exports;
const target = Date.parse("2017-03-31T08:30:00+08:00");
const now = Date.parse("2017-03-31T08:30:05+08:00");
const snap = c.measure(target, now);
if (!snap.finished || snap.seconds !== 5) {
  throw new Error("countdown measure failed: " + JSON.stringify(snap));
}
const remain = c.measure(target, Date.parse("2017-03-31T08:29:00+08:00"));
if (remain.finished || remain.minutes !== 1 || remain.seconds !== 0) {
  throw new Error("remaining measure failed: " + JSON.stringify(remain));
}
console.log("countdown-ok");
            """,
            str(ROOT / "countdown.js"),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if countdown.returncode != 0:
        raise SystemExit(f"countdown.js failed:\n{countdown.stderr}\n{countdown.stdout}")

    app_js = (ROOT / "app.js").read_text(encoding="utf-8")
    assert "Date.now()" in app_js
    assert "DOMHighResTimeStamp" in app_js or "always recompute from Date.now()" in app_js
    assert "requestAnimationFrame(loop)" in app_js
    assert "function loop(nowMs)" not in app_js, "rAF callback must not treat its timestamp as wall-clock time"

    print(f"OK: {len(sessions)} sessions, dates 2017-03-31 to 2017-05-06, +08:00 timestamps")


if __name__ == "__main__":
    main()
    sys.exit(0)
