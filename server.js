const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// (Opcional) Podemos guardar mensagens em arquivo
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// Função auxiliar pra ler/escrever mensagens num arquivo
function readMessagesFile() {
    if (!fs.existsSync(MESSAGES_FILE)) {
        fs.writeFileSync(MESSAGES_FILE, '[]');
    }
    return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf-8'));
}
function writeMessagesFile(data) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(data, null, 2));
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'teste' })
});

client.on('qr', (qr) => {
  console.log('Escaneie o QR code:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp conectado!');
});

// Evento de mensagem recebida
client.on('message', (message) => {
    console.log("Mensagem recebida");
    // Lê arquivo
    const allMessages = readMessagesFile();
    // Adiciona nova mensagem
    allMessages.push({
        from: message.from,
        body: message.body,
        timestamp: message.timestamp
    });
    // Salva em arquivo
    writeMessagesFile(allMessages);
});

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
app.get('/messages', (req, res) => {
    const allMessages = readMessagesFile();
    // Devolve tudo
    res.json(allMessages);
    // Limpa arquivo
    writeMessagesFile([]);
});

// Sobe o servidor na porta 3000
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
