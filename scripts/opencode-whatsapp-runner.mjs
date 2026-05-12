#!/usr/bin/env node
import {spawn, spawnSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const configPath = path.join(repoRoot, 'config', 'opencode-projects.json');
const defaultTimeoutMs = 45 * 60 * 1000;

/* [115A-12] Runner local para solicitudes remotas aprobadas.
 * Gotcha: no acepta rutas libres; solo proyectos declarados en config/opencode-projects.json.
 * [115A-13] Tambien soporta poll-once contra la cola HMAC de WordPress. */

function printHelp() {
    console.log(`Usage:
  npm run opencode:runner -- run --project glorytemplate --message "Fix X" [--commit] [--deploy] [--dry-run]
    npm run opencode:runner -- poll-once --api-url https://task.nakomi.studio/wp-json/glory/v1 [--dry-run]
    npm run opencode:runner -- loop --api-url https://task.nakomi.studio/wp-json/glory/v1 [--interval 15]

Options:
  --project <id>       Project key from config/opencode-projects.json.
  --message <text>     User request to send to OpenCode.
  --message-file <p>   Read request text from a file.
  --agent <id>         Override OpenCode agent, default from project config.
  --attach <url>       Attach opencode run to an existing opencode serve URL.
  --commit             Ask the agent to validate, commit and push if changes are made.
  --deploy             Ask the agent to deploy through coolify-manager-rs after commit/push.
  --timeout <ms>       Max execution time. Default: ${defaultTimeoutMs}.
  --dry-run            Print the command and prompt without executing OpenCode.

Polling options:
    --api-url <url>      REST namespace base, e.g. https://site/wp-json/glory/v1.
    --secret <value>     Runner HMAC secret. Defaults to OPENCODE_RUNNER_SECRET.
    --interval <s>       Seconds between polls in loop mode. Default: 15.
`);
}

function parseArgs(rawArgs) {
    const parsed = {_: []};
    for (let index = 0; index < rawArgs.length; index++) {
        const rawArg = rawArgs[index];
        if (!rawArg.startsWith('--')) {
            parsed._.push(rawArg);
            continue;
        }

        const withoutPrefix = rawArg.slice(2);
        const separatorIndex = withoutPrefix.indexOf('=');
        if (separatorIndex !== -1) {
            parsed[withoutPrefix.slice(0, separatorIndex)] = withoutPrefix.slice(separatorIndex + 1);
            continue;
        }

        const nextValue = rawArgs[index + 1];
        if (!nextValue || nextValue.startsWith('--')) {
            parsed[withoutPrefix] = true;
            continue;
        }

        parsed[withoutPrefix] = nextValue;
        index++;
    }
    return parsed;
}

function loadConfig() {
    if (!existsSync(configPath)) {
        throw new Error(`No existe ${path.relative(repoRoot, configPath)}.`);
    }
    const rawConfig = readFileSync(configPath, 'utf8');
    return JSON.parse(rawConfig);
}

function resolveProject(config, projectId) {
    const projects = config.projects || {};
    const project = projects[projectId];
    if (!project) {
        throw new Error(`Proyecto no permitido: ${projectId}. Agregalo a config/opencode-projects.json.`);
    }

    const projectPath = path.resolve(repoRoot, project.path || '.');
    if (!existsSync(projectPath)) {
        throw new Error(`La ruta del proyecto no existe: ${projectPath}.`);
    }

    return {project, projectPath};
}

function readMessage(options) {
    const inlineMessage = typeof options.message === 'string' ? options.message : '';
    if (inlineMessage.trim() !== '') {
        return inlineMessage.trim();
    }

    if (typeof options['message-file'] === 'string') {
        const messagePath = path.resolve(process.cwd(), options['message-file']);
        if (!existsSync(messagePath)) {
            throw new Error(`No existe el archivo de mensaje: ${messagePath}.`);
        }
        return readFileSync(messagePath, 'utf8').trim();
    }

    const positionalMessage = options._.slice(1).join(' ').trim();
    if (positionalMessage !== '') {
        return positionalMessage;
    }

    throw new Error('La solicitud remota requiere --message o --message-file.');
}

function buildPrompt({message, projectId, project, commitRequested, deployRequested, previousOutput}) {
    /* [115A-cont] La tarea va PRIMERO para que OpenCode no entre en "modo protocolo".
     * El boilerplate de instrucciones va después como contexto secundario. */
    const lines = [
        '=== TAREA A EJECUTAR ===',
        message,
        '=== FIN DE TAREA ===',
        '',
        `Proyecto: ${projectId}`,
        `Repositorio GitHub: ${project.repo || 'no configurado'}`,
        `Rama esperada: ${project.branch || 'no configurada'}`,
        '',
        'Instrucciones obligatorias:',
        '- Ejecuta SOLO la tarea descrita arriba. El roadmap es contexto, no una lista de tareas a ejecutar.',
        '- NUNCA ejecutes npm run opencode:runner, poll-once, loop ni node scripts/opencode-whatsapp-runner.mjs — ese proceso ya gestiono este job y correria en loop infinito.',
        '- NUNCA hagas curl ni fetch a /wp-json/glory/v1/agent/opencode — no tienes el secreto HMAC.',
        '- Lee App/roadmap.md y respeta AGENTS.md antes de editar codigo.',
        '- No reviertas cambios ajenos ni uses comandos destructivos.',
        '- Mantén los cambios acotados al pedido.',
        '- No leas ni imprimas secretos o archivos .env.',
        '- Si necesitas deploy, usa solo coolify-manager-rs; no uses SSH, docker ni scp directo.',
    ];

    if (commitRequested) {
        lines.push('- El usuario autorizo commit/push: valida primero, usa git add explicito por archivo, commit claro y git push.');
    } else {
        lines.push('- El usuario no marco --commit: deja los cambios listos y reporta validacion, sin commit ni push.');
    }

    if (deployRequested) {
        const deploy = project.deploy || {};
        lines.push(`- El usuario autorizo deploy: usa ${deploy.coolifyManagerPath || 'coolify-manager-rs'} deploy --name ${deploy.site || '<sitio>'} --update y luego health.`);
    }

    /* [115A-cont] Si hay output previo, inyectarlo como contexto antes del mensaje nuevo */
    if (previousOutput) {
        lines.push('', '--- Contexto de la sesion anterior ---');
        lines.push(previousOutput.slice(-800));
        lines.push('--- Fin del contexto anterior ---');
    }

    return lines.join('\n');
}

function resolveOpencodeCommand(opencodeBin) {
    if (process.platform !== 'win32') {
        return {command: opencodeBin, argsPrefix: []};
    }

    const rutas = [];
    if (path.isAbsolute(opencodeBin) && existsSync(opencodeBin)) {
        rutas.push(opencodeBin);
    } else {
        const where = spawnSync('where.exe', [opencodeBin], {encoding: 'utf8'});
        if (where.status === 0) {
            rutas.push(...(where.stdout || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean));
        }
    }

    for (const ruta of rutas) {
        if (ruta.toLowerCase().endsWith('.exe')) {
            return {command: ruta, argsPrefix: []};
        }

        const npmBin = path.join(path.dirname(ruta), 'node_modules', 'opencode-ai', 'bin', 'opencode');
        if (existsSync(npmBin)) {
            return {command: process.execPath, argsPrefix: [npmBin]};
        }
    }

    if (rutas.length > 0) {
        throw new Error(`OpenCode se encontro como wrapper de Windows (${rutas[0]}), pero no se pudo resolver node_modules/opencode-ai/bin/opencode.`);
    }
    throw new Error(`OpenCode no esta disponible en PATH (${opencodeBin}). Instala con npm install -g opencode-ai o el metodo oficial.`);
}

function assertOpencodeAvailable(commandSpec) {
    const result = spawnSync(commandSpec.command, [...commandSpec.argsPrefix, '--version'], {encoding: 'utf8'});
    if (result.error) {
        throw new Error(`OpenCode no esta disponible: ${result.error.message}`);
    }
    if (result.status !== 0) {
        throw new Error(`OpenCode respondio con exit ${result.status}: ${(result.stderr || result.stdout || '').trim()}`);
    }
    return (result.stdout || result.stderr || '').trim();
}

function cleanTerminalOutput(text) {
    return text
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
        .replace(/\x1b[ -/]*[@-~]/g, '')
        .replace(/[\x0f\x0e]/g, '');
}

function extractWhatsAppSummary(output) {
    const clean = cleanTerminalOutput(output);
    const direct = clean.match(/=== RESUMEN PARA WHATSAPP ===([\s\S]*?)=== FIN RESUMEN ===/);
    if (direct) return direct[1].trim();

    const withoutFences = clean.replace(/^```[^\n]*\n?/gm, '').replace(/```/g, '');
    const fenced = withoutFences.match(/=== RESUMEN PARA WHATSAPP ===([\s\S]*?)=== FIN RESUMEN ===/);
    return fenced ? fenced[1].trim() : '';
}

function resolveLatestSessionId(commandSpec, projectPath) {
    /* [115A-cont] Intentar con --max-count primero (OpenCode reciente) y sin el
     * flag como fallback (versiones anteriores que no lo soportan).
     * El JSON puede ser array directo [{id, directory}] o {sessions: [...]}.
     * En Windows path.resolve usa backslashes; normalizar para comparar. */
    const argVariants = [
        [...commandSpec.argsPrefix, 'session', 'list', '--format', 'json', '--max-count', '5'],
        [...commandSpec.argsPrefix, 'session', 'list', '--format', 'json'],
    ];
    const normalizePath = p => path.resolve(p).toLowerCase().replace(/\\/g, '/');
    const currentProjectPath = normalizePath(projectPath);

    for (const args of argVariants) {
        const result = spawnSync(
            commandSpec.command,
            args,
            {cwd: projectPath, encoding: 'utf8', timeout: 10000, env: process.env}
        );
        if (result.status !== 0 || result.error) continue;
        try {
            const parsed = JSON.parse(result.stdout || '[]');
            const sessions = Array.isArray(parsed) ? parsed
                : Array.isArray(parsed?.sessions) ? parsed.sessions
                : [];
            if (sessions.length === 0) continue;
            const session = sessions.find(item => normalizePath(String(item?.directory || '')) === currentProjectPath) || sessions[0];
            if (typeof session?.id === 'string' && session.id) return session.id;
        } catch {
            // probar siguiente variante
        }
    }
    return '';
}

function buildOpencodeArgs({projectPath, model, agent, attachUrl, prompt, sessionId}) {
    const opencodeArgs = ['run', '--dir', projectPath, '--model', model];
    if (agent) opencodeArgs.push('--agent', agent);
    /* [115A-cont] Continuacion de sesion: --session pasa el ID al contexto previo de OpenCode */
    if (sessionId) opencodeArgs.push('--session', sessionId);
    if (attachUrl) opencodeArgs.push('--attach', attachUrl);
    opencodeArgs.push(prompt);
    return opencodeArgs;
}

/* [125A-1] Inyecta comandos extra en el YAML frontmatter del agente antes de ejecutar.
 * Inserta las nuevas entradas justo antes de "\"*\": ask" para que tengan precedencia.
 * Devuelve el contenido original para restaurar tras ejecutar. */
function injectExtraPermissions(agentFilePath, extraCommands) {
    if (!existsSync(agentFilePath) || extraCommands.length === 0) return null;
    const original = readFileSync(agentFilePath, 'utf8');
    const marker = '"*": ask';
    if (!original.includes(marker)) return null;
    const additions = extraCommands.map(cmd => `    "${cmd}": allow`).join('\n');
    const patched = original.replace(marker, `${additions}\n    ${marker}`);
    writeFileSync(agentFilePath, patched, 'utf8');
    console.error(`[runner] Extra permissions inyectados (${extraCommands.length}): ${extraCommands.join(', ')}`);
    return original;
}

function runOpencode({commandSpec, opencodeArgs, projectPath, timeoutMs, requestedSessionId = ''}) {
    return new Promise((resolve, reject) => {
        /* Ejecutar sin shell: el prompt multilinea debe viajar como un unico argv.
         * En Windows resolvemos el wrapper npm a `node .../opencode` para evitar cmd.exe. */
        const child = spawn(commandSpec.command, [...commandSpec.argsPrefix, ...opencodeArgs], {
            cwd: projectPath,
            stdio: ['inherit', 'pipe', 'pipe'],
            env: process.env,
        });

        let outputBuffer = '';
        let sessionId = requestedSessionId;
        const onData = (stream, chunk) => {
            stream.write(chunk);
            const text = chunk.toString();
            outputBuffer += text;
            if (outputBuffer.length > 120000) outputBuffer = outputBuffer.slice(-120000);
            /* [115A-cont] Capturar session ID del output de OpenCode para continuacion de sesion */
            if (!sessionId) {
                const m = text.match(/session[:\s]+([a-zA-Z0-9_-]{6,64})/i);
                if (m) sessionId = m[1];
            }
        };
        child.stdout.on('data', chunk => onData(process.stdout, chunk));
        child.stderr.on('data', chunk => onData(process.stderr, chunk));

        /* [116A-4] Conservar una ventana amplia: el resumen puede quedar antes de logs finales. */
        const getOutput = () => outputBuffer.trim();

        const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            const output = getOutput();
            reject(Object.assign(new Error(`Timeout ejecutando OpenCode tras ${timeoutMs}ms.`), {
                output,
                session_id: sessionId,
                whatsapp_summary: extractWhatsAppSummary(output),
            }));
        }, timeoutMs);

        child.on('error', error => {
            clearTimeout(timeout);
            const output = getOutput();
            reject(Object.assign(error, {
                output,
                session_id: sessionId,
                whatsapp_summary: extractWhatsAppSummary(output),
            }));
        });

        /* [115A-16b] Usar 'close' en lugar de 'exit': el evento 'exit' dispara cuando
         * el proceso termina pero los buffers de stdout/stderr pueden no haberse
         * vaciado todavia. 'close' garantiza que todos los streams cerraron y toda
         * la data (incluidos los marcadores del resumen) ya fue emitida como 'data'.
         * Gotcha: OpenCode 1.14.48 no imprime siempre el ID de sesion; se resuelve
         * desde `opencode session list` al terminar para poder continuar con --session. */
        let exitCodeCapture = 0;
        child.on('exit', code => { exitCodeCapture = code ?? 0; });
        child.on('close', () => {
            clearTimeout(timeout);
            const output = getOutput();
            const resolvedSessionId = sessionId || resolveLatestSessionId(commandSpec, projectPath);
            const whatsappSummary = extractWhatsAppSummary(output);
            if (exitCodeCapture === 0) {
                resolve({output, session_id: resolvedSessionId, whatsapp_summary: whatsappSummary});
                return;
            }
            reject(Object.assign(new Error(`OpenCode finalizo con exit ${exitCodeCapture}.`), {
                output,
                session_id: resolvedSessionId,
                whatsapp_summary: whatsappSummary,
            }));
        });
    });
}

