const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Configuração do servidor HTTP
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Configuração dos grupos
const GRUPOS = {
    'datastore': {
        id: '258820749141-1441573529@g.us',
        nome: 'Data Store - Vodacom🇲🇿'
    },
    'spc': {
        id: '120363152151047451@g.us',
        nome: 'S͆P͆C͆ M͆E͆G͆A͆S͆ E͆ D͆I͆A͆M͆A͆N͆T͆E͆'
    },
    'venda': {
        id: '258840161370-1471468657@g.us',
        nome: 'Venda Automática Megas 24/7'
    },
     'fornecedor': {
        id: '120363419652375064@g.us',
        nome: 'Net Fornecedor V'
    }
};

// Sistema de logs
const LOG_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

function log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = {
        timestamp,
        level,
        message,
        data
    };
    
    // Log no console
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    if (data) console.log('Data:', data);
    
    // Log em arquivo
    const logFile = path.join(LOG_DIR, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logMessage) + '\n');
}

// Cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "bot-transacoes"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security'
        ],
        executablePath: undefined // Deixa o puppeteer escolher automaticamente
    }
});

// Eventos do WhatsApp
client.on('qr', (qr) => {
    log('info', 'QR Code gerado para autenticação');
    console.log('\n🔳 ESCANEIE O QR CODE ABAIXO COM SEU WHATSAPP:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n📱 Abra o WhatsApp > Menu (3 pontos) > Dispositivos conectados > Conectar dispositivo');
});

client.on('ready', () => {
    log('info', 'Bot conectado e pronto para uso');
    console.log('\n✅ BOT WHATSAPP CONECTADO COM SUCESSO!');
    console.log('🔗 Endpoints disponíveis:');
    console.log(`   POST http://localhost:${PORT}/enviar`);
    console.log(`   GET  http://localhost:${PORT}/grupos`);
    console.log(`   GET  http://localhost:${PORT}/status`);
});

client.on('authenticated', () => {
    log('info', 'Cliente autenticado com sucesso');
});

client.on('auth_failure', (msg) => {
    log('error', 'Falha na autenticação', msg);
    console.log('❌ Falha na autenticação. Tente novamente.');
});

client.on('disconnected', (reason) => {
    log('warn', 'Cliente desconectado', reason);
    console.log('⚠️ WhatsApp desconectado:', reason);
});

// Função para encontrar grupo por ID
function findGroupById(groupId) {
    for (const [key, group] of Object.entries(GRUPOS)) {
        if (group.id === groupId) {
            return { key, ...group };
        }
    }
    return null;
}

// Função para enviar mensagem
async function enviarMensagem(groupId, mensagem) {
    try {
        const grupo = findGroupById(groupId);
        if (!grupo) {
            throw new Error(`Grupo com ID ${groupId} não encontrado na configuração`);
        }

        log('info', `Enviando mensagem para grupo: ${grupo.nome}`);
        
        await client.sendMessage(groupId, mensagem);
        
        log('info', `Mensagem enviada com sucesso para ${grupo.nome}`);
        return { success: true, grupo: grupo.nome };
        
    } catch (error) {
        log('error', 'Erro ao enviar mensagem', {
            groupId,
            error: error.message
        });
        throw error;
    }
}

