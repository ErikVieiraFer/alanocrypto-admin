# 📧 Configuração Resend API - Email Verification

## 🎯 Visão Geral

Este projeto usa a [Resend](https://resend.com) para enviar emails de verificação e notificações.

## 📋 Pré-requisitos

- Conta na Resend (gratuita: 100 emails/dia, 3000/mês)
- Firebase Functions configurado
- Node.js instalado

---

## 🚀 Passo a Passo - Configuração

### 1️⃣ Obter API Key da Resend

1. **Acesse:** https://resend.com/api-keys
2. **Faça login** ou **cadastre-se** (grátis)
3. Clique em **"Create API Key"**
4. Dê um nome (ex: "AlanoCryptoFX Production")
5. **Copie a chave** (começa com `re_`)

⚠️ **IMPORTANTE:** A chave só é exibida UMA VEZ! Guarde com segurança.

---

### 2️⃣ Configurar no Projeto

Arquivo: `functions/.env`

```env
RESEND_API_KEY=re_SUA_CHAVE_AQUI
EMAIL_FROM=onboarding@resend.dev
```

**Exemplo:**
```env
RESEND_API_KEY=re_idEfA3Ht_KLqDnbCD9KNWvSLdS386hrpk
EMAIL_FROM=onboarding@resend.dev
```

---

### 3️⃣ Instalar Dependências

```bash
cd functions
npm install resend
```

---

### 4️⃣ Deploy das Cloud Functions

```bash
firebase deploy --only functions
```

⏱️ **Tempo estimado:** 2-5 minutos

---

## 🔍 Verificar se Está Funcionando

### Opção 1: Ver Logs no Firebase Console

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em **Functions** → **Logs**
4. Procure por:
   ```
   🔵 [sendEmailVerification] Iniciando...
   📧 Email: teste@exemplo.com
   🔑 API Key configurada: re_idEf...
   🔢 Código gerado: 123456
   💾 Salvando código no Firestore...
   ✅ Código salvo no Firestore com sucesso
   📮 Enviando email via Resend...
   ✅ Email enviado com sucesso!
   ```

### Opção 2: Ver Logs em Tempo Real

```bash
firebase functions:log --only sendEmailVerification
```

### Opção 3: Ver Dashboard da Resend

1. Acesse: https://resend.com/emails
2. Veja os emails enviados em tempo real
3. Status de entrega: **Delivered**, **Bounced**, **Failed**

---

## ❌ Problemas Comuns

### Problema 1: "API Key não configurada"

**Sintomas:**
```
❌ RESEND_API_KEY não configurada!
```

**Solução:**
1. Verifique se o arquivo `functions/.env` existe
2. Verifique se tem `RESEND_API_KEY=re_...`
3. Faça deploy novamente: `firebase deploy --only functions`

---

### Problema 2: "Invalid API Key"

**Sintomas:**
```
❌ ERRO ao enviar email via Resend: Invalid API key
```

**Solução:**
1. Gere uma **nova API key** em https://resend.com/api-keys
2. Atualize o arquivo `functions/.env`
3. Deploy: `firebase deploy --only functions`

---

### Problema 3: Email não chega

**Possíveis causas:**

**A) Email foi para SPAM**
- Verifique a pasta de spam/lixo eletrônico
- Marque como "não é spam"

**B) Email inválido**
- Verifique se o email está correto
- Use emails reais (não temporários)

**C) Limite de envios atingido**
- **Plano Gratuito:** 100 emails/dia, 3000/mês
- Verifique: https://resend.com/emails

**D) Domínio bloqueado**
- Alguns provedores (ex: Yahoo, Outlook) podem bloquear emails de `onboarding@resend.dev`
- **Solução:** Configure domínio personalizado (ver seção abaixo)

---

### Problema 4: Código não aparece no Firestore

**Sintomas:**
- Email não chega
- Nada na collection `email_verifications`

**Solução:**
1. Veja os logs: `firebase functions:log`
2. Verifique se a função está sendo chamada
3. Verifique permissões do Firestore

---

## 🎨 Configurar Domínio Personalizado (Opcional)

### Por que usar domínio personalizado?

- ✅ Maior taxa de entrega
- ✅ Aparece como `noreply@seudominio.com`
- ✅ Mais profissional
- ✅ Menos chance de cair em spam

### Como configurar:

1. Acesse: https://resend.com/domains
2. Clique em **"Add Domain"**
3. Digite seu domínio (ex: `alanocryptofx.com`)
4. Adicione os **registros DNS** no seu provedor (Cloudflare, GoDaddy, etc.)
5. Aguarde verificação (2-24 horas)

