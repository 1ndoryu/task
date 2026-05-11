# GloryTemplate Agent Guidelines

## Project Shape
- WordPress theme with PHP REST controllers in `App/Api`, services in `App/Services`, repositories in `App/Repository`, and React islands in `App/React`.
- The operational roadmap is [App/roadmap.md](App/roadmap.md). Read it before code changes.
- Production is `task.nakomi.studio`; Coolify site name is `nakomi`.

## Remote Agent Requests
- [115A-12] WhatsApp and GitHub requests may invoke OpenCode through the `whatsapp-code` agent.
- Remote requests are allowed to edit code only after they are represented as an approved job, GitHub comment, or manual workflow dispatch.
- Use `opencode/gpt-5.3-codex` by default for coding tasks unless the job specifies another `provider/model` ID.
- Keep all secrets in environment variables. Never read or print `.env` values.

## Validation And Git
- Batch related edits, then run the relevant validation once before closing the job.
- For this repo, prefer `npm run type-check:app` for App React changes and `npm run self-check -- -TareaId <ID>` before commit when available.
- Never use `git add .` or destructive git commands. Add explicit paths and avoid reverting unrelated changes.
- If a request includes commit or push, include the task ID in the commit message when one is available.

## Deploy
- All production operations must go through `coolify-manager-rs`.
- Use `.agent/coolify-manager-rs/target/release/coolify-manager.exe deploy --name nakomi --update`, then run health.
- Do not use raw SSH, `docker`, or `scp` as a deploy path.
