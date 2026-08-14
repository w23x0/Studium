# Snapshot: FHIR Condition verificationStatus (HL7 R4)

Source: research_tree/findings/B6d_FHIR_发现.md (prior A-grade capture)
Fetched: 2026-08-14 G3 reuse

## Verbatim enumeration

verificationStatus: unconfirmed | provisional | differential | confirmed | refuted | entered-in-error

clinicalStatus: active | recurrence | relapse | inactive | remission | resolved

Constraint con-5: clinicalStatus SHALL NOT be present if verificationStatus is entered-in-error

## _history

create/update/delete → history entry; old versions retained for audit; delete = tombstone

## Relevance

G3 event mapping target vocabulary.
