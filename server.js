const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let codes = {}; 

// --- ROTAS DE VERIFICAÇÃO ---

app.post("/start", (req, res) => {
    const { code } = req.body;
    if(!code) return res.status(400).send("No code");
    codes[code] = { status: "pending", timestamp: Date.now() };
    console.log("Code generated:", code);
    res.send({ ok: true });
});

app.post("/roblox-verify", (req, res) => {
    const { code, userId, username } = req.body;
    if (codes[code]) {
        codes[code] = { status: "verified", userId, username };
        console.log("Verified user:", username);
        res.send({ ok: true });
    } else {
        res.status(404).send({ error: "Invalid code" });
    }
});

app.get("/check/:code", (req, res) => {
    const data = codes[req.params.code];
    res.send(data || { status: "not_found" });
});

// --- ROTAS DE PROXY (CORREÇÃO VERCEL) ---

app.get("/proxy-search", async (req, res) => {
    const keyword = req.query.keyword;
    if (!keyword) return res.status(400).json({ error: "No keyword" });

    try {
        const response = await fetch(`https://users.roblox.com/v1/users/search?keyword=${keyword}&limit=10`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch from Roblox" });
    }
});

app.get("/proxy-avatar", async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "No userId" });

    try {
        const response = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch avatar" });
    }
});

// --- SISTEMA ---

app.get("/", (req, res) => res.send("API Online"));

setInterval(() => {
    const now = Date.now();
    for(let c in codes) if(now - codes[c].timestamp > 600000) delete codes[c];
}, 600000);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Running on port " + port));