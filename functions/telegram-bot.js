const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const CLOUD_FUNCTION_URL = process.env.CLOUD_FUNCTION_URL;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN não configurado no .env');
  process.exit(1);
}

if (!CHANNEL_ID) {
  console.error('❌ TELEGRAM_CHANNEL_ID não configurado no .env');
  process.exit(1);
}

if (!CLOUD_FUNCTION_URL) {
  console.error('❌ CLOUD_FUNCTION_URL não configurado no .env');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Bot Telegram iniciado!');
console.log('📡 Monitorando canal:', CHANNEL_ID);
console.log('🔗 Cloud Function URL:', CLOUD_FUNCTION_URL);

function parseSignalMessage(text) {
  try {
    const coinMatch = text.match(/📍\s*Ativo:\s*([^\n]+)/i);
    const timeframeMatch = text.match(/⏰\s*Timeframe:\s*([^\n]+)/i);
    const strategyMatch = text.match(/📈\s*Estratégia:\s*([^\n]+)/i);
    const rsiMatch = text.match(/RSI\s+Atual:\s*([0-9.]+)/i);
    const typeMatch = text.match(/💡\s*Tipo\s+de\s+operação:\s*(🟢\s*COMPRA|🔴\s*VENDA)/i);
    const priceMatch = text.match(/💵\s*Preço\s+de\s+entrada:\s*([0-9.]+)/i);

    if (!coinMatch || !timeframeMatch || !strategyMatch || !rsiMatch || !typeMatch || !priceMatch) {
      console.log('⚠️ Mensagem não contém todos os campos necessários');
      return null;
    }

    const coin = coinMatch[1].trim();
    const timeframe = timeframeMatch[1].trim().replace("Minuto's", 'Min');
    const strategy = strategyMatch[1].trim();
    const rsiValue = rsiMatch[1].trim();
    const typeText = typeMatch[1];
    const type = typeText.includes('COMPRA') ? 'LONG' : 'SHORT';
    const entry = priceMatch[1].trim();

    const signalData = {
      coin,
      type,
      entry,
      strategy,
      rsiValue,
      timeframe,
      status: 'Ativo',
      confidence: 'Alta'
    };

    console.log('✅ Sinal parseado:', signalData);
    return signalData;

  } catch (error) {
    console.error('❌ Erro ao parsear mensagem:', error);
    return null;
  }
}

async function sendToCloudFunction(signalData) {
  try {
    console.log('📤 Enviando para Cloud Function:', CLOUD_FUNCTION_URL);

    const response = await axios.post(CLOUD_FUNCTION_URL, signalData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Resposta da Cloud Function:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Erro ao enviar para Cloud Function:', error.message);
    if (error.response) {
      console.error('📋 Response data:', error.response.data);
      console.error('📋 Response status:', error.response.status);
    }
    throw error;
  }
}

bot.on('channel_post', async (msg) => {
  try {
    if (msg.chat.id.toString() !== CHANNEL_ID) {
      return;
    }

    console.log('\n📨 Nova mensagem no canal!');
    console.log('📄 Texto:', msg.text?.substring(0, 100) + '...');

    if (!msg.text || !msg.text.includes('📍 Ativo:')) {
      console.log('⏭️ Mensagem não é um sinal, ignorando...');
      return;
    }

    console.log('🎯 Detectado sinal de trading!');

    const signalData = parseSignalMessage(msg.text);

    if (!signalData) {
      console.log('❌ Falha ao parsear sinal');
      return;
    }

    await sendToCloudFunction(signalData);
    console.log('✅ Sinal processado com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
  }
});

bot.on('polling_error', (error) => {
  console.error('❌ Erro de polling:', error.code, error.message);
});

console.log('✅ Bot aguardando mensagens...\n');
