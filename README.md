# 🔧 CORRECTIF WHATSAPP API 2026

## ⚠️ Problèmes identifiés

1. **Version obsolète** de whatsapp-web.js (1.23.0 → 1.25.0)
2. **WebVersion incompatible** avec les changements WhatsApp 2026
3. **Timeout QR code** non géré
4. **Gestion d'erreurs** insuffisante

## ✅ Correctifs appliqués

### 1. Mise à jour des dépendances
- `whatsapp-web.js`: 1.23.0 → **1.25.0**
- `node`: 18.x → **20.x**

### 2. WebVersionCache ajouté
```javascript
webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
}
```
**C'est critique !** Sans cela, WhatsApp rejette la connexion en 2026.

### 3. Gestion du timeout QR code
- Timer de 3 minutes affiché
- Auto-refresh intelligent
- Reconnexion automatique

### 4. Meilleure gestion des erreurs
- Event `auth_failure` ajouté
- Reconnexion automatique après déconnexion
- Logs détaillés

## 📋 Étapes de déploiement sur Render

### 1️⃣ Mettre à jour votre repository GitHub
```bash
# Dans votre dossier local du projet
git pull origin main
# Copiez les nouveaux fichiers (index.js et package.json)
git add .
git commit -m "Fix WhatsApp API 2026 - WebVersion + mise à jour deps"
git push origin main
```

### 2️⃣ Sur Render.com
1. Allez dans votre service
2. Cliquez sur **"Manual Deploy"** → **"Clear build cache & deploy"**
3. ⚠️ **IMPORTANT** : Cela supprimera l'ancienne session
4. Attendez la fin du déploiement (3-5 minutes)

### 3️⃣ Reconnecter WhatsApp
1. Accédez à `https://votre-app.onrender.com/qr`
2. Attendez 30-60 secondes pour le QR code
3. Scannez **rapidement** (vous avez 3 minutes)
4. Une fois connecté, la page affichera "✅ WhatsApp est connecté !"

## 🔍 Vérification

```bash
# Vérifiez le statut
curl https://votre-app.onrender.com/

# Devrait retourner :
{
  "status": "online",
  "whatsappReady": true,
  "version": "2.0.0 (Fix 2026)"
}
```

## ⚙️ Configuration Render (vérifier)

Dans les **Environment Variables** de votre service Render :
- `API_KEY` : votre clé API
- `NODE_VERSION` : 20.x (ou laisser vide pour auto)

## 🐛 Dépannage

### Le QR code ne s'affiche pas
- Attendez 60 secondes après le déploiement
- Vérifiez les logs Render pour voir les erreurs
- Rafraîchissez la page `/qr`

### Le QR code s'affiche mais la connexion échoue
- Scannez dans les **30 premières secondes**
- Assurez-vous que votre WhatsApp n'est pas déjà connecté ailleurs
- Vérifiez que vous utilisez bien **"Appareils connectés"** et non **"WhatsApp Web"**

### "Auth failure" dans les logs
- Clear build cache dans Render
- Redéployer
- Scanner un nouveau QR code

### Déconnexion fréquente
- Le service Render gratuit s'endort après 15 min d'inactivité
- Passez au plan payant ($7/mois) pour garder le service actif
- Ou utilisez un service de "ping" (ex: UptimeRobot)

## 📊 Différences clés

| Ancien | Nouveau |
|--------|---------|
| whatsapp-web.js 1.23.0 | 1.25.0 |
| Pas de webVersionCache | WebVersion fixé |
| Node 18 | Node 20 |
| Pas de timeout QR | Timer 3 min |
| Pas de reconnexion auto | Reconnexion auto |

## 🚀 Pourquoi ça marche maintenant ?

WhatsApp a changé son protocole Web en janvier 2026. L'ancien code utilisait une version de WhatsApp Web qui n'existe plus. Le nouveau code :

1. **Force une version compatible** via `webVersionCache`
2. **Utilise la dernière lib** qui gère ces changements
3. **Améliore la stabilité** avec reconnexion auto

## 📞 Support

Si le problème persiste après ces correctifs :
- Vérifiez les logs Render
- Testez en local d'abord (`npm start`)
- Assurez-vous que le port 3000 n'est pas bloqué

---

**Version** : 2.0.0 (Fix 2026)
**Date** : Février 2026