// Rotas da API
app.post('/enviar', async (req, res) => {
    try {
        const { grupo_id, mensagem } = req.body;
        
        // Validações
        if (!grupo_id) {
            return res.status(400).json({
                success: false,
                error: 'Campo grupo_id é obrigatório'
            });
        }
        
        if (!mensagem) {
            return res.status(400).json({
                success: false,
                error: 'Campo mensagem é obrigatório'
            });
        }

        // Verificar se o bot está conectado
        if (!client.info) {
            return res.status(503).json({
                success: false,
                error: 'Bot não está conectado ao WhatsApp'
            });
        }

        log('info', 'Nova requisição recebida', { grupo_id, mensagem: mensagem.substring(0, 100) + '...' });

        // Enviar mensagem
        const result = await enviarMensagem(grupo_id, mensagem);
        
        res.json({
            success: true,
            message: 'Mensagem enviada com sucesso',
            grupo: result.grupo,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        log('error', 'Erro na rota /enviar', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para listar grupos configurados
app.get('/grupos', (req, res) => {
    const grupos = Object.entries(GRUPOS).map(([key, group]) => ({
        key,
        id: group.id,
        nome: group.nome
    }));
    
    res.json({
        success: true,
        grupos,
        total: grupos.length
    });
});

// Rota para status do bot
app.get('/status', (req, res) => {
    const isConnected = client.info ? true : false;
    
    res.json({
        success: true,
        connected: isConnected,
        info: client.info || null,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Rota principal
app.get('/', (req, res) => {
    res.json({
        message: 'Bot WhatsApp - Confirmações de Transação',
        version: '1.0.0',
        status: client.info ? 'Conectado' : 'Desconectado',
        endpoints: [
            'POST /enviar - Enviar mensagem',
            'GET /grupos - Listar grupos',
            'GET /status - Status do bot'
        ]
    });
});

// Rota para adicionar novo grupo (para uso futuro)
app.post('/grupos/adicionar', (req, res) => {
    try {
        const { key, id, nome } = req.body;
        
        if (!key || !id || !nome) {
            return res.status(400).json({
                success: false,
                error: 'Campos key, id e nome são obrigatórios'
            });
        }
        
        if (GRUPOS[key]) {
            return res.status(400).json({
                success: false,
                error: `Grupo com key '${key}' já existe`
            });
        }
        
        GRUPOS[key] = { id, nome };
        
        log('info', 'Novo grupo adicionado', { key, id, nome });
        
        // Salvar configuração em arquivo para persistir
        const configFile = path.join(__dirname, 'grupos_config.json');
        fs.writeFileSync(configFile, JSON.stringify(GRUPOS, null, 2));
        
        res.json({
            success: true,
            message: 'Grupo adicionado com sucesso',
            grupo: { key, id, nome }
        });
        
    } catch (error) {
        log('error', 'Erro ao adicionar grupo', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Middleware de erro
app.use((error, req, res, next) => {
    log('error', 'Erro não tratado na API', error.message);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});

// Inicialização
async function iniciarBot() {
    try {
        log('info', 'Iniciando bot...');
        console.log('🚀 Iniciando Bot WhatsApp - Confirmações de Transação');
        console.log('====================================================');
        
        // Carregar grupos salvos se existir arquivo
        const configFile = path.join(__dirname, 'grupos_config.json');
        if (fs.existsSync(configFile)) {
            const savedGroups = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            Object.assign(GRUPOS, savedGroups);
            log('info', 'Configuração de grupos carregada do arquivo');
        }
        
        // Inicializar servidor HTTP primeiro
        app.listen(PORT, () => {
            log('info', `Servidor HTTP rodando na porta ${PORT}`);
            console.log(`\n🌐 Servidor HTTP ativo na porta ${PORT}`);
            console.log('📡 Aguardando conexão WhatsApp...\n');
        });
        
        // Inicializar WhatsApp
        await client.initialize();
        
    } catch (error) {
        log('error', 'Erro ao inicializar bot', error.message);
        console.log('❌ Erro ao inicializar:', error.message);
        process.exit(1);
    }
}

// Tratamento de sinais do sistema
process.on('SIGINT', async () => {
    log('info', 'Recebido sinal SIGINT, encerrando bot...');
    console.log('\n🛑 Encerrando bot...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('info', 'Recebido sinal SIGTERM, encerrando bot...');
    console.log('\n🛑 Encerrando bot...');
    await client.destroy();
    process.exit(0);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    log('error', 'Unhandled Rejection', { reason, promise });
    console.log('❌ Erro não tratado:', reason);
});

process.on('uncaughtException', (error) => {
    log('error', 'Uncaught Exception', error.message);
    console.log('❌ Exceção não capturada:', error.message);
    process.exit(1);
});

// Iniciar o bot

iniciarBot();
