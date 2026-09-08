# Taste Profile
- Prefers self-hosted, self-managed infrastructure (chose "Self-hosted Postgres" over managed cloud options, specifically hosting on Hetzner) — favors direct control and cost-consciousness over fully managed cloud services. Confidence: 0.8
- Prefers running the API as a plain Node.js server with native Postgres drivers/transactions over constrained serverless/Worker runtimes when data integrity matters. Confidence: 0.7
- Prefers complete, thorough codebase-conversion migrations over partial/schema-only changes (chose "Full codebase conversion" over "Schema only"). Confidence: 0.7
- Prefers native SQL transactions / atomic guarantees for multi-step writes (chose "Native SQL transaction" over best-effort sequences) — values data integrity over implementation simplicity. Confidence: 0.7
- Comfortable delegating lower-level technical decisions to the agent ("you do what you think best") while retaining control over high-level architecture choices (e.g., DB hosting, runtime, migration scope). Confidence: 0.6
- Launches the agent in auto-accept mode (`cmd --yolo`, alias for bypassing permission prompts) rather than approving each edit/command — prefers uninterrupted autonomous execution during a work session. Confidence: 0.7
