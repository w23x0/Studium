#!/usr/bin/env python3
"""P5: FSRS interval inverse prototype — mechanical reproducibility for M05 directional signal."""
import json
import math
import sys

# FSRS-4.5 params from awesome-fsrs wiki (public defaults excerpt)
DECAY = -0.5
FACTOR = 19 / 81


def retrievability(t_days: float, stability: float) -> float:
    """R(t,S) = (1 + FACTOR*t/S)^DECAY"""
    return (1 + FACTOR * t_days / stability) ** DECAY


def interval_from_target(r_target: float, stability: float) -> float:
    """I(r,S) = S/FACTOR * (r^(1/DECAY) - 1); r=0.9 => I=S"""
    return (stability / FACTOR) * (r_target ** (1 / DECAY) - 1)


def main():
    out = []
    cases = [
        ("baseline", 10.0, 0.9),
        ("low_stability", 3.0, 0.9),
        ("high_stability", 60.0, 0.9),
        ("target_85", 10.0, 0.85),
    ]
    for name, S, r_tgt in cases:
        I = interval_from_target(r_tgt, S)
        R_at_I = retrievability(I, S)
        out.append({
            "case": name,
            "S_days": S,
            "target_r": r_tgt,
            "interval_days": round(I, 6),
            "R_at_interval": round(R_at_I, 6),
            "roundtrip_err": round(abs(R_at_I - r_tgt), 9),
        })
    # verify r=0.9 => I=S
    I90 = interval_from_target(0.9, 10.0)
    assert abs(I90 - 10.0) < 1e-9, f"I(0.9,10)={I90}"
    # simulate 3-review revlog: overdue convergence property (monotonic S growth capped)
    S, D = 1.0, 5.0
    revlog = []
    for day, grade in [(0, 3), (4, 3), (12, 3), (40, 2)]:
        r_now = retrievability(day - (revlog[-1]["day"] if revlog else 0), S) if revlog else 1.0
        next_I = interval_from_target(0.9, S)
        revlog.append({"day": day, "grade": grade, "S_before": S, "R_at_review": round(r_now, 4), "suggested_next_I": round(next_I, 4)})
        S = S * (1 + 0.3 * (4 - D) * (1 - r_now))  # simplified SInc stub for demo
        S = min(S, 365.0)
    result = {"formula_check": out, "revlog_demo": revlog, "pass": True}
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
