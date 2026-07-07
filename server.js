/* ===================================================================
   MACEIÓ DETOX — server.js
   Backend simples em Express. Guarda o cardápio num arquivo JSON
   dentro de uma pasta persistente (ideal: um Volume da Railway
   montado em /data), e expõe uma API pra o site e o painel admin
   lerem/gravarem os dados em tempo real.
=================================================================== */

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------------------
// SENHA DO ADMIN — configure isso como variável de ambiente na Railway
// (ADMIN_PASSWORD). Se não configurar, usa esta senha padrão — troque
// assim que possível.
// -------------------------------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "maceiodetox2026";

// -------------------------------------------------------------------
// Onde os dados ficam guardados. Em produção na Railway, configure a
// variável de ambiente DATA_DIR apontando para o caminho de um Volume
// (ex: /data), assim as informações não se perdem a cada deploy.
// -------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MENU_FILE = path.join(DATA_DIR, "menu.json");
const SEED_FILE = path.join(__dirname, "seed", "menu.seed.json");

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(MENU_FILE)) {
  fs.copyFileSync(SEED_FILE, MENU_FILE);
  console.log("menu.json não existia — criado a partir do cardápio inicial.");
}

function readMenu() {
  return JSON.parse(fs.readFileSync(MENU_FILE, "utf8"));
}
function writeMenu(data) {
  fs.writeFileSync(MENU_FILE, JSON.stringify(data, null, 2));
}

// -------------------------------------------------------------------
// autenticação simples do admin (token em memória, expira em 12h)
// -------------------------------------------------------------------
const sessions = new Map(); // token -> expiresAt

function createSession() {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, Date.now() + 12 * 60 * 60 * 1000);
  return token;
}
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const expiresAt = token && sessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    return res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
  }
  next();
}

// -------------------------------------------------------------------
// upload de fotos dos pratos
// -------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, crypto.randomUUID() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Arquivo precisa ser uma imagem."));
    cb(null, true);
  }
});

app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, "public")));

// -------------------------------------------------------------------
// rotas públicas
// -------------------------------------------------------------------
app.get("/api/menu", (req, res) => {
  res.json(readMenu());
});

app.get("/api/planos/:tipo", (req, res) => {
  const { tipo } = req.params; // marmitas, sucos, combos
  const data = readMenu();
  if (!data.planos || !data.planos[tipo]) {
    return res.status(404).json({ error: "Tipo de plano não encontrado" });
  }
  res.json(data.planos[tipo]);
});

app.get("/api/marmitas", (req, res) => {
  const data = readMenu();
  res.json(data.marmitas?.normal || []);
});

app.get("/api/extras/:tipo", (req, res) => {
  const { tipo } = req.params; // sucos, sobremesas
  const data = readMenu();
  if (!data.extras || !data.extras[tipo]) {
    return res.status(404).json({ error: "Tipo de extra não encontrado" });
  }
  res.json(data.extras[tipo]);
});

// -------------------------------------------------------------------
// login do admin
// -------------------------------------------------------------------
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Senha incorreta." });
  }
  res.json({ token: createSession() });
});

// -------------------------------------------------------------------
// rotas protegidas do admin
// -------------------------------------------------------------------
app.put("/api/admin/store", requireAdmin, (req, res) => {
  const data = readMenu();
  const { nome, slogan, whatsapp, endereçoResumo, horario } = req.body || {};
  data.loja = {
    nome: nome ?? data.loja.nome,
    slogan: slogan ?? data.loja.slogan,
    whatsapp: (whatsapp ?? data.loja.whatsapp).replace(/\D/g, ""),
    "endereçoResumo": endereçoResumo ?? data.loja["endereçoResumo"],
    horario: horario ?? data.loja.horario
  };
  writeMenu(data);
  res.json(data);
});

