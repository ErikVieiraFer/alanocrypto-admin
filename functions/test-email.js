/**
 * Script de teste para enviar email de verificação
 *
 * Como usar:
 * 1. cd functions
 * 2. node test-email.js seu-email@gmail.com
 */

const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Carregar .env manualmente
let RESEND_API_KEY = process.env.RESEND_API_KEY;
let EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key === 'RESEND_API_KEY') RESEND_API_KEY = value;
        if (key === 'EMAIL_FROM') EMAIL_FROM = value;
      }
    });
  }
} catch (error) {
  console.error('⚠️ Aviso: não foi possível ler .env:', error.message);
}

// Validar argumentos
const email = process.argv[2];
if (!email) {
  console.error('❌ Uso: node test-email.js seu-email@gmail.com');
  process.exit(1);
}

// Validar API Key
if (!RESEND_API_KEY || RESEND_API_KEY === 'USUARIO_VAI_COLAR_AQUI') {
  console.error('❌ RESEND_API_KEY não configurada no arquivo .env');
  console.error('');
  console.error('Configure o arquivo functions/.env:');
  console.error('RESEND_API_KEY=re_SUA_CHAVE_AQUI');
  console.error('');
  console.error('Obtenha sua chave em: https://resend.com/api-keys');
  process.exit(1);
}

console.log('🚀 Iniciando teste de envio de email...');
console.log('');
console.log('📧 Para:', email);
console.log('📤 De:', EMAIL_FROM);
console.log('🔑 API Key:', RESEND_API_KEY.substring(0, 10) + '...');
console.log('');

// Inicializar Resend
const resend = new Resend(RESEND_API_KEY);

// Gerar código de teste
const code = Math.floor(100000 + Math.random() * 900000).toString();
console.log('🔢 Código gerado:', code);
console.log('');

// Template HTML
const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #0a0a0a;
          color: #ffffff;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #1a1a1a;
        }
        .header {
          background: linear-gradient(135deg, #00ff01 0%, #00cc01 100%);
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #0a0a0a;
          font-size: 28px;
          font-weight: bold;
        }
        .content {
          padding: 40px 20px;
          text-align: center;
        }
        .code-container {
          background-color: #0a0a0a;
          border: 2px solid #00ff01;
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
        }
        .code {
          font-size: 48px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #00ff01;
          font-family: 'Courier New', monospace;
        }
        .test-badge {
          background-color: #ff6b6b;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          display: inline-block;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 AlanoCryptoFX</h1>
        </div>
        <div class="content">
          <div class="test-badge">
            🧪 EMAIL DE TESTE
          </div>
          <h2 style="color: #00ff01;">Código de Verificação</h2>
          <p style="font-size: 16px; color: #cccccc;">
            Este é um email de teste do sistema de verificação.
          </p>
          <div class="code-container">
            <div class="code">${code}</div>
          </div>
          <p style="font-size: 14px; color: #888;">
            ✅ Se você recebeu este email, o sistema está funcionando corretamente!
          </p>
        </div>
      </div>
    </body>
  </html>
`;

// Enviar email
console.log('📮 Enviando email...');

resend.emails.send({
  from: EMAIL_FROM,
  to: email,
  subject: '🧪 [TESTE] Código de Verificação - AlanoCryptoFX',
  html: htmlContent,
})
.then((result) => {
  console.log('');
  console.log('✅ EMAIL ENVIADO COM SUCESSO!');
  console.log('');
  console.log('📬 Resend Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('');
  console.log('🎉 Verificações:');
  console.log('  ✓ API Key está válida');
  console.log('  ✓ Resend está funcionando');
  console.log('  ✓ Email foi enviado');
  console.log('');
  console.log('📥 Próximos passos:');
  console.log('  1. Verifique sua caixa de entrada:', email);
  console.log('  2. Se não encontrar, verifique SPAM/Lixo Eletrônico');
  console.log('  3. O código é:', code);
  console.log('');
  console.log('💡 Dica: Marque como "não é spam" para futuros emails');
  console.log('');
})
.catch((error) => {
  console.error('');
  console.error('❌ ERRO AO ENVIAR EMAIL');
  console.error('');
  console.error('Tipo:', error.constructor.name);
  console.error('Mensagem:', error.message);
  console.error('');

  if (error.message.includes('API key')) {
    console.error('🔧 Solução:');
    console.error('  1. Verifique se a API Key está correta no .env');
    console.error('  2. Gere uma nova em: https://resend.com/api-keys');
    console.error('  3. Copie a chave completa (começa com re_)');
  } else if (error.message.includes('invalid email')) {
    console.error('🔧 Solução:');
    console.error('  1. Verifique se o email está correto');
    console.error('  2. Use um email real (não temporário)');
  } else if (error.message.includes('rate limit')) {
    console.error('🔧 Solução:');
    console.error('  1. Aguarde alguns minutos');
    console.error('  2. Plano gratuito: 100 emails/dia');
    console.error('  3. Verifique: https://resend.com/emails');
  } else {
    console.error('🔧 Solução:');
    console.error('  1. Verifique a conexão com internet');
    console.error('  2. Verifique o status: https://status.resend.com');
    console.error('  3. Veja logs completos acima');
  }

  console.error('');
  process.exit(1);
});
