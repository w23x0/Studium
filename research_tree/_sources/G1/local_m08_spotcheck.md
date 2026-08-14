# Snapshot: M08 9+other + spot-check sample (local)

Source: docs/图工程调研/06-M08技术选型.md §3; edges-audited.jsonl (Apostol Ch10 sample)
Fetched: 2026-08-14

## M08 closed rel set

is-a / part-of / requires / implies / equivalent / contrasts / applies-to / generalizes / alias-of + other (rel_note required)

## Spot-check: edges-audited.jsonl (187 lines, Ch10 experiment)

Sample pattern: pedagogical "历史动机" links use `"rel": "other"` + `"label"` as rel_note (e.g. racecourse-paradox → infinite-series).

No automatic import from Math-KG/OntoMath — existing graph already uses other+label for non-core semantics.

## Relevance

Validates G1 mapping policy: domain relations that don't fit 9 core → **other+rel_note**, not new rel tokens.
