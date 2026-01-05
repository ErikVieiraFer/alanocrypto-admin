# Telegram Userbot - Instruções de Configuração

## 1. Obter API_ID e API_HASH

1. Acesse https://my.telegram.org/apps
2. Faça login com seu número de telefone
3. Crie um novo aplicativo
4. Copie o `api_id` e `api_hash`

## 2. Configurar .env

Adicione as credenciais no arquivo `.env`:

```
TELEGRAM_API_ID=seu_api_id_aqui
TELEGRAM_API_HASH=seu_api_hash_aqui
```

## 3. Teste Local (Primeira Vez)

Na primeira execução, você precisará autenticar:

```bash
cd functions
pip install -r requirements.txt
python telegram-userbot.py
```

Será solicitado:
- Número de telefone
- Código de confirmação (enviado via Telegram)
- Senha 2FA (se habilitada)

Após autenticar, será criado o arquivo `alanocrypto_session.session`.

## 4. Deploy no Railway

1. Adicione as variáveis de ambiente no Railway:
   - TELEGRAM_API_ID
   - TELEGRAM_API_HASH
   - TELEGRAM_CHANNEL_ID
   - CLOUD_FUNCTION_URL

2. Na primeira vez, você precisará fazer login localmente e depois copiar o arquivo
   `alanocrypto_session.session` para o Railway.

3. O arquivo Procfile já está configurado para executar o userbot.

## 5. Trocar de Usuário

Para usar uma conta diferente:

1. Delete o arquivo `alanocrypto_session.session`
2. Execute novamente: `python telegram-userbot.py`
3. Faça login com a nova conta

## 6. Verificar Logs

O bot exibe logs detalhados:
- Mensagens recebidas
- Sinais detectados
- Parsing de campos
- Envio para Cloud Function
- Métricas de sucesso
