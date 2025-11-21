# 📧 Setup Email Profissional - AlanoCryptoFX

## ✅ Pré-requisitos
- Domínio: alanocryptofx.com (já registrado no Hostinger)
- Conta no Resend: https://resend.com (gratuita)
- Email profissional desejado: suporte@alanocryptofx.com

## 💰 Custos

| Item | Custo | Status |
|------|-------|--------|
| Domínio (Hostinger) | ~R$ 40/ano | ✅ Já tem |
| Email Profissional (Hostinger) | R$ 5,99/mês | ⚠️ Cliente precisa comprar |
| Resend API | Grátis (3.000 emails/mês) | ✅ Suficiente |

**Total mensal:** R$ 5,99

## 🔧 Passo a Passo Completo

### 1. Comprar Email Profissional no Hostinger

1. Login no Hostinger: https://www.hostinger.com.br
2. Ir em "Emails" → "Email Profissional"
3. Selecionar o domínio: alanocryptofx.com
4. Escolher plano "Email Starter" (R$ 5,99/mês)
5. Criar email: suporte@alanocryptofx.com
6. Finalizar compra

### 2. Adicionar Domínio no Resend

1. Login no Resend: https://resend.com
2. Ir em "Domains" → "Add Domain"
3. Digitar: alanocryptofx.com
4. Clicar "Add Domain"
5. **NÃO feche a página** - você vai precisar dos registros DNS

### 3. Copiar Registros DNS do Resend

O Resend vai mostrar algo assim:

```
MX Record:
  Name: @
  Value: mail.resend.com
  Priority: 10

TXT Record (DKIM):
  Name: @
  Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...

CNAME Record:
  Name: em._domainkey
  Value: em.resend.com
```

**COPIE TODOS!** Você vai precisar no próximo passo.

### 4. Configurar DNS no Hostinger

1. No Hostinger, ir em "Domínios" → "alanocryptofx.com"
2. Clicar em "DNS / Name Servers"
3. Clicar "Gerenciar Registros DNS"

#### 4.1 Adicionar MX Record
1. Clicar "Adicionar Registro"
2. Tipo: MX
3. Nome: @ (ou deixar vazio)
4. Valor: mail.resend.com
5. Prioridade: 10
6. TTL: 3600
7. Salvar

#### 4.2 Adicionar TXT Record (DKIM)
1. Clicar "Adicionar Registro"
2. Tipo: TXT
3. Nome: @ (ou deixar vazio)
4. Valor: Colar o valor DKIM copiado do Resend
   - Começa com: v=DKIM1; k=rsa; p=...
5. TTL: 3600
6. Salvar

#### 4.3 Adicionar CNAME Record
1. Clicar "Adicionar Registro"
2. Tipo: CNAME
3. Nome: em._domainkey
4. Valor: em.resend.com
5. TTL: 3600
6. Salvar

### 5. Aguardar Propagação DNS

⏱️ **Tempo:** 24-48 horas (geralmente 2-4 horas)

Para verificar se propagou:
1. Acesse: https://mxtoolbox.com/SuperTool.aspx
2. Digite: alanocryptofx.com
3. Selecione "MX Lookup"
4. Deve aparecer: mail.resend.com

### 6. Verificar no Resend

1. Voltar no Resend: https://resend.com/domains
2. Procurar domínio: alanocryptofx.com
3. Clicar "Verify DNS Records"
4. Status deve mudar de "Pending" para **"Verified" ✅**

Se não verificar:
- Aguardar mais algumas horas
- Verificar se registros DNS foram adicionados corretamente
- Tentar "Refresh" no Resend

### 7. Configurar no Projeto

1. Abrir arquivo: `functions/.env`
2. Localizar linha:
   ```
   EMAIL_FROM=onboarding@resend.dev
   ```
3. Trocar para:
   ```
   EMAIL_FROM=suporte@alanocryptofx.com
   ```
4. Salvar arquivo

### 8. Deploy da Cloud Function

```bash
cd functions
firebase deploy --only functions
```

Aguardar deploy finalizar (~2 minutos)

### 9. Testar

#### Teste 1: Verificação de Email no Cadastro
1. Fazer cadastro novo no app
2. Verificar se email chega
3. Remetente deve ser: suporte@alanocryptofx.com
4. Email **NÃO deve ir pra spam** ✅