app.post("/api/admin/dishes", requireAdmin, upload.single("foto"), (req, res) => {
  const data = readMenu();
  const { nome, categoria, descricao, preco, tags } = req.body;

  if (!nome || !categoria || isNaN(parseFloat(preco))) {
    return res.status(400).json({ error: "Preencha nome, categoria e preço." });
  }

  const dish = {
    id: "p" + Date.now() + Math.floor(Math.random() * 1000),
    categoria,
    nome,
    descricao: descricao || "",
    preco: parseFloat(preco),
    foto: req.file ? `/uploads/${req.file.filename}` : "",
    tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : []
  };
  data.pratos.push(dish);
  writeMenu(data);
  res.json(dish);
});

app.put("/api/admin/dishes/:id", requireAdmin, upload.single("foto"), (req, res) => {
  const data = readMenu();
  const idx = data.pratos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Prato não encontrado." });

  const { nome, categoria, descricao, preco, tags, manterFoto } = req.body;
  const existing = data.pratos[idx];

  const oldPhoto = existing.foto;
  const dish = {
    ...existing,
    categoria: categoria || existing.categoria,
    nome: nome || existing.nome,
    descricao: descricao ?? existing.descricao,
    preco: preco ? parseFloat(preco) : existing.preco,
    tags: tags !== undefined ? tags.split(",").map(t => t.trim()).filter(Boolean) : existing.tags
  };

  if (req.file) {
    dish.foto = `/uploads/${req.file.filename}`;
  } else if (manterFoto === "false") {
    dish.foto = "";
  }

  data.pratos[idx] = dish;
  writeMenu(data);

  // limpa a foto antiga do disco se ela foi trocada ou removida
  if (oldPhoto && oldPhoto !== dish.foto && oldPhoto.startsWith("/uploads/")) {
    const oldPath = path.join(DATA_DIR, oldPhoto);
    fs.unlink(oldPath, () => {});
  }

  res.json(dish);
});

app.delete("/api/admin/dishes/:id", requireAdmin, (req, res) => {
  const data = readMenu();
  const dish = data.pratos.find(p => p.id === req.params.id);
  data.pratos = data.pratos.filter(p => p.id !== req.params.id);
  writeMenu(data);

  if (dish && dish.foto && dish.foto.startsWith("/uploads/")) {
    const oldPath = path.join(DATA_DIR, dish.foto);
    fs.unlink(oldPath, () => {});
  }

  res.json({ ok: true });
});

// -------------------------------------------------------------------
// admin: gerenciar planos
// -------------------------------------------------------------------
app.put("/api/admin/planos/:tipo/:id", requireAdmin, (req, res) => {
  const { tipo, id } = req.params;
  const { quantidade, preco, nome } = req.body || {};
  const data = readMenu();
  
  if (!data.planos[tipo]) return res.status(404).json({ error: "Tipo inválido" });
  
  const idx = data.planos[tipo].findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Plano não encontrado" });
  
  data.planos[tipo][idx] = { ...data.planos[tipo][idx], quantidade, preco, nome };
  writeMenu(data);
  res.json(data.planos[tipo][idx]);
});

// -------------------------------------------------------------------
// admin: gerenciar marmitas (adição de gourmet com preço)
// -------------------------------------------------------------------
app.post("/api/admin/marmitas", requireAdmin, upload.single("foto"), (req, res) => {
  const data = readMenu();
  const { nome, descricao, preco, tags, isGourmet } = req.body;

  if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });

  const marmita = {
    id: "p" + Date.now() + Math.floor(Math.random() * 1000),
    nome,
    descricao: descricao || "",
    preco: isGourmet === "true" ? parseFloat(preco || 0) : 0,
    foto: req.file ? `/uploads/${req.file.filename}` : "",
    tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    isGourmet: isGourmet === "true"
  };
  
  data.marmitas.normal.push(marmita);
  writeMenu(data);
  res.json(marmita);
});

