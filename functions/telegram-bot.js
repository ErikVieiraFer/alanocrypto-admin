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

const metrics = {
  totalMessages: 0,
  signalsDetected: 0,
  signalsParsed: 0,
  signalsFailed: 0,
  fieldSuccessRate: {
    coin: 0,
    timeframe: 0,
    strategy: 0,
    rsi: 0,
    type: 0,
    price: 0
  }
};

console.log('🤖 Bot Telegram iniciado!');
console.log('📡 Monitorando canal:', CHANNEL_ID);
console.log('🔗 Cloud Function URL:', CLOUD_FUNCTION_URL);

function normalizeText(text) {
  return text
    .replace(/['']/g, "'")
    .trim();
}

function tryMultiplePatterns(text, patterns, fieldName, isOptional = false) {
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      console.log(`✅ ${fieldName}: encontrado com pattern ${i + 1}`);
      metrics.fieldSuccessRate[fieldName]++;
      return match[1].trim();
    }
  }

  if (isOptional) {
    console.log(`⚠️  ${fieldName}: não encontrado (campo opcional)`);
  } else {
    console.log(`❌ ${fieldName}: não encontrado (testados ${patterns.length} patterns)`);
  }
  return null;
}

function validateNumericValue(value, fieldName, min = null, max = null) {
  const num = parseFloat(value);

  if (isNaN(num)) {
    console.log(`⚠️ ${fieldName}: "${value}" não é um número válido`);
    return null;
  }

  if (min !== null && num < min) {
    console.log(`⚠️ ${fieldName}: ${num} está abaixo do mínimo (${min})`);
    return null;
  }

  if (max !== null && num > max) {
    console.log(`⚠️ ${fieldName}: ${num} está acima do máximo (${max})`);
    return null;
  }

  return num;
}

function detectOperationType(text) {
  const normalized = normalizeText(text.toUpperCase());

  const buyPatterns = [
    /🟢\s*COMPRA/i,
    /\bCOMPRA\b/i,
    /\bBUY\b/i,
    /\bLONG\b/i,
    /\bCALL\b/i
  ];

  const sellPatterns = [
    /🔴\s*VENDA/i,
    /\bVENDA\b/i,
    /\bSELL\b/i,
    /\bSHORT\b/i,
    /\bPUT\b/i
  ];

  for (const pattern of buyPatterns) {
    if (pattern.test(normalized)) {
      console.log('✅ Tipo: COMPRA detectado');
      return 'LONG';
    }
  }

  for (const pattern of sellPatterns) {
    if (pattern.test(normalized)) {
      console.log('✅ Tipo: VENDA detectado');
      return 'SHORT';
    }
  }

  console.log('⚠️ Tipo: não detectado');
  return null;
}

