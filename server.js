const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Se quiser rodar em "modo produção", pode iniciar assim:
// NODE_ENV=production node index.js

const app = express();
app.use(express.json());

// Caminho do arquivo de mensagens
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Funções assíncronas para ler/gravar JSON no arquivo
async function readMessagesFile() {
    return new Promise((resolve, reject) => {
        fs.readFile(MESSAGES_FILE, 'utf8', (err, data) => {
            if (err) {
                // Se o arquivo não existir, cria vazio
                if (err.code === 'ENOENT') {
                    fs.writeFile(MESSAGES_FILE, '[]', (err2) => {
                        if (err2) return reject(err2);
                        return resolve([]);
                    });
                } else {
                    return reject(err);
                }
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (parseError) {
                    // Em caso de JSON corrompido, retorna array vazio
                    resolve([]);
                }
            }
        });
    });
}

async function writeMessagesFile(messages) {
    return new Promise((resolve, reject) => {
        fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

// Instancia o WhatsApp Client com LocalAuth e flags de produção no Puppeteer
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'teste', // Se mudar isso, criará outra pasta .wwebjs_auth
    }),
    puppeteer: {
        // Flags para melhorar performance e evitar problemas de sandbox
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            // '--headless', // descomente se quiser rodar totalmente sem GUI
        ],
    }
});

// Exibe QR code somente quando necessário (ex.: primeira vez)
client.on('qr', (qr) => {
    console.log('Escaneie o QR code:');
    qrcode.generate(qr, { small: true });
});

// Quando o WhatsApp estiver pronto
client.on('ready', () => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('WhatsApp conectado (modo dev)!');
    } else {
        console.log('WhatsApp conectado (modo produção)!');
    }
});

// Evento de mensagem recebida (opcional)
// Se quiser armazenar todas as mensagens, faça:
// client.on('message', async (message) => {
//     // Ler arquivo (assíncrono)
//     const allMessages = await readMessagesFile();

//     // Adiciona a nova mensagem
//     allMessages.push({
//         from: message.from,
//         body: message.body,
//         timestamp: message.timestamp
//     });

//     // Salva no arquivo (assíncrono)
//     await writeMessagesFile(allMessages);

//     // (Opcional) se quiser menos logs em produção, comente ou controle via NODE_ENV
//     if (process.env.NODE_ENV !== 'production') {
//         console.log(`Nova mensagem de ${message.from}: ${message.body}`);
//     }
// });

// Inicializa o WhatsApp
client.initialize();

// Endpoint para enviar mensagens
app.post('/send', async (req, res) => {
    try {
        const { number, message } = req.body;
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(chatId, message);

        return res.status(200).json({
            status: 'success',
            message: 'Mensagem enviada com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        return res.status(500).json({
            status: 'error',
            message: error.toString()
        });
    }
});

// Endpoint para ler e limpar mensagens
app.get('/messages', async (req, res) => {
    try {
        // Lê o arquivo
        const allMessages = await readMessagesFile();

        // Retorna o array de mensagens
        res.json(allMessages);

        // Limpa o arquivo (escreve array vazio)
        await writeMessagesFile([]);
    } catch (err) {
        console.error('Erro ao ler/escrever arquivo:', err);
        return res.status(500).json({
            status: 'error',
            message: err.toString()
        });
    }
});

// Sobe o servidor na porta 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
