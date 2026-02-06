const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// --- BANCO DE DADOS SIMPLES (ARQUIVO JSON) ---
const DB_FILE = 'database.json';
let db = { codes: {}, history: [] };

// Carrega o banco ao iniciar
if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE));
        if(!db.history) db.history = []; // Garante que existe
    } catch(e) { console.log("Erro ao ler DB, criando novo."); }
}

function saveDB() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- ROTAS ---

app.get("/", (req, res) => res.send("GOJO API (COM HISTÓRICO) 🟢"));

app.post("/start", (req, res) => {
    const { code } = req.body;
    if(!code) return res.status(400).send("No code");
    
    // Salva código temporário
    db.codes[code] = { status: "pending", timestamp: Date.now() };
    res.send({ ok: true });
});

app.post("/roblox-verify", (req, res) => {
    const { code, userId, username } = req.body;
    
    if (db.codes[code]) {
        // 1. Atualiza o status do código atual
        db.codes[code] = { ...db.codes[code], status: "verified", userId, username };
        
        // 2. SALVA NO HISTÓRICO PERMANENTE (Se ainda não estiver lá)
        const jaExiste = db.history.find(u => u.userId == userId);
        
        const dadosUsuario = {
            userId,
            username,
            lastLogin: Date.now(),
            avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`
        };

        if (jaExiste) {
            // Atualiza o último login
            jaExiste.lastLogin = Date.now();
            jaExiste.username = username; // Caso tenha mudado de nick
        } else {
            // Adiciona novo
            db.history.push(dadosUsuario);
        }

        saveDB(); // Salva no arquivo
        console.log("Usuário registrado/atualizado:", username);
        res.send({ ok: true });
    } else {
        res.status(404).send({ error: "Código inválido" });
    }
});

app.get("/check/:code", (req, res) => {
    const data = db.codes[req.params.code];
    res.send(data || { status: "not_found" });
});

// --- ROTA DO ADMIN: RETORNA O HISTÓRICO COMPLETO ---
app.get("/admin/users", (req, res) => {
    // Retorna a lista de histórico (quem já se registrou)
    // Ordenado pelo último login (mais recente primeiro)
    const sorted = db.history.sort((a, b) => b.lastLogin - a.lastLogin);
    res.json(sorted);
});

// Deletar usuário do histórico
app.delete("/admin/kick/:userId", (req, res) => {
    const { userId } = req.params;
    db.history = db.history.filter(u => u.userId != userId);
    saveDB();
    res.json({ success: true });
});

// Limpeza automática só dos códigos temporários (não do histórico)
setInterval(() => {
    const now = Date.now();
    for(let c in db.codes) {
        if(now - db.codes[c].timestamp > 600000) delete db.codes[c];
    }
}, 600000);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Rodando na porta " + port));