async function executeRun(options, overrides = {}, printDryRun = true) {
    const config = loadConfig();
    const projectId = typeof overrides.project === 'string'
        ? overrides.project
        : (typeof options.project === 'string' ? options.project : 'glorytemplate');
    const {project, projectPath} = resolveProject(config, projectId);
    const message = typeof overrides.message === 'string' ? overrides.message : readMessage(options);
    const branch = typeof overrides.branch === 'string' ? overrides.branch
        : (typeof options.branch === 'string' ? options.branch : (project.branch || ''));
    const model = project.defaultModel;
    const agent = typeof overrides.agent === 'string' ? overrides.agent : (typeof options.agent === 'string' ? options.agent : project.defaultAgent);
    const opencodeBin = typeof options.bin === 'string' ? options.bin : 'opencode';
    const commandSpec = resolveOpencodeCommand(opencodeBin);
    const timeoutMs = Number.isFinite(Number(options.timeout)) ? Number(options.timeout) : defaultTimeoutMs;

    // Cambiar de rama si se especificó y el proyecto tiene ruta local
    if (branch && !options['dry-run']) {
        const gitSwitch = spawnSync('git', ['-C', projectPath, 'checkout', branch], {encoding: 'utf8'});
        if (gitSwitch.status !== 0) {
            throw new Error(`No se pudo cambiar a rama ${branch}: ${(gitSwitch.stderr || '').trim()}`);
        }
        console.error(`[runner] Rama activa: ${branch}`);
    }

    const sessionId = typeof overrides.sessionId === 'string' ? overrides.sessionId
        : (typeof options.sessionId === 'string' ? options.sessionId : '');
    const previousOutput = typeof overrides.previousOutput === 'string' ? overrides.previousOutput
        : (typeof options.previousOutput === 'string' ? options.previousOutput : '');

    /* [125A-1] Aplicar permisos extra del payload antes de ejecutar; restaurar después */
    const extraPermissions = Array.isArray(overrides.extra_permissions) ? overrides.extra_permissions
        : (Array.isArray(options.extra_permissions) ? options.extra_permissions : []);
    const agentFilePath = agent ? path.join(repoRoot, '.opencode', 'agents', `${agent}.md`) : '';
    const originalAgentContent = agentFilePath ? injectExtraPermissions(agentFilePath, extraPermissions) : null;

    const prompt = buildPrompt({
        message,
        projectId,
        project,
        commitRequested: Boolean(overrides.commit ?? options.commit),
        deployRequested: Boolean(overrides.deploy ?? options.deploy),
        previousOutput,
    });
    const opencodeArgs = buildOpencodeArgs({
        projectPath,
        model,
        agent,
        attachUrl: typeof options.attach === 'string' ? options.attach : '',
        prompt,
        sessionId,
    });

    const dryRunResult = {
        projectId,
        projectPath,
        model,
        agent,
        command: [commandSpec.command, ...commandSpec.argsPrefix, ...opencodeArgs.slice(0, -1), '<prompt>'],
        prompt,
    };

    if (options['dry-run']) {
        if (printDryRun) {
            console.log(JSON.stringify(dryRunResult, null, 2));
        }
        return {...dryRunResult, dryRun: true};
    }

    const version = assertOpencodeAvailable(commandSpec);
    console.error(`OpenCode detectado: ${version}`);
    try {
        const runResult = await runOpencode({commandSpec, opencodeArgs, projectPath, timeoutMs, requestedSessionId: sessionId});
        return {projectId, projectPath, model, agent, dryRun: false, ...runResult};
    } finally {
        /* [125A-1] Restaurar el agente YAML a su estado original tras ejecutar */
        if (originalAgentContent !== null && agentFilePath) {
            writeFileSync(agentFilePath, originalAgentContent, 'utf8');
            console.error('[runner] Archivo de agente restaurado.');
        }
    }
}

