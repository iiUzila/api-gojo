const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let codes = {}; 

app.post("/start", (req, res) => {
    const { code } = req.body;
    if(!code) return res.status(400).send("No code");
    codes[code] = { status: "pending", timestamp: Date.now() };
    console.log("Code:", code);
    res.send({ ok: true });
});

app.post("/roblox-verify", (req, res) => {
    const { code, userId, username } = req.body;
    if (codes[code]) {
        codes[code] = { status: "verified", userId, username };
        res.send({ ok: true });
    } else {
        res.status(404).send({ error: "Invalid" });
    }
});

app.get("/check/:code", (req, res) => {
    const data = codes[req.params.code];
    res.send(data || { status: "not_found" });
});

app.get("/", (req, res) => res.send("Online"));

setInterval(() => {
    const now = Date.now();
    for(let c in codes) if(now - codes[c].timestamp > 600000) delete codes[c];
}, 600000);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Running on " + port));