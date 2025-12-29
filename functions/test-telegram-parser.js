const axios = require('axios');
require('dotenv').config();

const CLOUD_FUNCTION_URL = process.env.CLOUD_FUNCTION_URL || 'http://localhost:5001/seu-projeto/us-central1/processTelegramSignal';

const exemploMensagemTelegram = `🚨 Alerta de Oportunidade! 🚨
🔥 Análises do Alano Crypto
🎯 Acabamos de receber uma notificação
📍 Ativo: EURUSD
⏰ Timeframe: 15Minuto's
📈 Estratégia: RSI – Sobrevendido no nível 30
🥇 Entrada Nível 1 ( RSI Atual: 27.16 )
💡 Tipo de operação: 🟢 COMPRA
💵 Preço de entrada: 7.469`;

const exemploMensagemVenda = `🚨 Alerta de Oportunidade! 🚨
🔥 Análises do Alano Crypto
🎯 Acabamos de receber uma notificação
📍 Ativo: UK100FT
⏰ Timeframe: 30Minuto's
📈 Estratégia: RSI – Sobrecomprado no nível 70
🥇 Entrada Nível 1 ( RSI Atual: 73.45 )
💡 Tipo de operação: 🔴 VENDA
💵 Preço de entrada: 8245.50`;

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

    return signalData;

  } catch (error) {
    console.error('❌ Erro ao parsear mensagem:', error);
    return null;
  }
}

async function testParser() {
  console.log('🧪 ========== TESTE DE PARSER DE MENSAGEM TELEGRAM ==========\n');

  console.log('📝 Teste 1: Sinal de COMPRA (LONG)');
  console.log('─────────────────────────────────────────────────────────────');
  const sinal1 = parseSignalMessage(exemploMensagemTelegram);
  if (sinal1) {
    console.log('✅ Parser funcionou!');
    console.log(JSON.stringify(sinal1, null, 2));
  } else {
    console.log('❌ Parser falhou!');
  }

  console.log('\n📝 Teste 2: Sinal de VENDA (SHORT)');
  console.log('─────────────────────────────────────────────────────────────');
  const sinal2 = parseSignalMessage(exemploMensagemVenda);
  if (sinal2) {
    console.log('✅ Parser funcionou!');
    console.log(JSON.stringify(sinal2, null, 2));
  } else {
    console.log('❌ Parser falhou!');
  }

  console.log('\n🌐 Teste 3: Enviar para Cloud Function');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('URL:', CLOUD_FUNCTION_URL);

  try {
    console.log('📤 Enviando sinal 1...');
    const response1 = await axios.post(CLOUD_FUNCTION_URL, sinal1, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ Resposta:', response1.data);

    console.log('\n📤 Enviando sinal 2...');
    const response2 = await axios.post(CLOUD_FUNCTION_URL, sinal2, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ Resposta:', response2.data);

  } catch (error) {
    console.error('❌ Erro ao enviar para Cloud Function:', error.message);
    if (error.response) {
      console.error('📋 Response data:', error.response.data);
      console.error('📋 Response status:', error.response.status);
    }
  }

  console.log('\n🏁 ========== FIM DOS TESTES ==========');
}

testParser();