function normalizeApiUrl(options) {
    const apiUrl = typeof options['api-url'] === 'string' ? options['api-url'] : (process.env.OPENCODE_RUNNER_API_URL || '');
    if (apiUrl.trim() === '') {
        throw new Error('poll-once requiere --api-url o OPENCODE_RUNNER_API_URL.');
    }
    return apiUrl.replace(/\/+$/, '');
}

function getRunnerSecret(options) {
    const fromArg = typeof options.secret === 'string' ? options.secret.trim() : '';
    if (fromArg) return fromArg;
    if (process.env.OPENCODE_RUNNER_SECRET) return process.env.OPENCODE_RUNNER_SECRET;
    /* Fallback: leer OPENCODE_RUNNER_SECRET de .env en la raiz del repo */
    try {
        const envFile = path.join(repoRoot, '.env');
        const envContent = readFileSync(envFile, 'utf8');
        const match = envContent.match(/^OPENCODE_RUNNER_SECRET=([^\r\n]+)/m);
        if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* .env no encontrado */ }
    throw new Error('poll-once requiere --secret o OPENCODE_RUNNER_SECRET (o definirlo en .env).');
}

function signRunnerRequest({secret, timestamp, method, route, bodyText}) {
    const base = `${timestamp}\n${method.toUpperCase()}\n${route}\n${bodyText}`;
    return `sha256=${createHmac('sha256', secret).update(base).digest('hex')}`;
}

