# Maceió Detox — Site com Painel Admin Dinâmico

Sistema completo de e-commerce para venda de planos de marmita, sucos e combos detox, com painel administrativo onde a cliente gerencia tudo online.

## 🎯 Funcionalidades

- ✅ **Site responsivo para celular** — fluxo de 4 steps: escolher plano → selecionar pratos → extras → checkout
- ✅ **Painel admin dinâmico** — login + gerenciar planos, marmitas, extras e dados da loja
- ✅ **Checkout via WhatsApp** — pedido automático com resumo completo
- ✅ **Upload de fotos** — cada prato/extra pode ter uma imagem
- ✅ **Pratos com adicional** — marmitas "gourmet" (peixe, camarão) cobram a mais
- ✅ **Backend em Node.js/Express** — sem banco de dados complexo, dados em arquivo JSON

## 📋 Pré-requisitos

- Node.js 18+
- npm
- Uma conta na Railway (para hospedagem)
- Git

## 🚀 Deploy na Railway

### 1. Preparar o repositório

```bash
# Navegar até a pasta do projeto
cd /caminho/para/maceio-detox-app

# Inicializar Git (se ainda não fez)
git init
git add .
git commit -m "Initial commit: Maceió Detox app"

# Enviar para o GitHub (crie um repositório antes)
git remote add origin https://github.com/seu-usuario/maceio-detox-app.git
git push -u origin main
```

### 2. Conectar Railway

1. Vá para [railway.app](https://railway.app)
2. Faça login / crie uma conta
3. Clique em **"New Project"** → **"Deploy from GitHub repo"**
4. Selecione seu repositório `maceio-detox-app`
5. Railway detectará que é um projeto Node.js e configurará automaticamente

### 3. Configurar variáveis de ambiente

Na Railway, vá para **Project Settings** → **Variables** e adicione:

```
PORT=3000
ADMIN_PASSWORD=sua_senha_segura_aqui
DATA_DIR=/persistent-data
```

⚠️ **Importante:** Configure um **Volume** persistente na Railway para armazenar os dados:
- Mount Path: `/persistent-data`
- Isso garante que os dados não se percam em cada deploy

### 4. Fazer deploy

Railway faz deploy automaticamente quando você fizer `git push`. Acesse a URL gerada (algo como `https://seu-projeto.railway.app`) e teste o site.

## 🛠️ Usar localmente (desenvolvimento)

```bash
# Instalar dependências
npm install

# Rodar o servidor
npm start

# Abrir no navegador
# Site: http://localhost:3000
# Admin: http://localhost:3000/admin.html
```

**Senha padrão do admin:** `maceiodetox2026` (defina a sua própria na Railway!)

## 📱 Estrutura do Site

### Cliente (Site Público)

**URL:** `/`

1. **Step 1 — Escolher plano**
   - 3 planos de marmita (5/10/20 unidades)
   - 3 planos de suco (7/15/30 unidades)
   - 3 combos fechados (Dia/Super/Mega Detox)

2. **Step 2 — Selecionar pratos** (só para marmita/suco)
   - Lista de todos os pratos disponíveis
   - Marcar checkboxes até atingir a quantidade

3. **Step 3 — Adicionar extras** (opcional)
   - Sucos, sobremesas avulsos
   - Checkbox simples pra marcar

4. **Step 4 — Revisor e WhatsApp**
   - Formulário: nome, endereço, forma de pagamento
   - Botão que abre WhatsApp com o pedido formatado

### Admin (Painel de Gerenciamento)

**URL:** `/admin.html`

**Login:** Digite a senha configurada

**Abas:**

1. **Loja** — Editar nome, slogan, WhatsApp, endereço, horário
2. **Planos** — Ajustar preços dos 9 planos (3 de marmita, 3 de suco, 3 combos)
3. **Marmitas** — Adicionar, editar, remover pratos; upload de foto; marcar como gourmet com preço extra
4. **Extras** — Gerenciar sucos e sobremesas avulsos

Tudo salva instantaneamente no servidor (no arquivo `/persistent-data/menu.json`).

## 🔐 Segurança

- **Autenticação simples:** Senha com token Bearer na API
- **Uploads:** Validados (só imagens, limite de 3MB)
- **Dados persistentes:** Salvo em arquivo JSON (substitua por banco de dados se escalar muito)

## 📊 Estrutura de Dados

```
menu.json
├── loja
│   ├── nome
│   ├── slogan
│   ├── whatsapp
│   ├── endereçoResumo
│   └── horario
├── planos
│   ├── marmitas (5, 10, 20 unidades)
│   ├── sucos (7, 15, 30 unidades)
│   └── combos (Dia, Super, Mega Detox)
├── marmitas
│   └── normal (lista de 12 pratos)
└── extras
    ├── sucos (lista)
    └── sobremesas (lista)
```

## 🎨 Customizações

### Mudar senha do admin

Na Railway, edite a variável `ADMIN_PASSWORD`.

### Adicionar/remover planos

No painel admin, clique em **Planos** e ajuste preços. Para adicionar novos planos, edite `seed/menu.seed.json` e redeploy.

### Customizar visual

CSS está em `public/css/style.css`. Cores principais estão no `:root`:
- `--primary`: verde escuro (principais)
- `--accent`: verde claro (destaques)
- `--bg`: branco (fundo)

## 🆘 Troubleshooting

### "Erro ao conectar" no admin

- Verifique se a Railway está online
- Verifique as variáveis de ambiente (`ADMIN_PASSWORD`)
- Limpe cache do navegador e tente novamente

### Fotos não aparecem

- Verifique se o upload funcionou (procure no terminal da Railway)
- Confirme que o Volume está configurado em `/persistent-data`

### Dados sumiram após deploy

- **Problema:** Não configurou Volume persistente
- **Solução:** Adicione um Volume na Railway apontando pra `/persistent-data`

## 📞 Suporte

Para dúvidas sobre o código ou funcionalidades, consulte:
- `server.js` — lógica do backend e rotas da API
- `public/js/new-flow.js` — lógica do site (4 steps)
- `public/js/admin-new.js` — lógica do painel admin

---

**Desenvolvido com ❤️ para Maceió Detox**

Versão: 1.0.0 — Julho/2026
