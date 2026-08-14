#!/usr/bin/env python3
"""P8: Mock M09 revlog + P5 FSRS shadow scheduling (no M09 numeric state)."""
import json
import sys

DECAY = -0.5
FACTOR = 19 / 81


def interval_from_target(r_target, stability):
    return (stability / FACTOR) * (r_target ** (1 / DECAY) - 1)


def retrievability(t_days, stability):
    return (1 + FACTOR * t_days / stability) ** DECAY


# Synthetic M09-style events (G3 mapping labels)
MOCK_REVLOG = [
    {"day": 0, "event": "闭环结束·首次确认", "resource": "m09:closure-001", "grade": 3},
    {"day": 5, "event": "复检·维持", "resource": "m09:closure-001", "grade": 3},
    {"day": 14, "event": "复检·维持", "resource": "m09:closure-001", "grade": 2},
    {"day": 45, "event": "复检·推翻", "resource": "m09:closure-001", "grade": 1, "verificationStatus": "refuted"},
    {"day": 46, "event": "重新掌握", "resource": "m09:closure-001", "grade": 3, "verificationStatus": "confirmed"},
]


def shadow_schedule(events, S_init=1.0, r_target=0.9):
    S = S_init
    last_day = 0
    schedule = []
    for ev in events:
        day = ev["day"]
        elapsed = day - last_day if schedule else 0
        r_now = retrievability(elapsed, S) if schedule else 1.0
        suggested_I = interval_from_target(r_target, S)
        overdue = elapsed > suggested_I if schedule else False
        schedule.append({
            **ev,
            "elapsed_since_last": elapsed,
            "R_at_review": round(r_now, 4),
            "S_before": round(S, 4),
            "suggested_next_I_days": round(suggested_I, 4),
            "overdue": overdue,
            "m05_action": "定向：建议复习" if overdue else "定向：按间隔",
        })
        # simplified S update
        g = ev.get("grade", 3)
        if g >= 2:
            S = min(S * (1 + 0.25 * (1 - r_now)), 365.0)
        else:
            S = max(S * 0.5, 0.5)
        last_day = day
    return schedule


def main():
    out = {
        "mock_events_n": len(MOCK_REVLOG),
        "fsrs_shadow": shadow_schedule(MOCK_REVLOG),
        "g3_note": "refuted/confirmed events map to version boundary; FSRS only M05 directional",
        "pass": True,
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
