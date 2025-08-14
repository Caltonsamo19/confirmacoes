#!/bin/bash

# Script de instalação automática para Bot WhatsApp Transações
# Para uso no servidor Contabo

echo "🚀 Instalando Bot WhatsApp - Confirmações de Transação"
echo "=================================================="

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js encontrado: $(node --version)"
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instalando..."
    sudo apt-get install -y npm
else
    echo "✅ npm encontrado: $(npm --version)"
fi

# Criar diretório do projeto
PROJECT_DIR="bot-transacoes"
if [ -d "$PROJECT_DIR" ]; then
    echo "📁 Diretório $PROJECT_DIR já existe. Removendo..."
    rm -rf "$PROJECT_DIR"
fi

echo "📁 Criando diretório $PROJECT_DIR..."
mkdir "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Criar estrutura de diretórios
mkdir -p logs
mkdir -p session

echo "📦 Instalando dependências..."
npm install

echo "🔧 Configurando permissões..."
chmod +x ../install.sh
chmod 755 .

# Instalar PM2 globalmente se não existir
if ! command -v pm2 &> /dev/null; then
    echo "📊 Instalando PM2 para gerenciamento de processos..."
    sudo npm install -g pm2
else
    echo "✅ PM2 já está instalado: $(pm2 --version)"
fi

echo ""
echo "✅ Instalação concluída!"
echo "=================================================="
echo ""
echo "📋 Próximos passos:"
echo "1. Copie os arquivos bot.js e package.json para esta pasta"
echo "2. Execute: npm install"
echo "3. Execute: node bot.js (para escanear QR Code)"
echo "4. Após autenticação: pm2 start bot.js --name bot-transacoes"
echo ""
echo "🔗 Endpoints disponíveis:"
echo "  POST http://SEU_IP:3000/enviar"
echo "  GET  http://SEU_IP:3000/grupos"
echo "  GET  http://SEU_IP:3000/status"
echo ""
echo "📊 Gerenciar com PM2:"
echo "  pm2 status"
echo "  pm2 logs bot-transacoes"
echo "  pm2 restart bot-transacoes"
echo ""