function parseSignalMessage(text) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 INICIANDO PARSING DE SINAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const normalizedText = normalizeText(text);
  const parsedFields = {};
  const missingFields = [];

  try {
    const coinPatterns = [
      /(?:📍\s*)?Ativo:\s*([A-Z]{3,10}(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|NZD)?)/i,
      /(?:📍\s*)?Ativo:\s*([^\n\r]+?)(?:\n|\r|$)/i,
      /(?:📍\s*)?Ativo\s*[:-]\s*([A-Z]{3,10})/i,
      /Par:\s*([A-Z]{3,10})/i
    ];
    parsedFields.coin = tryMultiplePatterns(normalizedText, coinPatterns, 'coin');

    const timeframePatterns = [
      /(?:⏰\s*)?Timeframe:\s*([^\n\r]+?)(?:\n|\r|$)/i,
      /(?:⏰\s*)?TF:\s*([^\n\r]+?)(?:\n|\r|$)/i,
      /(?:⏰\s*)?Tempo:\s*([^\n\r]+?)(?:\n|\r|$)/i,
      /(\d+)\s*Minuto/i,
      /M(\d+)/i
    ];
    parsedFields.rawTimeframe = tryMultiplePatterns(normalizedText, timeframePatterns, 'timeframe', true);
    if (parsedFields.rawTimeframe) {
      parsedFields.timeframe = parsedFields.rawTimeframe
        .replace(/Minuto'?s?/gi, 'Min')
        .replace(/^M/, '')
        .trim();
    } else {
      parsedFields.timeframe = null;
    }

    const strategyPatterns = [
      /(?:📈|📉\s*)?Estratégia:\s*([^\n\r]+?)(?:\n|\r|$)/i,
      /(?:📈|📉\s*)?Strategy:\s*([^\n\r]+?)(?:\n|\r|$)/i,
      /Indicador:\s*([^\n\r]+?)(?:\n|\r|$)/i,
      /(RSI\s*[–-]\s*[^\n\r]+?)(?:\n|\r|$)/i
    ];
    parsedFields.strategy = tryMultiplePatterns(normalizedText, strategyPatterns, 'strategy', true);

    const rsiPatterns = [
      /RSI\s+Atual:\s*([0-9.]+)/i,
      /RSI:\s*([0-9.]+)/i,
      /\(\s*RSI\s+Atual:\s*([0-9.]+)\s*\)/i,
      /Atual:\s*([0-9.]+)/i
    ];
    const rsiRaw = tryMultiplePatterns(normalizedText, rsiPatterns, 'rsi', true);
    if (rsiRaw) {
      parsedFields.rsiValue = validateNumericValue(rsiRaw, 'RSI', 0, 100);
    } else {
      parsedFields.rsiValue = null;
    }

    parsedFields.type = detectOperationType(normalizedText);

    const pricePatterns = [
      /(?:💵\s*)?Preço\s+de\s+entrada:\s*([0-9.]+)/i,
      /(?:💵\s*)?Preço:\s*([0-9.]+)/i,
      /(?:💵\s*)?Entry:\s*([0-9.]+)/i,
      /(?:💵\s*)?Entrada:\s*([0-9.]+)/i,
      /Price:\s*([0-9.]+)/i
    ];
    const priceRaw = tryMultiplePatterns(normalizedText, pricePatterns, 'price');
    if (priceRaw) {
      parsedFields.entry = validateNumericValue(priceRaw, 'Preço', 0.00001);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESULTADO DO PARSING');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const requiredFields = ['coin', 'type', 'entry'];
    const optionalFields = ['timeframe', 'strategy', 'rsiValue'];

    for (const field of requiredFields) {
      if (!parsedFields[field] && field !== 'timeframe') {
        missingFields.push(field);
        console.log(`❌ Campo obrigatório ausente: ${field}`);
      }
    }

    for (const field of optionalFields) {
      if (!parsedFields[field]) {
        console.log(`⚠️ Campo opcional ausente: ${field}`);
      }
    }

    if (missingFields.length > 0) {
      console.log(`\n❌ PARSING FALHOU: ${missingFields.length} campo(s) obrigatório(s) ausente(s)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      metrics.signalsFailed++;
      return null;
    }

    const signalData = {
      coin: parsedFields.coin,
      type: parsedFields.type,
      entry: String(parsedFields.entry),
      strategy: parsedFields.strategy || 'Não especificado',
      rsiValue: parsedFields.rsiValue ? String(parsedFields.rsiValue) : 'N/A',
      timeframe: parsedFields.timeframe || 'N/A',
      status: 'Ativo',
      confidence: 'Alta'
    };

    console.log('✅ SINAL PARSEADO COM SUCESSO:');
    console.log(JSON.stringify(signalData, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    metrics.signalsParsed++;
    return signalData;

  } catch (error) {
    console.error('❌ ERRO CRÍTICO AO PARSEAR:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    metrics.signalsFailed++;
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

function isSignalMessage(text) {
  if (!text) return false;

  const signalIndicators = [
    /(?:📍\s*)?Ativo:/i,
    /(?:💡\s*)?Tipo\s+de\s+operação:/i,
    /(?:💵\s*)?Preço\s+de\s+entrada:/i,
    /COMPRA|VENDA/i,
    /BUY|SELL/i,
    /LONG|SHORT/i,
    /Entry|Entrada/i
  ];

  let matchCount = 0;
  for (const pattern of signalIndicators) {
    if (pattern.test(text)) {
      matchCount++;
    }
  }

  return matchCount >= 2;
}

function printMetrics() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║         📊 MÉTRICAS DO BOT                 ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║ Total de mensagens: ${String(metrics.totalMessages).padEnd(19)} ║`);
  console.log(`║ Sinais detectados:  ${String(metrics.signalsDetected).padEnd(19)} ║`);
  console.log(`║ Sinais parseados:   ${String(metrics.signalsParsed).padEnd(19)} ║`);
  console.log(`║ Sinais falhados:    ${String(metrics.signalsFailed).padEnd(19)} ║`);

  if (metrics.signalsDetected > 0) {
    const successRate = ((metrics.signalsParsed / metrics.signalsDetected) * 100).toFixed(1);
    console.log(`║ Taxa de sucesso:    ${String(successRate + '%').padEnd(19)} ║`);
  }

  console.log('╠════════════════════════════════════════════╣');
  console.log('║ Taxa de sucesso por campo:                 ║');
  for (const [field, count] of Object.entries(metrics.fieldSuccessRate)) {
    console.log(`║   ${field.padEnd(12)}: ${String(count).padEnd(25)} ║`);
  }
  console.log('╚════════════════════════════════════════════╝\n');
}

// bot.on('message', async (msg) => {
//   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//   console.log('📨 MENSAGEM RECEBIDA (message event)!');
//   console.log('Chat ID:', msg.chat.id);
//   console.log('Tipo:', msg.chat.type);
//   console.log('De:', msg.from?.username || msg.from?.first_name);
//   console.log('Texto:', msg.text?.substring(0, 100));
//   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
// });

bot.on('channel_post', async (msg) => {
  console.log('🔔 EVENT channel_post DISPARADO!');
  console.log('Chat ID:', msg.chat.id);
  console.log('Chat Type:', msg.chat.type);

  try {
    if (msg.chat.id.toString() !== CHANNEL_ID) {
      return;
    }

    metrics.totalMessages++;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📨 NOVA MENSAGEM NO CANAL (#${metrics.totalMessages})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!msg.text) {
      console.log('⏭️ Mensagem sem texto, ignorando...\n');
      return;
    }

    console.log('📄 Prévia:', msg.text.substring(0, 150).replace(/\n/g, ' ') + '...');

    if (!isSignalMessage(msg.text)) {
      console.log('⏭️ Não parece ser um sinal de trading, ignorando...\n');
      return;
    }

    metrics.signalsDetected++;
    console.log(`\n🎯 SINAL DE TRADING DETECTADO (#${metrics.signalsDetected})`);

    const signalData = parseSignalMessage(msg.text);

    if (!signalData) {
      console.log('❌ Falha ao parsear sinal\n');
      printMetrics();
      return;
    }

    await sendToCloudFunction(signalData);
    console.log('✅ Sinal processado e enviado com sucesso!\n');
    printMetrics();

  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERRO CRÍTICO AO PROCESSAR MENSAGEM:', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    metrics.signalsFailed++;
  }
});

bot.on('message', async (msg) => {
  if (msg.chat.type !== 'supergroup' && msg.chat.type !== 'group') {
    return;
  }
  
  if (msg.chat.id.toString() !== CHANNEL_ID) {
    return;
  }

  console.log('🔔 MENSAGEM EM SUPERGROUP DETECTADA!');
  console.log('Texto:', msg.text?.substring(0, 100));
  
  // Usa a mesma lógica do channel_post
  metrics.totalMessages++;
  
  if (!msg.text || !isSignalMessage(msg.text)) {
    console.log('⏭️ Não é sinal, ignorando...');
    return;
  }
  
  console.log('🎯 SINAL DETECTADO!');
  const signalData = parseSignalMessage(msg.text);
  
  if (signalData) {
    await sendToCloudFunction(signalData);
    console.log('✅ Sinal processado!');
  }
});

// bot.on('text', async (msg) => {
//   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
//   console.log('📨 TEXTO RECEBIDO (text event)!');
//   console.log('Chat ID:', msg.chat.id);
//   console.log('Tipo:', msg.chat.type);
//   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
// });

bot.on('polling_error', (error) => {
  console.error('❌ Erro de polling:', error.code, error.message);
});

console.log('✅ Bot aguardando mensagens...\n');
