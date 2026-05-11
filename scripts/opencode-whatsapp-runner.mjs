#!/usr/bin/env node
import {spawn, spawnSync} from 'node:child_process';
import {createHmac} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
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

function buildPrompt({message, projectId, project, commitRequested, deployRequested}) {
    const lines = [
        'Solicitud remota aprobada para OpenCode.',
        `Proyecto: ${projectId}`,
        `Repositorio GitHub: ${project.repo || 'no configurado'}`,
        `Rama esperada: ${project.branch || 'no configurada'}`,
        '',
        'Instrucciones obligatorias:',
        '- Lee App/roadmap.md y respeta AGENTS.md antes de editar.',
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

    lines.push('', 'Solicitud del usuario:', message);
    return lines.join('\n');
}

function assertOpencodeAvailable(opencodeBin) {
    /* shell: true es necesario en Windows donde los binarios npm son .cmd wrappers */
    const result = spawnSync(opencodeBin, ['--version'], {encoding: 'utf8', shell: true});
    if (result.error) {
        throw new Error(`OpenCode no esta disponible en PATH (${opencodeBin}). Instala con npm install -g opencode-ai o el metodo oficial.`);
    }
    if (result.status !== 0) {
        throw new Error(`OpenCode respondio con exit ${result.status}: ${(result.stderr || result.stdout || '').trim()}`);
    }
    return (result.stdout || result.stderr || '').trim();
}

function buildOpencodeArgs({projectPath, model, agent, attachUrl, prompt}) {
    const opencodeArgs = ['run', '--dir', projectPath, '--model', model, '--agent', agent];
    if (attachUrl) {
        opencodeArgs.push('--attach', attachUrl);
    }
    opencodeArgs.push(prompt);
    return opencodeArgs;
}

function runOpencode({opencodeBin, opencodeArgs, projectPath, timeoutMs}) {
    return new Promise((resolve, reject) => {
        /* shell: true necesario en Windows (.cmd wrappers de npm) */
        const child = spawn(opencodeBin, opencodeArgs, {
            cwd: projectPath,
            stdio: 'inherit',
            shell: true,
            env: process.env,
        });

        const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error(`Timeout ejecutando OpenCode tras ${timeoutMs}ms.`));
        }, timeoutMs);

        child.on('error', error => {
            clearTimeout(timeout);
            reject(error);
        });

        child.on('exit', exitCode => {
            clearTimeout(timeout);
            if (exitCode === 0) {
                resolve();
                return;
            }
            reject(new Error(`OpenCode finalizo con exit ${exitCode}.`));
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
    const timeoutMs = Number.isFinite(Number(options.timeout)) ? Number(options.timeout) : defaultTimeoutMs;

    // Cambiar de rama si se especificó y el proyecto tiene ruta local
    if (branch && !options['dry-run']) {
        const gitSwitch = spawnSync('git', ['-C', projectPath, 'checkout', branch], {encoding: 'utf8'});
        if (gitSwitch.status !== 0) {
            throw new Error(`No se pudo cambiar a rama ${branch}: ${(gitSwitch.stderr || '').trim()}`);
        }
        console.error(`[runner] Rama activa: ${branch}`);
    }

    const prompt = buildPrompt({
        message,
        projectId,
        project,
        commitRequested: Boolean(overrides.commit ?? options.commit),
        deployRequested: Boolean(overrides.deploy ?? options.deploy),
    });
    const opencodeArgs = buildOpencodeArgs({
        projectPath,
        model,
        agent,
        attachUrl: typeof options.attach === 'string' ? options.attach : '',
        prompt,
    });

    const dryRunResult = {
        projectId,
        projectPath,
        model,
        agent,
        command: [opencodeBin, ...opencodeArgs.slice(0, -1), '<prompt>'],
        prompt,
    };

    if (options['dry-run']) {
        if (printDryRun) {
            console.log(JSON.stringify(dryRunResult, null, 2));
        }
        return {...dryRunResult, dryRun: true};
    }

    const version = assertOpencodeAvailable(opencodeBin);
    console.error(`OpenCode detectado: ${version}`);
    await runOpencode({opencodeBin, opencodeArgs, projectPath, timeoutMs});
    return {projectId, projectPath, model, agent, dryRun: false};
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
            body: {success: false, message: error.message, result: {error: error.message}},
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