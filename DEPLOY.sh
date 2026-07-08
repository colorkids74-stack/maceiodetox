#!/bin/bash
echo "🚀 Atualizando e fazendo deploy..."
git add .
git commit -m "Refactor: Visual bonito + admin funcional"
git push origin main
echo "✅ Enviado para GitHub!"
echo "Railway está fazendo deploy automaticamente..."
echo "Acesse: https://seu-projeto.railway.app"
