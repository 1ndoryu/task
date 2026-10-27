# Bloqueos de PROYECTO TASKS (sacados del roadmap el 2026-10-26)

Decisiones externas que quedaron fuera del roadmap al limpiarlo. Se retoman cuando la usuaria las decida.

- Bloqueo `19AA-4` — dominios con credenciales externas: la usuaria elige proveedores y crea las cuentas y llaves (WhatsApp, agent actions/research, Magnific, Google OAuth, grupos Facebook, Stripe con webhooks, servidor MCP). Hasta entonces se degradan con mensaje claro; el chat IA y la nutrición ya funcionan vía proxy `/api/ai/chat` + `/api/ai/nutricion` (`.env.example`, `run.md`). Se desbloquea con esas credenciales.
- Bloqueo `21AE-2` — mostrar las notas y los grupos archivados: la forma de la vista la decide la usuaria (aparcado a propósito). El archivado ya existe (`archivada` en `notes`, `PUT /api/notes/{id}/archivo`, lista `archivadas`, grupos archivados en `localStorage`); falta el panel y desarchivar desde él.
- **Rama `origin/legacy-php` (12-10-2026, decidido: no integrar aquí).** Sin ancestro común con `main` (874 commits; `main…legacy-php` = 1561 archivos, +61958/−94282). Integrarla exige `--allow-unrelated-histories` y resolver el árbol entero: decisión de la usuaria. Se conserva en remoto; bundle verificado en `C:/tmp/bundles/task-legacy-php.bundle` (copia de trabajo en C:\tmp, no respaldo definitivo). Desbloquea: decidir entre integrarla o archivarla en `rescate/legacy-php`.
