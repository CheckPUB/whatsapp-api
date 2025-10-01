const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
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
let qrCodeImage = '';

// Générer le QR code
client.on('qr', async (qr) => {
    console.log('QR Code reçu !');
    qrCodeData = qr;
    qrcode.generate(qr, { small: true });
    
    // Générer l'image QR en base64
    try {
        qrCodeImage = await QRCode.toDataURL(qr);
        console.log('✅ QR Code disponible sur /qr');
    } catch (err) {
        console.error('Erreur génération QR:', err);
    }
});

// Client prêt
client.on('ready', () => {
    console.log('✅ Client WhatsApp prêt !');
    isReady = true;
    qrCodeData = '';
    qrCodeImage = '';
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

// Route pour obtenir le QR code en HTML
app.get('/qr', (req, res) => {
    if (isReady) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp Connecté</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .container {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    }
                    h1 {
                        color: #25D366;
                        margin-bottom: 20px;
                    }
                    .emoji {
                        font-size: 80px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="emoji">✅</div>
                    <h1>WhatsApp est déjà connecté !</h1>
                    <p>Votre API est prête à envoyer des messages.</p>
                </div>
            </body>
            </html>
        `);
    } else if (qrCodeImage) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Scanner QR Code WhatsApp</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                    }
                    .container {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        max-width: 500px;
                    }
                    h1 {
                        color: #333;
                        margin-bottom: 10px;
                    }
                    .instructions {
                        color: #666;
                        margin: 20px 0;
                        line-height: 1.6;
                    }
                    .qr-container {
                        background: #f5f5f5;
                        padding: 20px;
                        border-radius: 10px;
                        margin: 20px 0;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        border: 3px solid #25D366;
                        border-radius: 10px;
                    }
                    .steps {
                        text-align: left;
                        margin: 20px 0;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 10px;
                    }
                    .steps ol {
                        margin: 10px 0;
                        padding-left: 20px;
                    }
                    .steps li {
                        margin: 10px 0;
                    }
                    .refresh {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 12px 30px;
                        background: #25D366;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                    }
                    .refresh:hover {
                        background: #20BA5A;
                    }
                </style>
                <script>
                    // Auto-refresh toutes les 5 secondes pour vérifier la connexion
                    setTimeout(() => {
                        location.reload();
                    }, 5000);
                </script>
            </head>
            <body>
                <div class="container">
                    <h1>📱 Connecter WhatsApp</h1>
                    <p class="instructions">
                        Scannez ce QR code avec votre téléphone pour connecter WhatsApp à l'API
                    </p>
                    
                    <div class="qr-container">
                        <img src="${qrCodeImage}" alt="QR Code WhatsApp" />
                    </div>
                    
                    <div class="steps">
                        <strong>📋 Étapes :</strong>
                        <ol>
                            <li>Ouvrez <strong>WhatsApp</strong> sur votre téléphone</li>
                            <li>Allez dans <strong>Paramètres</strong> → <strong>Appareils connectés</strong></li>
                            <li>Appuyez sur <strong>"Connecter un appareil"</strong></li>
                            <li>Scannez le QR code ci-dessus</li>
                        </ol>
                    </div>
                    
                    <p style="color: #999; font-size: 14px;">
                        ⏱️ La page se rafraîchit automatiquement...
                    </p>
                    
                    <a href="/qr" class="refresh">🔄 Rafraîchir manuellement</a>
                </div>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Initialisation...</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .container {
                        text-align: center;
                        background: white;
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    }
                    .loader {
                        border: 5px solid #f3f3f3;
                        border-top: 5px solid #667eea;
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
                <script>
                    setTimeout(() => {
                        location.reload();
                    }, 3000);
                </script>
            </head>
            <body>
                <div class="container">
                    <div class="loader"></div>
                    <h2>Initialisation en cours...</h2>
                    <p>Le QR code sera disponible dans quelques secondes.</p>
                </div>
            </body>
            </html>
        `);
    }
});

// Route pour envoyer un message
app.post('/send-message', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({ 
            success: false, 
            message: 'WhatsApp n\'est pas connecté. Scannez le QR code d\'abord sur /qr' 
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
    console.log(`📱 Accédez au QR code sur : http://localhost:${PORT}/qr`);
});
