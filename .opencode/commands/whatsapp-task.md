---
description: "Execute an approved WhatsApp coding request with project validation, optional commit, and optional Coolify deploy."
agent: whatsapp-code
model: opencode/gpt-5.3-codex
---

Solicitud remota aprobada desde WhatsApp:

$ARGUMENTS

Antes de editar, lee `App/roadmap.md` y revisa el estado Git. Implementa la solicitud con cambios minimos y coherentes. Si el texto pide commit, valida antes y usa `git add` explicito por archivo. Si el texto pide deploy, usa solo `coolify-manager-rs` para `nakomi` y verifica health.