app.put("/api/admin/marmitas/:id", requireAdmin, upload.single("foto"), (req, res) => {
  const data = readMenu();
  const idx = data.marmitas.normal.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Marmita não encontrada" });

  const { nome, descricao, preco, tags, isGourmet, manterFoto } = req.body;
  const oldPhoto = data.marmitas.normal[idx].foto;

  const marmita = {
    ...data.marmitas.normal[idx],
    nome: nome || data.marmitas.normal[idx].nome,
    descricao: descricao ?? data.marmitas.normal[idx].descricao,
    preco: isGourmet === "true" ? parseFloat(preco || 0) : 0,
    tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : data.marmitas.normal[idx].tags,
    isGourmet: isGourmet === "true"
  };

  if (req.file) {
    marmita.foto = `/uploads/${req.file.filename}`;
  } else if (manterFoto === "false") {
    marmita.foto = "";
  }

  data.marmitas.normal[idx] = marmita;
  writeMenu(data);

  if (oldPhoto && oldPhoto !== marmita.foto && oldPhoto.startsWith("/uploads/")) {
    const oldPath = path.join(DATA_DIR, oldPhoto);
    fs.unlink(oldPath, () => {});
  }

  res.json(marmita);
});

app.delete("/api/admin/marmitas/:id", requireAdmin, (req, res) => {
  const data = readMenu();
  const marmita = data.marmitas.normal.find(m => m.id === req.params.id);
  data.marmitas.normal = data.marmitas.normal.filter(m => m.id !== req.params.id);
  writeMenu(data);

  if (marmita && marmita.foto && marmita.foto.startsWith("/uploads/")) {
    const oldPath = path.join(DATA_DIR, marmita.foto);
    fs.unlink(oldPath, () => {});
  }

  res.json({ ok: true });
});

// -------------------------------------------------------------------
// admin: gerenciar extras (sucos, sobremesas)
// -------------------------------------------------------------------
app.post("/api/admin/extras/:tipo", requireAdmin, upload.single("foto"), (req, res) => {
  const { tipo } = req.params;
  const data = readMenu();
  const { nome, descricao, preco, tags } = req.body;

  if (!nome || !tipo) return res.status(400).json({ error: "Nome e tipo obrigatórios" });

  const extra = {
    id: "e" + Date.now() + Math.floor(Math.random() * 1000),
    nome,
    descricao: descricao || "",
    preco: parseFloat(preco || 0),
    foto: req.file ? `/uploads/${req.file.filename}` : "",
    tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : []
  };

  if (!data.extras[tipo]) data.extras[tipo] = [];
  data.extras[tipo].push(extra);
  writeMenu(data);
  res.json(extra);
});

app.put("/api/admin/extras/:tipo/:id", requireAdmin, upload.single("foto"), (req, res) => {
  const { tipo, id } = req.params;
  const data = readMenu();
  const idx = data.extras[tipo]?.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: "Extra não encontrado" });

  const { nome, descricao, preco, tags, manterFoto } = req.body;
  const oldPhoto = data.extras[tipo][idx].foto;

  const extra = {
    ...data.extras[tipo][idx],
    nome: nome || data.extras[tipo][idx].nome,
    descricao: descricao ?? data.extras[tipo][idx].descricao,
    preco: parseFloat(preco || data.extras[tipo][idx].preco),
    tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : data.extras[tipo][idx].tags
  };

  if (req.file) {
    extra.foto = `/uploads/${req.file.filename}`;
  } else if (manterFoto === "false") {
    extra.foto = "";
  }

  data.extras[tipo][idx] = extra;
  writeMenu(data);

  if (oldPhoto && oldPhoto !== extra.foto && oldPhoto.startsWith("/uploads/")) {
    const oldPath = path.join(DATA_DIR, oldPhoto);
    fs.unlink(oldPath, () => {});
  }

  res.json(extra);
});

app.delete("/api/admin/extras/:tipo/:id", requireAdmin, (req, res) => {
  const { tipo, id } = req.params;
  const data = readMenu();
  const extra = data.extras[tipo]?.find(e => e.id === id);
  data.extras[tipo] = data.extras[tipo]?.filter(e => e.id !== id) || [];
  writeMenu(data);

  if (extra && extra.foto && extra.foto.startsWith("/uploads/")) {
    const oldPath = path.join(DATA_DIR, extra.foto);
    fs.unlink(oldPath, () => {});
  }

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Maceió Detox rodando na porta ${PORT}`);
  console.log(`Dados salvos em: ${MENU_FILE}`);
});
