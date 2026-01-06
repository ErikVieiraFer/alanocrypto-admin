import os
import re
import json
import asyncio
import requests
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from dotenv import load_dotenv

load_dotenv()

API_ID = os.getenv('TELEGRAM_API_ID')
API_HASH = os.getenv('TELEGRAM_API_HASH')
CHANNEL_ID = int(os.getenv('TELEGRAM_CHANNEL_ID'))
CLOUD_FUNCTION_URL = os.getenv('CLOUD_FUNCTION_URL')

if not API_ID or not API_HASH:
    print('❌ TELEGRAM_API_ID e TELEGRAM_API_HASH devem estar configurados no .env')
    exit(1)

if not CHANNEL_ID:
    print('❌ TELEGRAM_CHANNEL_ID não configurado no .env')
    exit(1)

if not CLOUD_FUNCTION_URL:
    print('❌ CLOUD_FUNCTION_URL não configurado no .env')
    exit(1)

STRING_SESSION = os.getenv('TELEGRAM_STRING_SESSION', '')
session = StringSession(STRING_SESSION) if STRING_SESSION else 'alanocrypto_session'
client = TelegramClient(session, API_ID, API_HASH)

metrics = {
    'total_messages': 0,
    'signals_detected': 0,
    'signals_parsed': 0,
    'signals_failed': 0
}

def normalize_text(text):
    return text.replace(''', "'").replace(''', "'").strip()

def try_multiple_patterns(text, patterns, field_name, is_optional=False):
    for i, pattern in enumerate(patterns):
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            print(f'✅ {field_name}: encontrado com pattern {i + 1}')
            return match.group(1).strip()

    if is_optional:
        print(f'⚠️  {field_name}: não encontrado (campo opcional)')
    else:
        print(f'❌ {field_name}: não encontrado (testados {len(patterns)} patterns)')
    return None

def validate_numeric_value(value, field_name, min_val=None, max_val=None):
    try:
        num = float(value)

        if min_val is not None and num < min_val:
            print(f'⚠️ {field_name}: {num} está abaixo do mínimo ({min_val})')
            return None

        if max_val is not None and num > max_val:
            print(f'⚠️ {field_name}: {num} está acima do máximo ({max_val})')
            return None

        return num
    except ValueError:
        print(f'⚠️ {field_name}: "{value}" não é um número válido')
        return None

def detect_operation_type(text):
    normalized = normalize_text(text.upper())

    buy_patterns = [
        r'🟢\s*COMPRA',
        r'\bCOMPRA\b',
        r'\bBUY\b',
        r'\bLONG\b',
        r'\bCALL\b'
    ]

    sell_patterns = [
        r'🔴\s*VENDA',
        r'\bVENDA\b',
        r'\bSELL\b',
        r'\bSHORT\b',
        r'\bPUT\b'
    ]

    for pattern in buy_patterns:
        if re.search(pattern, normalized):
            print('✅ Tipo: COMPRA detectado')
            return 'LONG'

    for pattern in sell_patterns:
        if re.search(pattern, normalized):
            print('✅ Tipo: VENDA detectado')
            return 'SHORT'

    print('⚠️ Tipo: não detectado')
    return None

