# Enterprise DAM System Roadmap & Technical Spec — FYLEX

## 1. Implementation Phasing Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: BACKEND API EXPANSION                                         │
│ • Add SHA-256 duplicate hash lookup endpoint                            │
│ • Add duplicate reference merge endpoint (/api/media/merge-duplicates) │
│ • Add side-by-side comparison metadata API                             │
│ • Add archive/restore endpoints for master raw assets                  │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: FRONTEND DAM DASHBOARD UPGRADE                                │
│ • Expand Optimization Center stats header with Health Score /100       │
│ • Implement Side-by-Side Visual Comparison Modal with zoom controls   │
│ • Add Duplicate Reference Merge Modal with Master File selection       │
│ • Add Version History drawer (Original, WebP, AVIF, Archived)        │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: APPROVAL & PUBLISHING WORKFLOW INTEGRATION                   │
│ • Implement "Approve & Publish Variant" workflow                      │
│ • Automatically relocate master originals to ./uploads/archive/        │
│ • Update database serveMode to 'auto' upon approval                    │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: AUDIT LOGS & HEALTH SCORE ANALYTICS                          │
│ • Record all approve/reject/merge actions in media_optimization_logs    │
│ • Add real-time Storage Trend graph & Bandwidth Savings metric         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Risk Analysis & Rollback Plan

### Risks & Mitigations
- **Risk:** Deleting a duplicate file before re-assigning foreign keys breaks product images.
  - **Mitigation:** Database foreign keys are updated *before* physical deletion. The transaction rolls back if foreign key update fails.
- **Risk:** Aggressive compression degrades image quality on luxury watch dials.
  - **Mitigation:** Approval workflow requires visual side-by-side inspection before publishing. Master originals are preserved in `./uploads/archive/` and can be restored with a single click.

---

## 3. Rollback Procedure
If any variant approval or optimization causes visual regression:
1. Administrator opens Asset Detail in DAM Optimization Center.
2. Clicks **"Restore Original Master File"**.
3. NestJS service updates `serveMode` to `'original'`, restoring the master high-res asset immediately.