**Registros DNS necessários:**

| Tipo | Nome | Valor |
|------|------|-------|
| MX | @ | feedback-smtp.us-east-1.amazonses.com |
| TXT | @ | v=spf1 include:amazonses.com ~all |
| CNAME | resend._domainkey | resend._domainkey.u12345.wl123.sendgrid.net |

6. Atualize `functions/.env`:
```env
EMAIL_FROM=noreply@seudominio.com
```

7. Deploy: `firebase deploy --only functions`

---

## 📊 Monitoramento

### Ver estatísticas:
- https://resend.com/emails (dashboard)

### Métricas disponíveis:
- ✉️ Emails enviados
- ✅ Emails entregues
- ❌ Emails falhados
- 🔄 Bounces (emails inválidos)
- 📬 Taxa de abertura (com domínio personalizado)

---

## 🧪 Testar Manualmente

### Opção 1: Firebase Console

1. Vá em **Functions** → **sendEmailVerification**
2. Clique em **"Test function"**
3. Cole o JSON:
```json
{
  "data": {
    "email": "seu-email@gmail.com",
    "displayName": "Seu Nome"
  }
}
```
4. Clique em **"Run test"**

### Opção 2: Curl

```bash
curl -X POST \
  https://us-central1-SEU-PROJETO.cloudfunctions.net/sendEmailVerification \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "email": "seu-email@gmail.com",
      "displayName": "Seu Nome"
    }
  }'
```

---

## 📦 Estrutura do Código

```javascript
// functions/index.js

// Importar Resend
const { Resend } = require('resend');

// Configurar com API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// Enviar email
await resend.emails.send({
  from: 'onboarding@resend.dev',
  to: 'usuario@email.com',
  subject: '🔒 Código de Verificação',
  html: '<h1>Seu código: 123456</h1>',
});
```

---

## 🔐 Segurança

### ✅ Boas práticas:

1. **NUNCA** commite o arquivo `.env` no Git
2. Adicione `.env` ao `.gitignore`
3. Use variáveis de ambiente no Firebase Functions
4. Gere API Keys específicas por ambiente (dev/prod)
5. Revogue API Keys antigas ao gerar novas

### 🚫 Não faça:

- ❌ Colocar API Key direto no código
- ❌ Compartilhar API Key publicamente
- ❌ Usar mesma API Key em múltiplos projetos

---

## 💡 Dicas

### Aumentar taxa de entrega:

1. ✅ Use domínio personalizado
2. ✅ Configure SPF, DKIM, DMARC
3. ✅ Evite palavras de spam no subject/body
4. ✅ Tenha link de descadastro (unsubscribe)
5. ✅ Monitore bounces e remova emails inválidos

### Economizar emails (plano gratuito):

1. ✅ Só envie para emails verificados
2. ✅ Agrupe notificações (digest diário)
3. ✅ Ofereça opção de desativar emails
4. ✅ Use notificações push como principal meio

---

## 📞 Suporte

- **Documentação Resend:** https://resend.com/docs
- **Status da API:** https://status.resend.com
- **Suporte Resend:** support@resend.com
- **Discord Resend:** https://resend.com/discord

---

## 📝 Checklist de Verificação

Antes de ir para produção:

- [ ] API Key configurada no `.env`
- [ ] `.env` no `.gitignore`
- [ ] Functions deployadas: `firebase deploy --only functions`
- [ ] Teste enviado e recebido com sucesso
- [ ] Logs sem erros no Firebase Console
- [ ] Email não está em spam
- [ ] Domínio personalizado configurado (recomendado)
- [ ] Monitoramento ativo no dashboard Resend

---

## 🎉 Pronto!

Agora seus emails de verificação devem funcionar perfeitamente! 🚀

Se continuar com problemas, verifique os logs detalhados:

```bash
firebase functions:log --only sendEmailVerification
```

**Exemplo de logs com sucesso:**

```
🔵 [sendEmailVerification] Iniciando...
📧 Email: usuario@gmail.com
👤 Nome: João Silva
🔑 API Key configurada: re_idEf...
🔢 Código gerado: 789123
💾 Salvando código no Firestore...
✅ Código salvo no Firestore com sucesso
📮 Enviando email via Resend...
📤 De: onboarding@resend.dev
📥 Para: usuario@gmail.com
✅ Email enviado com sucesso!
📬 Resend response: { "id": "abc123..." }
```

✨ **Boa sorte!**