def parse_signal_message(text):
    print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    print('🔍 INICIANDO PARSING DE SINAL')
    print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    normalized_text = normalize_text(text)
    parsed_fields = {}
    missing_fields = []

    try:
        coin_patterns = [
            r'(?:📍\s*)?Ativo:\s*([A-Z]{3,10}(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|NZD)?)',
            r'(?:📍\s*)?Ativo:\s*([^\n\r]+?)(?:\n|\r|$)',
            r'(?:📍\s*)?Ativo\s*[:-]\s*([A-Z]{3,10})',
            r'Par:\s*([A-Z]{3,10})'
        ]
        parsed_fields['coin'] = try_multiple_patterns(normalized_text, coin_patterns, 'coin')

        timeframe_patterns = [
            r'(?:⏰\s*)?Timeframe:\s*([^\n\r]+?)(?:\n|\r|$)',
            r'(?:⏰\s*)?TF:\s*([^\n\r]+?)(?:\n|\r|$)',
            r'(?:⏰\s*)?Tempo:\s*([^\n\r]+?)(?:\n|\r|$)',
            r'(\d+)\s*Minuto',
            r'M(\d+)'
        ]
        raw_timeframe = try_multiple_patterns(normalized_text, timeframe_patterns, 'timeframe', True)
        if raw_timeframe:
            parsed_fields['timeframe'] = re.sub(r"Minuto'?s?", 'Min', raw_timeframe, flags=re.IGNORECASE).replace('M', '').strip()
        else:
            parsed_fields['timeframe'] = None

        strategy_patterns = [
            r'(?:📈|📉\s*)?Estratégia:\s*([^\n\r]+?)(?:\n|\r|$)',
            r'(?:📈|📉\s*)?Strategy:\s*([^\n\r]+?)(?:\n|\r|$)',
            r'Indicador:\s*([^\n\r]+?)(?:\n|\r|$)',
            r'(RSI\s*[–-]\s*[^\n\r]+?)(?:\n|\r|$)'
        ]
        parsed_fields['strategy'] = try_multiple_patterns(normalized_text, strategy_patterns, 'strategy', True)

        rsi_patterns = [
            r'RSI\s+Atual:\s*([0-9.]+)',
            r'RSI:\s*([0-9.]+)',
            r'\(\s*RSI\s+Atual:\s*([0-9.]+)\s*\)',
            r'Atual:\s*([0-9.]+)'
        ]
        rsi_raw = try_multiple_patterns(normalized_text, rsi_patterns, 'rsi', True)
        if rsi_raw:
            parsed_fields['rsi_value'] = validate_numeric_value(rsi_raw, 'RSI', 0, 100)
        else:
            parsed_fields['rsi_value'] = None

        parsed_fields['type'] = detect_operation_type(normalized_text)

        price_patterns = [
            r'(?:💵\s*)?Preço\s+de\s+entrada:\s*([0-9.]+)',
            r'(?:💵\s*)?Preço:\s*([0-9.]+)',
            r'(?:💵\s*)?Entry:\s*([0-9.]+)',
            r'(?:💵\s*)?Entrada:\s*([0-9.]+)',
            r'Price:\s*([0-9.]+)'
        ]
        price_raw = try_multiple_patterns(normalized_text, price_patterns, 'price')
        if price_raw:
            parsed_fields['entry'] = validate_numeric_value(price_raw, 'Preço', 0.00001)

        print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        print('📊 RESULTADO DO PARSING')
        print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        required_fields = ['coin', 'type', 'entry']

        for field in required_fields:
            if not parsed_fields.get(field):
                missing_fields.append(field)
                print(f'❌ Campo obrigatório ausente: {field}')

        optional_fields = ['timeframe', 'strategy', 'rsi_value']
        for field in optional_fields:
            if not parsed_fields.get(field):
                print(f'⚠️ Campo opcional ausente: {field}')

        if missing_fields:
            print(f'\n❌ PARSING FALHOU: {len(missing_fields)} campo(s) obrigatório(s) ausente(s)')
            print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
            metrics['signals_failed'] += 1
            return None

        signal_data = {
            'coin': parsed_fields['coin'],
            'type': parsed_fields['type'],
            'entry': str(parsed_fields['entry']),
            'strategy': parsed_fields.get('strategy') or 'Não especificado',
            'rsiValue': str(parsed_fields['rsi_value']) if parsed_fields.get('rsi_value') else 'N/A',
            'timeframe': parsed_fields.get('timeframe') or 'N/A',
            'status': 'Ativo',
            'confidence': 'Alta'
        }

        print('✅ SINAL PARSEADO COM SUCESSO:')
        print(json.dumps(signal_data, indent=2, ensure_ascii=False))
        print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        metrics['signals_parsed'] += 1
        return signal_data

    except Exception as error:
        print(f'❌ ERRO CRÍTICO AO PARSEAR: {error}')
        print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        metrics['signals_failed'] += 1
        return None

