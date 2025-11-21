# 📊 Setup Trading Economics API

## ✅ Pré-requisitos
- Conta no Trading Economics
- Cartão de crédito para pagamento
- API Key do plano pago

## 💰 Planos Disponíveis

| Plano | Custo | Requests/mês | Recomendado |
|-------|-------|--------------|-------------|
| Free | $0 | 3/dia (~90/mês) | ❌ Não (insuficiente) |
| Basic | $49 | 100.000 | ✅ SIM |
| Pro | $199 | 500.000 | ⚠️ Desnecessário |
| Enterprise | $899 | Ilimitado | ⚠️ Desnecessário |

**Escolher:** Basic ($49/mês)

## 📊 Consumo Estimado

### Função: updateMarketsCache
- Roda automaticamente a cada 10 minutos
- Requests por hora: 6
- Requests por dia: 144
- Requests por mês: ~4.320

### Margem de Segurança
- Limite do plano Basic: 100.000/mês
- Consumo previsto: 4.320/mês
- **Sobra: 95.680 requests (~96% disponível)**

## 🔧 Passo a Passo

### 1. Comprar API

1. Acesse: https://tradingeconomics.com/api/pricing
2. Clique em "Basic Plan" ($49/mês)
3. Crie conta ou faça login:
   - Email: [email do cliente]
   - Password: [escolher senha forte]
4. Preencha dados de pagamento
5. Finalize compra

### 2. Obter API Key

1. Após o pagamento, você será redirecionado para o Dashboard
2. Procure por "API Credentials" ou "API Access"
3. Você verá credenciais no formato: **usuario:senha**

Exemplo:
```
abc123xyz456:abc123xyz456
```

**IMPORTANTE:** As credenciais são iguais (usuario e senha são o mesmo valor)

4. Copie essas credenciais

### 3. Configurar no Projeto

1. Abrir arquivo: `functions/.env`
2. Localizar linha:
   ```
   TRADING_ECONOMICS_KEY=guest:guest
   ```
3. Substituir por suas credenciais:
   ```
   TRADING_ECONOMICS_KEY=abc123xyz456:abc123xyz456
   ```
4. Salvar arquivo

**ATENÇÃO:** Não commitar este arquivo no Git! Ele já está no .gitignore

### 4. Deploy

```bash
cd functions
firebase deploy --only functions:updateMarketsCache
```

Aguardar deploy finalizar (~2 minutos)

### 5. Verificar

#### 5.1 Ver Logs da Função

```bash
firebase functions:log --only updateMarketsCache
```

Procurar por:
```
✅ Calendário: XXX eventos salvos
📊 Modo API: PAGO
```

Se aparecer "GRATUITO", a configuração não funcionou.

#### 5.2 Verificar Cache no Firestore

1. Acesse: https://console.firebase.google.com
2. Ir em "Firestore Database"
3. Navegar para: `market_cache` → `economic_calendar`
4. Verificar campo `apiMode`: deve ser "PAID"
5. Verificar campo `updatedAt`: deve ser recente (últimos 10 minutos)

### 6. Testar no App

1. Abrir app AlanoCryptoFX
2. Ir em "Calendário Econômico"
3. Verificar eventos aparecendo
4. Testar abas:
   - Yesterday (ontem)
   - Today (hoje)
   - Tomorrow (amanhã)
5. Eventos devem carregar em 1-2 segundos

## 🔍 Como Funciona

### Arquitetura Completa

```
Trading Economics API
         ↓
Firebase Cloud Function (updateMarketsCache)
  ↓ (roda a cada 10 minutos)
  ↓
Faz 1 request para Trading Economics
  ↓ (busca 5 dias: 2 antes + hoje + 2 depois)
  ↓
Salva no Firestore (market_cache/economic_calendar)
  ↓ (cache válido por 10 minutos)
  ↓
Flutter App
  ↓ (lê do cache)
  ↓
Mostra para usuários
```

### Vantagens do Cache

1. **Economia de Requests**
   - Sem cache: 1 request por usuário
   - Com cache: 1 request para todos usuários
   - Se 1000 usuários acessam por dia = 1 request (vs 1000)

2. **Performance**
   - Usuário vê dados instantaneamente
   - Não espera request externo
   - App funciona offline (últimos dados)

3. **Confiabilidade**
   - Se Trading Economics cair, app continua funcionando
   - Dados ficam disponíveis por 10 minutos
   - Degradação gradual (não falha imediata)

## 🚨 Troubleshooting

### Problema: Erro "limit exceeded" nos logs

**Causa:** Ainda usando credenciais gratuitas (guest:guest)

**Soluções:**
1. Verificar se .env tem credenciais corretas
2. Fazer deploy novamente: `firebase deploy --only functions:updateMarketsCache`
3. Aguardar 10 minutos e verificar logs novamente

### Problema: Erro "unauthorized" ou "invalid credentials"

**Causa:** API Key incorreta

**Soluções:**
1. Verificar formato: `usuario:senha`
2. Copiar novamente do Trading Economics Dashboard
3. Garantir que não tem espaços antes/depois
4. Verificar se o plano foi ativado (pagamento processado)

### Problema: Calendário vazio no app

