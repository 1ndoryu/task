import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {ListToolsResultSchema, CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js';

async function main() {
    console.log('🔌 Conectando al servidor MCP...');

    const transport = new StdioClientTransport({
        command: 'node',
        args: ['dist/index.js'],
        env: process.env
    });

    const client = new Client(
        {
            name: 'test-client',
            version: '1.0.0'
        },
        {
            capabilities: {}
        }
    );

    await client.connect(transport);
    console.log('✅ Conectado al servidor MCP via STDIO');

    // 0. Identificar Usuario
    // No hay un tool directo para "whoami", pero podemos inferirlo si el dashboard tuviera metadata de usuario.
    // O podemos usar fetch directo usando las mismas credenciales del .env para ver quiénes somos.
    // Por ahora, asumimos que el MCP funciona.

    // 1. Listar herramientas
    console.log('\n🛠️  Listando herramientas...');
    const toolsList = await client.request({method: 'tools/list'}, ListToolsResultSchema);

    const toolNames = toolsList.tools.map(t => t.name);
    console.log('Herramientas encontradas:', toolNames.join(', '));

    if (!toolNames.includes('obtener_tareas')) {
        console.error('❌ Error: No se encontró la herramienta "obtener_tareas"');
        process.exit(1);
    }

    // 1. Consultar Proyectos
    console.log('\n📦 Consultando Proyectos...');
    const proyectosResult = await client.request({method: 'tools/call', params: {name: 'obtener_proyectos', arguments: {estado: 'todos'}}}, CallToolResultSchema);
    if (proyectosResult.content[0]?.text) {
        const data = JSON.parse(proyectosResult.content[0].text);
        console.log(`Total: ${data.total}`);
        if (data.proyectos.length > 0) console.log(JSON.stringify(data.proyectos, null, 2));
    }

    // 2. Consultar Hábitos
    console.log('\n🔄 Consultando Hábitos...');
    const habitosResult = await client.request({method: 'tools/call', params: {name: 'obtener_habitos', arguments: {}}}, CallToolResultSchema);
    if (habitosResult.content[0]?.text) {
        const data = JSON.parse(habitosResult.content[0].text);
        console.log(`Total: ${data.total}`);
        if (data.habitos.length > 0) console.log(JSON.stringify(data.habitos, null, 2));
    }

    // 3. Consultar Tareas
    console.log('\n📝 Consultando Tareas...');
    const tareasResult = await client.request({method: 'tools/call', params: {name: 'obtener_tareas', arguments: {filtro: 'todas'}}}, CallToolResultSchema);
    if (tareasResult.content[0]?.text) {
        const data = JSON.parse(tareasResult.content[0].text);
        console.log(`Total: ${data.total}`);
        if (data.tareas.length > 0) console.log(JSON.stringify(data.tareas, null, 2));
    }
    await client.close();
}

main().catch(console.error);
