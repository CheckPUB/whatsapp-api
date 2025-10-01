const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Initialiser le client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

let isReady = false;
let qrCodeData = '';

// Générer le QR code
client.on('qr', (qr) => {
    console.log('QR Code reçu, scannez-le avec WhatsApp !');
    qrCodeData = qr;
    qrcode.generate(qr, { small: true });
});

// Client prêt
client.on('ready', () => {
    console.log('✅ Client WhatsApp prêt !');
    isReady = true;
});

// Déconnexion
client.on('disconnected', (reason) => {
    console.log('❌ Client déconnecté:', reason);
    isReady = false;
});

// Initialiser le client
client.initialize();

// Route pour vérifier le statut
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        whatsappReady: isReady,
        message: 'API WhatsApp fonctionnelle'
    });
});

// Route pour obtenir le QR code
app.get('/qr', (req, res) => {
    if (isReady) {
        res.json({ 
            status: 'connected',
            message: 'WhatsApp est déjà connecté' 
        });
    } else if (qrCodeData) {
        res.json({ 
            status: 'qr_available',
            qr: qrCodeData 
        });
    } else {
        res.json({ 
            status: 'initializing',
            message: 'En attente du QR code...' 
        });
    }
});

// Route pour envoyer un message
app.post('/send-message', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ 
            success: false, 
            message: 'WhatsApp n\'est pas connecté. Scannez le QR code d\'abord.' 
        });
    }

    const { number, message } = req.body;

    if (!number || !message) {
        return res.status(400).json({ 
            success: false, 
            message: 'Numéro et message requis' 
        });
    }

    try {
        // Format du numéro : ajoutez l'indicatif pays sans + ni espaces
        // Exemple: 50912345678 pour Haïti
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        
        await client.sendMessage(chatId, message);
        
        res.json({ 
            success: true, 
            message: 'Message envoyé avec succès',
            to: number
        });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de l\'envoi du message',
            error: error.message 
        });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
