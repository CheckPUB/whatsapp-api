const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();

// ==================== ACTIVER CORS ====================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization']
}));
// ======================================================

app.use(bodyParser.json());

// ==================== SÉCURITÉ API ====================
const API_KEY = process.env.API_KEY || 'checkpub-34977509:secret_cp509';

app.use((req, res, next) => {
    if (req.path === '/' || req.path === '/qr' || req.path === '/health') {
        return next();
    }
    
    const providedKey = req.headers['x-api-key'] || req.headers['authorization'];
    
    if (!providedKey) {
        return res.status(401).json({ 
            success: false,
            message: 'Clé API manquante. Ajoutez "X-API-Key" dans les headers.' 
        });
    }
    
    if (providedKey !== API_KEY && providedKey !== `Bearer ${API_KEY}`) {
        return res.status(403).json({ 
            success: false,
            message: 'Clé API invalide.' 
        });
    }
    
    next();
});
// ======================================================

const PORT = process.env.PORT || 3000;

// ==================== FIX POUR 2026 ====================
// Configuration Puppeteer optimisée pour Render + WhatsApp 2026
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
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
            '--single-process',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        executablePath: process.env.CHROME_BIN || undefined
    },
    // CRITIQUE : WebVersion spécifique pour éviter les problèmes 2026
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});
// ======================================================

let isReady = false;
let qrCodeData = '';
let qrCodeImage = '';
let initializationTime = Date.now();
let lastQRTime = null;

// Timeout de QR code (3 minutes)
const QR_TIMEOUT = 180000;

// Générer le QR code
client.on('qr', async (qr) => {
    console.log('🔲 QR Code reçu !', new Date().toISOString());
    lastQRTime = Date.now();
    qrCodeData = qr;
    qrcode.generate(qr, { small: true });
    
    try {
        qrCodeImage = await QRCode.toDataURL(qr);
        console.log('✅ QR Code disponible sur /qr');
    } catch (err) {
        console.error('❌ Erreur génération QR:', err);
    }
});

// Client prêt
client.on('ready', () => {
    console.log('✅ Client WhatsApp prêt !', new Date().toISOString());
    isReady = true;
    qrCodeData = '';
    qrCodeImage = '';
    lastQRTime = null;
});

// Gestion des erreurs d'authentification
client.on('auth_failure', (msg) => {
    console.error('❌ Échec d\'authentification:', msg);
    isReady = false;
    qrCodeData = '';
    qrCodeImage = '';
});

// Déconnexion
client.on('disconnected', (reason) => {
    console.log('❌ Client déconnecté:', reason);
    isReady = false;
    qrCodeData = '';
    qrCodeImage = '';
    
    // Tentative de reconnexion après 5 secondes
    setTimeout(() => {
        console.log('🔄 Tentative de reconnexion...');
        client.initialize();
    }, 5000);
});

// Gestion des erreurs de chargement
client.on('loading_screen', (percent, message) => {
    console.log('⏳ Chargement:', percent, '%', message);
});

// Initialiser le client
console.log('🚀 Initialisation du client WhatsApp...');
client.initialize().catch(err => {
    console.error('❌ Erreur d\'initialisation:', err);
});

// Health check pour Render
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Route pour vérifier le statut
app.get('/', (req, res) => {
    const uptime = Date.now() - initializationTime;
    const qrAge = lastQRTime ? Date.now() - lastQRTime : null;
    
    res.json({
        status: 'online',
        whatsappReady: isReady,
        qrCodeAvailable: !!qrCodeImage,
        qrCodeAge: qrAge ? Math.floor(qrAge / 1000) + 's' : null,
        uptime: Math.floor(uptime / 1000) + 's',
        message: 'API WhatsApp fonctionnelle',
        version: '2.0.0 (Fix 2026)'
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
                <meta name="viewport" content="width=device-width, initial-scale=1">
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
                    <h1>WhatsApp est connecté !</h1>
                    <p>Votre API est prête à envoyer des messages.</p>
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">Version 2.0.0 (Fix 2026)</p>
                </div>
            </body>
            </html>
        `);
    } else if (qrCodeImage) {
        const qrAge = lastQRTime ? Math.floor((Date.now() - lastQRTime) / 1000) : 0;
        const timeLeft = Math.max(0, 180 - qrAge);
        
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
                    .timer {
                        color: #ff6b6b;
                        font-weight: bold;
                        font-size: 18px;
                        margin: 10px 0;
                    }
                    .warning {
                        background: #fff3cd;
                        border: 1px solid #ffc107;
                        padding: 15px;
                        border-radius: 5px;
                        margin: 15px 0;
                        color: #856404;
                    }
                </style>
                <script>
                    let timeLeft = ${timeLeft};
                    
                    function updateTimer() {
                        const timerEl = document.getElementById('timer');
                        if (timeLeft > 0) {
                            timerEl.textContent = timeLeft + 's';
                            timeLeft--;
                        } else {
                            location.reload();
                        }
                    }
                    
                    setInterval(updateTimer, 1000);
                    
                    // Auto-refresh toutes les 5 secondes
                    setTimeout(() => {
                        location.reload();
                    }, 5000);
                </script>
            </head>
            <body>
                <div class="container">
                    <h1>📱 Connecter WhatsApp</h1>
                    <p class="instructions">
                        Scannez ce QR code avec votre téléphone
                    </p>
                    
                    <div class="warning">
                        ⚠️ <strong>Important :</strong> Scannez rapidement ! Le QR code expire dans <span id="timer" class="timer">${timeLeft}s</span>
                    </div>
                    
                    <div class="qr-container">
                        <img src="${qrCodeImage}" alt="QR Code WhatsApp" />
                    </div>
                    
                    <div class="steps">
                        <strong>📋 Étapes :</strong>
                        <ol>
                            <li>Ouvrez <strong>WhatsApp</strong> sur votre téléphone</li>
                            <li>Allez dans <strong>Paramètres</strong> → <strong>Appareils connectés</strong></li>
                            <li>Appuyez sur <strong>"Connecter un appareil"</strong></li>
                            <li>Scannez le QR code ci-dessus <strong>rapidement</strong></li>
                        </ol>
                    </div>
                    
                    <p style="color: #999; font-size: 14px;">
                        ⏱️ La page se rafraîchit automatiquement toutes les 5s
                    </p>
                    
                    <a href="/qr" class="refresh">🔄 Rafraîchir maintenant</a>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        Version 2.0.0 (Fix 2026)
                    </p>
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
                <meta name="viewport" content="width=device-width, initial-scale=1">
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
                    <p>Le QR code sera disponible dans quelques instants.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 20px;">
                        Cela peut prendre 30-60 secondes sur Render...
                    </p>
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
        await client.sendMessage(chatId, message, { linkPreview: true });
        
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
    console.log(`🌍 En production : https://votre-app.onrender.com/qr`);
});
