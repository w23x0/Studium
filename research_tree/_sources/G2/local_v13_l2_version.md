# Snapshot: storage v1.3 L1/L2 field triggers (local)

Source: research_tree/synthesis/存储选型决策点_v1.3.md
Fetched: 2026-08-14

## L1

RDF 1.2 + TriG; closed rel = valueSet or sh:in; SHACL read-only audit

## L2

meta.versionId changes on create/update/delete; _history append-only; verificationStatus state machine

## Relevance

G2: which node field edits trigger versionId change = content-bearing resource fields.