def send_to_cloud_function(signal_data):
    try:
        print(f'📤 Enviando para Cloud Function: {CLOUD_FUNCTION_URL}')

        response = requests.post(
            CLOUD_FUNCTION_URL,
            json=signal_data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )

        print(f'✅ Resposta da Cloud Function: {response.json()}')
        return response.json()

    except Exception as error:
        print(f'❌ Erro ao enviar para Cloud Function: {error}')
        if hasattr(error, 'response') and error.response:
            print(f'📋 Response data: {error.response.text}')
            print(f'📋 Response status: {error.response.status_code}')
        raise

def is_signal_message(text):
    if not text:
        return False

    signal_indicators = [
        r'(?:📍\s*)?Ativo:',
        r'(?:💡\s*)?Tipo\s+de\s+operação:',
        r'(?:💵\s*)?Preço\s+de\s+entrada:',
        r'COMPRA|VENDA',
        r'BUY|SELL',
        r'LONG|SHORT',
        r'Entry|Entrada'
    ]

    match_count = sum(1 for pattern in signal_indicators if re.search(pattern, text, re.IGNORECASE))
    return match_count >= 2

def print_metrics():
    print('\n╔════════════════════════════════════════════╗')
    print('║         📊 MÉTRICAS DO USERBOT             ║')
    print('╠════════════════════════════════════════════╣')
    print(f'║ Total de mensagens: {str(metrics["total_messages"]).ljust(19)} ║')
    print(f'║ Sinais detectados:  {str(metrics["signals_detected"]).ljust(19)} ║')
    print(f'║ Sinais parseados:   {str(metrics["signals_parsed"]).ljust(19)} ║')
    print(f'║ Sinais falhados:    {str(metrics["signals_failed"]).ljust(19)} ║')

    if metrics['signals_detected'] > 0:
        success_rate = (metrics['signals_parsed'] / metrics['signals_detected']) * 100
        print(f'║ Taxa de sucesso:    {f"{success_rate:.1f}%".ljust(19)} ║')

    print('╚════════════════════════════════════════════╝\n')

@client.on(events.NewMessage(chats=CHANNEL_ID))
async def handler(event):
    try:
        metrics['total_messages'] += 1

        print('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        print(f'📨 NOVA MENSAGEM NO CANAL (#{metrics["total_messages"]})')
        print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        if not event.message.text:
            print('⏭️ Mensagem sem texto, ignorando...\n')
            return

        text = event.message.text
        preview = text[:150].replace('\n', ' ') + '...'
        print(f'📄 Prévia: {preview}')

        if not is_signal_message(text):
            print('⏭️ Não parece ser um sinal de trading, ignorando...\n')
            return

        metrics['signals_detected'] += 1
        print(f'\n🎯 SINAL DE TRADING DETECTADO (#{metrics["signals_detected"]})')

        signal_data = parse_signal_message(text)

        if not signal_data:
            print('❌ Falha ao parsear sinal\n')
            print_metrics()
            return

        send_to_cloud_function(signal_data)
        print('✅ Sinal processado e enviado com sucesso!\n')
        print_metrics()

    except Exception as error:
        print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        print(f'❌ ERRO CRÍTICO AO PROCESSAR MENSAGEM: {error}')
        print('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        metrics['signals_failed'] += 1

async def main():
    print('🤖 Telegram Userbot iniciado!')
    print(f'📡 Monitorando canal: {CHANNEL_ID}')
    print(f'🔗 Cloud Function URL: {CLOUD_FUNCTION_URL}')

    await client.start()
    print('✅ Cliente conectado! Aguardando mensagens...\n')

    await client.run_until_disconnected()

if __name__ == '__main__':
    asyncio.run(main())