async function requestRunner({apiUrl, secret, method, pathSuffix, route, body}) {
    const bodyText = body === undefined ? '' : JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signRunnerRequest({secret, timestamp, method, route, bodyText});
    const response = await fetch(`${apiUrl}${pathSuffix}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-OpenCode-Timestamp': timestamp,
            'X-OpenCode-Signature': signature,
        },
        body: bodyText === '' ? undefined : bodyText,
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        const message = data?.error?.message || `HTTP ${response.status}`;
        throw new Error(`Runner API fallo en ${method} ${pathSuffix}: ${message}`);
    }
    return data.data;
}

function optionsFromJobPayload(options, payload) {
    return {
        ...options,
        project: payload.project || payload.proyecto || 'glorytemplate',
        branch: payload.branch || payload.rama || undefined,
        agent: payload.agent || payload.agente || undefined,
        message: payload.prompt || payload.message || payload.mensaje || '',
        commit: Boolean(payload.commit),
        deploy: Boolean(payload.deploy),
        /* [115A-cont] Campos de continuacion de sesion */
        sessionId: typeof payload.session_id === 'string' ? payload.session_id : '',
        previousOutput: typeof payload.previous_output === 'string' ? payload.previous_output : '',
        /* [125A-1] Permisos extra acumulados por el usuario */
        extra_permissions: Array.isArray(payload.extra_permissions) ? payload.extra_permissions : [],
    };
}

async function pollOnce(options) {
    const apiUrl = normalizeApiUrl(options);
    const secret = getRunnerSecret(options);
    const listData = await requestRunner({
        apiUrl,
        secret,
        method: 'GET',
        pathSuffix: '/agent/opencode/jobs?limit=1',
        route: '/glory/v1/agent/opencode/jobs',
    });

    const jobs = Array.isArray(listData.jobs) ? listData.jobs : [];
    if (jobs.length === 0) {
        console.error('No hay jobs OpenCode pendientes.');
        return;
    }

    const job = jobs[0];
    const payload = job.payload || {};
    const runOptions = optionsFromJobPayload(options, payload);

    if (options['dry-run']) {
        const preview = await executeRun(runOptions, {}, false);
        console.log(JSON.stringify({jobId: job.id, ...preview}, null, 2));
        return;
    }

    await requestRunner({
        apiUrl,
        secret,
        method: 'POST',
        pathSuffix: `/agent/opencode/jobs/${job.id}/claim`,
        route: `/glory/v1/agent/opencode/jobs/${job.id}/claim`,
        body: {},
    });

    try {
        const result = await executeRun(runOptions, {}, false);
        await requestRunner({
            apiUrl,
            secret,
            method: 'POST',
            pathSuffix: `/agent/opencode/jobs/${job.id}/result`,
            route: `/glory/v1/agent/opencode/jobs/${job.id}/result`,
            body: {success: true, message: 'OpenCode finalizo correctamente.', result},
        });
    } catch (error) {
        await requestRunner({
            apiUrl,
            secret,
            method: 'POST',
            pathSuffix: `/agent/opencode/jobs/${job.id}/result`,
            route: `/glory/v1/agent/opencode/jobs/${job.id}/result`,
            body: {
                success: false,
                message: error.message,
                result: {
                    error: error.message,
                    output: error.output || '',
                    session_id: error.session_id || '',
                    whatsapp_summary: error.whatsapp_summary || '',
                },
            },
        });
        throw error;
    }
}

/* [115A-15] Modo loop: poll continuo cada N segundos.
 * Queda corriendo hasta Ctrl+C. Solo ejecuta un job a la vez (no paralelo).
 * Si OpenCode tarda mucho, el siguiente poll se hace en cuanto termina. */
async function pollLoop(options) {
    const intervalSec = Math.max(5, Number(options.interval) || 15);
    const apiUrl = normalizeApiUrl(options);
    const secret = getRunnerSecret(options);
    console.error(`[runner] Loop activo — polling cada ${intervalSec}s. Ctrl+C para detener.`);
    console.error(`[runner] API: ${apiUrl}`);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await pollOnce(options);
        } catch (error) {
            console.error(`[runner] Error en poll: ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, intervalSec * 1000));
    }
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const command = options._[0] || 'help';
    if (command === 'help' || options.help) {
        printHelp();
        return;
    }
    if (command === 'run') {
        await executeRun(options);
        return;
    }
    if (command === 'poll-once') {
        await pollOnce(options);
        return;
    }
    if (command === 'loop') {
        await pollLoop(options);
        return;
    }
    throw new Error(`Comando no soportado: ${command}. Usa run, poll-once o loop.`);
}

main().catch(error => {
    console.error(`[opencode-whatsapp-runner] ${error.message}`);
    process.exit(1);
});