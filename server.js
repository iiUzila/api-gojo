const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let codes = {}; // Memória temporária

// --- ROTAS NORMAIS ---
app.post("/start", (req, res) => {
    const { code } = req.body;
    if(!code) return res.status(400).send("No code");
    codes[code] = { status: "pending", timestamp: Date.now(), id: code };
    res.send({ ok: true });
});

app.post("/roblox-verify", (req, res) => {
    const { code, userId, username } = req.body;
    if (codes[code]) {
        codes[code] = { ...codes[code], status: "verified", userId, username, verifiedAt: Date.now() };
        res.send({ ok: true });
    } else {
        res.status(404).send({ error: "Invalid code" });
    }
});

app.get("/check/:code", (req, res) => {
    const data = codes[req.params.code];
    res.send(data || { status: "not_found" });
});

// --- ROTAS DE PROXY (Para burlar Vercel) ---
app.get("/proxy-search", async (req, res) => {
    try {
        const r = await fetch(`https://users.roblox.com/v1/users/search?keyword=${req.query.keyword}&limit=100`);
        const d = await r.json();
        res.json(d);
    } catch(e) { res.status(500).json({error: "Erro proxy"}); }
});

app.get("/proxy-avatar", async (req, res) => {
    try {
        const r = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${req.query.userId}&size=150x150&format=Png&isCircular=false`);
        const d = await r.json();
        res.json(d);
    } catch(e) { res.status(500).json({error: "Erro avatar"}); }
});

// --- 🔥 ROTAS NOVAS DO ADMIN 🔥 ---

// 1. Ver todos os usuários na memória
app.get("/admin/users", (req, res) => {
    // Converte o objeto codes em uma lista
    const list = Object.values(codes).map(c => ({
        code: c.id,
        status: c.status,
        username: c.username || "Esperando...",
        userId: c.userId || null,
        time: c.timestamp
    }));
    res.json(list);
});

// 2. Chutar um usuário (Deletar da memória)
app.delete("/admin/kick/:code", (req, res) => {
    const { code } = req.params;
    if(codes[code]) {
        delete codes[code];
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Não encontrado" });
    }
});

app.get("/", (req, res) => res.send("API Online"));

// Limpeza automática (15 min)
setInterval(() => {
    const now = Date.now();
    for(let c in codes) if(now - codes[c].timestamp > 900000) delete codes[c];
}, 600000);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Rodando na porta " + port));