**Diagnóstico:**
```bash
# 1. Ver logs da função
firebase functions:log --only updateMarketsCache

# 2. Ver status no Firestore
# Acessar: console.firebase.google.com → Firestore
# Verificar: market_cache/economic_calendar
```

**Causas possíveis:**
1. Função não rodou ainda (aguardar 10 min)
2. Erro na função (ver logs)
3. Trading Economics sem eventos (raro)
4. Problema de conexão

### Problema: Dados desatualizados

**Diagnóstico:**
```bash
# Ver quando foi última atualização
firebase firestore:get market_cache/economic_calendar

# Ver se função está rodando
firebase functions:list
```

**Causa:** Função scheduled não está ativa

**Solução:**
1. Acesse: https://console.firebase.google.com
2. Ir em "Functions"
3. Procurar: `updateMarketsCache`
4. Status deve ser "Active"
5. Se não estiver, fazer deploy novamente

### Problema: App mostra "Modo Gratuito" mesmo após configurar

**Causa:** Deploy não foi feito ou .env não foi lido

**Solução:**
```bash
# 1. Verificar .env
cat functions/.env | grep TRADING_ECONOMICS_KEY

# Deve mostrar:
# TRADING_ECONOMICS_KEY=abc123...

# 2. Se estiver correto, fazer deploy
cd functions
firebase deploy --only functions:updateMarketsCache

# 3. Aguardar 10 minutos

# 4. Verificar logs
firebase functions:log --only updateMarketsCache

# Deve aparecer:
# 📊 Modo API: PAGO
```

## 📊 Monitoramento

### 1. Verificar Consumo Mensal

1. Login no Trading Economics: https://tradingeconomics.com
2. Ir em "Dashboard" ou "API Usage"
3. Ver requests usados no mês atual
4. Meta: <5.000/mês (5% do limite)

### 2. Alerts de Limite

Configure alertas para:
- 50% do limite (50.000 requests): ⚠️ Warning
- 80% do limite (80.000 requests): 🚨 Critical
- 95% do limite (95.000 requests): 🔴 Upgrade necessário

Caso atinja 95%, considerar:
- Aumentar intervalo da função (de 10 para 15 minutos)
- Upgrade para plano Pro ($199/mês)

### 3. Status Endpoint

Verificar status da API em tempo real:
```
https://us-central1-alanocryptofx-v2.cloudfunctions.net/checkApiStatus
```

Exemplo de resposta:
```json
{
  "tradingEconomics": {
    "configured": true,
    "mode": "PAID (100k requests/mês)",
    "key": "abc123xy..."
  },
  "cache": {
    "economicCalendar": {
      "lastUpdate": "2025-01-21T14:30:00.000Z",
      "eventsCount": 156,
      "apiMode": "PAID"
    }
  }
}
```

## 📈 Otimizações Futuras

### Se atingir limite de requests:

#### Opção 1: Aumentar intervalo
```javascript
// De: every 10 minutes
// Para: every 15 minutes

exports.updateMarketsCache = onSchedule({
  schedule: 'every 15 minutes',  // ← MUDAR AQUI
  timeZone: 'America/Sao_Paulo',
  retryCount: 3,
}, async (event) => {
  // ...
});
```

**Economia:** 33% menos requests (de 4.320 para 2.880/mês)

#### Opção 2: Cache mais longo
```javascript
// Salvar campo TTL no Firestore
await db.collection('market_cache').doc('economic_calendar').set({
  data: calendarData,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  ttl: 20,  // ← Cache válido por 20 minutos
  // ...
});
```

#### Opção 3: Upgrade de plano
- Plano Pro: $199/mês (500k requests)
- Só considerar se atingir >80k requests/mês
- Improvável com uso atual

## ✅ Checklist Final

Antes de considerar setup completo:

- [ ] Conta no Trading Economics criada
- [ ] Plano Basic ($49/mês) comprado
- [ ] Credenciais copiadas (formato: usuario:senha)
- [ ] .env atualizado com TRADING_ECONOMICS_KEY
- [ ] Deploy da Cloud Function feito
- [ ] Aguardado 10 minutos (função rodar)
- [ ] Logs verificados (Modo API: PAGO)
- [ ] Firestore verificado (apiMode: PAID)
- [ ] App testado (calendário carrega)
- [ ] Eventos aparecem nas 3 abas (Yesterday, Today, Tomorrow)

## 🎯 Resultado Final

Depois de tudo configurado:

✅ Calendário Econômico totalmente funcional
✅ Dados de 196 países
✅ Atualização automática a cada 10 minutos
✅ Alta performance (cache no Firestore)
✅ Confiabilidade (funciona mesmo se API cair)
✅ Custo: apenas $49/mês
✅ Margem de segurança: 96% do limite sobrando

## 📚 Recursos Adicionais

- **Trading Economics Docs:** https://docs.tradingeconomics.com
- **API Reference:** https://docs.tradingeconomics.com/economic_calendar/
- **Support:** support@tradingeconomics.com
- **Dashboard:** https://tradingeconomics.com/analytics/api

---

**Dúvidas sobre configuração?**
Consulte os logs ou acesse o endpoint de status.