#### Teste 2: Notificação de Sinal
1. Criar um sinal no admin
2. Verificar se email de notificação chega
3. Remetente: suporte@alanocryptofx.com

## 🔍 Como Funciona

### Fluxo Completo
```
Flutter App
  ↓
Firebase Cloud Function
  ↓
Resend API (via suporte@alanocryptofx.com)
  ↓
DNS do Hostinger (validação DKIM/SPF)
  ↓
Email do Usuário (Gmail, Outlook, etc.)
  ↓
✅ Inbox (NÃO vai pra spam!)
```

### Por que não vai pra spam?
- **DKIM configurado**: Prova que email é autêntico
- **SPF configurado**: Autoriza Resend a enviar emails
- **Domínio verificado**: Resend confirma que você é dono
- **Reputação do Resend**: Servidor com boa reputação

## 🚨 Troubleshooting

### Problema: DNS não verifica no Resend

**Solução 1:** Aguardar mais tempo
- DNS pode levar até 48h para propagar
- Tentar novamente amanhã

**Solução 2:** Verificar registros
```bash
# Verificar MX
nslookup -type=MX alanocryptofx.com

# Verificar TXT (DKIM)
nslookup -type=TXT alanocryptofx.com

# Verificar CNAME
nslookup -type=CNAME em._domainkey.alanocryptofx.com
```

**Solução 3:** Recriar registros
- Deletar registros DNS incorretos
- Adicionar novamente com valores do Resend

### Problema: Email vai pra spam

**Causas:**
1. DNS não está configurado corretamente
2. Ainda usando onboarding@resend.dev
3. Email do usuário marcou como spam

**Soluções:**
1. Verificar DKIM no Resend (deve estar verde ✅)
2. Confirmar EMAIL_FROM está: suporte@alanocryptofx.com
3. Pedir usuário marcar como "Não é spam"

### Problema: Erro "Domain not verified"

**Causa:** Deploy feito antes de verificar domínio

**Solução:**
1. Verificar domínio no Resend primeiro
2. Depois fazer deploy novamente
3. Testar cadastro

### Problema: Email não chega

**Debug:**
```bash
# Ver logs da função
firebase functions:log --only sendEmailVerification

# Procurar por:
# ✅ Email enviado com sucesso
# ❌ Erro ao enviar email
```

**Causas possíveis:**
1. RESEND_API_KEY incorreta ou não configurada
2. Limite de emails grátis atingido (3.000/mês)
3. Email do destinatário inválido

## 📊 Monitoramento

### Verificar Quantos Emails Foram Enviados

1. Acesse: https://resend.com/emails
2. Ver emails enviados hoje/semana/mês
3. Limite gratuito: 3.000/mês
4. Se atingir limite, upgrade para plano pago

### Verificar Taxa de Entrega

1. No Resend, ir em "Analytics"
2. Métricas importantes:
   - **Delivered**: % de emails entregues
   - **Bounced**: Emails rejeitados
   - **Spam**: Emails marcados como spam

Meta:
- Delivered: >95%
- Bounced: <2%
- Spam: <0.1%

## ✅ Checklist Final

Antes de considerar setup completo:

- [ ] Email profissional comprado no Hostinger
- [ ] Domínio adicionado no Resend
- [ ] 3 registros DNS configurados (MX, TXT, CNAME)
- [ ] DNS propagado (aguardar 24-48h)
- [ ] Domínio verificado no Resend (status: Verified ✅)
- [ ] .env atualizado com EMAIL_FROM correto
- [ ] Deploy da Cloud Function feito
- [ ] Teste de cadastro realizado
- [ ] Email recebido com remetente correto
- [ ] Email NÃO foi pra spam

## 🎯 Resultado Final

Depois de tudo configurado:

✅ Emails enviados de: **suporte@alanocryptofx.com**
✅ Alta taxa de entrega (não vai pra spam)
✅ Aparência profissional
✅ Confiança dos usuários aumenta
✅ Custo: apenas R$ 5,99/mês

---

**Dúvidas?**
- Resend Docs: https://resend.com/docs
- Hostinger Support: https://www.hostinger.com.br/suporte
