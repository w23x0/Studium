# Snapshot: G2 schema externalRef + SHACL (local compose)

Source: G2 findings draft + P2 pySHACL定位
Fetched: 2026-08-14

## Pilot rule (C)

notation | method | physics-concept nodes MAY have:
- qudt:quantityKind → IRI
- qudt:unit → IRI (when expression carries units)
- qudt:dimensionVector → IRI (derived or explicit)
- externalRef: { system: "DLMF"|"Wikidata"|"QUDT", iri, label? }

SHACL: optional shape — if qudt:unit present then qudt:quantityKind required (C)

Edges: unchanged 9+other; QUDT does not add rel tokens (V3 K5)

## Relevance

G4 deliverable: pilot field spec for module integration.
