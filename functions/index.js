const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// Configurar Resend
// IMPORTANTE: Cole sua API Key da Resend aqui ou no arquivo .env
const resend = new Resend(process.env.RESEND_API_KEY || 'USUARIO_VAI_COLAR_AQUI');
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

admin.initializeApp();

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE VERIFICAÇÃO DE EMAIL
// ═══════════════════════════════════════════════════════════

// Enviar código de verificação de email
exports.sendEmailVerification = onCall(async (request) => {
  try {
    const { email, displayName } = request.data;

    if (!email) {
      throw new Error('Email é obrigatório');
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 10 * 60 * 1000 // 10 minutos
    );

    // Salvar no Firestore
    await admin.firestore().collection('email_verifications').add({
      email,
      code,
      createdAt: now,
      expiresAt,
      verified: false,
    });

    // Template HTML do email
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
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
              color: #cccccc;
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
            .expiration {
              color: #ff6b6b;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              padding: 20px;
              text-align: center;
              color: #666666;
              font-size: 12px;
              border-top: 1px solid #333333;
            }
            .warning {
              background-color: #2a2a2a;
              border-left: 4px solid #ff6b6b;
              padding: 15px;
              margin: 20px 0;
              text-align: left;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 AlanoCryptoFX</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Olá${displayName ? ` ${displayName}` : ''}! 👋
              </div>
              <p style="font-size: 16px; color: #cccccc;">
                Use o código abaixo para verificar seu email:
              </p>
              <div class="code-container">
                <div class="code">${code}</div>
                <div class="expiration">
                  ⏱️ Este código expira em 10 minutos
                </div>
              </div>
              <div class="warning">
                <strong>⚠️ Segurança:</strong><br>
                Nunca compartilhe este código com ninguém. Nossa equipe nunca pedirá este código por telefone, email ou qualquer outro meio.
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} AlanoCryptoFX. Todos os direitos reservados.</p>
              <p>Este é um email automático, por favor não responda.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Enviar email
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: '🔒 Código de Verificação - AlanoCryptoFX',
      html: htmlContent,
    });

    console.log(`✅ Email de verificação enviado para: ${email}`);

    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email de verificação:', error);
    throw new Error('Erro ao enviar email de verificação: ' + error.message);
  }
});

// Verificar código de email
exports.verifyEmailCode = onCall(async (request) => {
  try {
    const { email, code } = request.data;

    if (!email || !code) {
      throw new Error('Email e código são obrigatórios');
    }

    // Buscar código no Firestore
    const verificationsSnapshot = await admin.firestore()
      .collection('email_verifications')
      .where('email', '==', email)
      .where('code', '==', code)
      .where('verified', '==', false)
      .get();

    if (verificationsSnapshot.empty) {
      throw new Error('Código inválido ou já utilizado');
    }

    const verificationDoc = verificationsSnapshot.docs[0];
    const verificationData = verificationDoc.data();

    // Verificar se expirou
    const now = admin.firestore.Timestamp.now();
    if (now.toMillis() > verificationData.expiresAt.toMillis()) {
      throw new Error('Código expirado. Solicite um novo código.');
    }

    // Marcar como verificado
    await verificationDoc.ref.update({
      verified: true,
      verifiedAt: now,
    });

    console.log(`✅ Email verificado com sucesso: ${email}`);

    return { success: true, verified: true };
  } catch (error) {
    console.error('❌ Erro ao verificar código:', error);
    throw new Error(error.message || 'Erro ao verificar código');
  }
});

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE NOTIFICAÇÃO (Push + Email)
// ═══════════════════════════════════════════════════════════

// Enviar notificação quando novo sinal é criado
exports.onSignalCreated = onDocumentCreated('signals/{signalId}', async (event) => {
    try {
      const signal = event.data.data();

      console.log('🚀 Novo sinal criado:', signal.coin);

      // Buscar usuários com notificações ativas
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('notificationsEnabled', '==', true)
        .where('approved', '==', true)
        .get();

      if (usersSnapshot.empty) {
        console.log('⚠️ Nenhum usuário com notificações ativas');
        return null;
      }

      // Coletar tokens
      const tokens = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      });

      if (tokens.length === 0) {
        console.log('⚠️ Nenhum token FCM encontrado');
        return null;
      }

      console.log(`📱 Enviando para ${tokens.length} usuários`);

      // Preparar mensagem
      const typeEmoji = signal.type === 'long' ? '📈' : '📉';
      const typeName = signal.type === 'long' ? 'LONG' : 'SHORT';

      const message = {
        notification: {
          title: `${typeEmoji} Novo Sinal: ${signal.coin}`,
          body: `${typeName} - Entrada: ${signal.entry}`,
        },
        data: {
          type: 'signal',
          signalId: event.params.signalId,
          coin: signal.coin,
          signalType: signal.type,
        },
      };

      // Enviar notificação em lote
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        ...message,
      });

      console.log(`✅ Enviado: ${response.successCount} sucesso, ${response.failureCount} falhas`);

      // Limpar tokens inválidos
      if (response.failureCount > 0) {
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            tokensToRemove.push(tokens[idx]);
          }
        });

        // Remover tokens inválidos do Firestore
        const batch = admin.firestore().batch();
        for (const token of tokensToRemove) {
          const userQuery = await admin.firestore()
            .collection('users')
            .where('fcmToken', '==', token)
            .get();

          userQuery.forEach(doc => {
            batch.update(doc.ref, { fcmToken: admin.firestore.FieldValue.delete() });
          });
        }
        await batch.commit();
        console.log(`🧹 ${tokensToRemove.length} tokens inválidos removidos`);
      }

      // ═══════════════════════════════════════════════════════════
      // ENVIAR EMAILS PARA USUÁRIOS COM EMAIL NOTIFICATIONS ATIVO
      // ═══════════════════════════════════════════════════════════

      // Buscar usuários com notificações de email ativas
      const emailUsersSnapshot = await admin.firestore()
        .collection('users')
        .where('emailNotifications', '==', true)
        .where('approved', '==', true)
        .get();

      if (!emailUsersSnapshot.empty) {
        const emails = [];
        emailUsersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.email) {
            emails.push(userData.email);
          }
        });

        if (emails.length > 0) {
          console.log(`📧 Enviando emails para ${emails.length} usuários`);

          // Preparar alvos formatados
          const targetsHtml = signal.targets && signal.targets.length > 0
            ? signal.targets.map((target, idx) => `
                <div style="padding: 8px 0; border-bottom: 1px solid #333;">
                  <strong>Alvo ${idx + 1}:</strong> ${target}
                </div>
              `).join('')
            : '<div style="padding: 8px 0;">Nenhum alvo definido</div>';

          // Template HTML do email
          const emailHtml = `
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
                    background: linear-gradient(135deg, ${signal.type === 'long' ? '#00ff01' : '#ff0000'} 0%, ${signal.type === 'long' ? '#00cc01' : '#cc0000'} 100%);
                    padding: 40px 20px;
                    text-align: center;
                  }
                  .header h1 {
                    margin: 0;
                    color: #0a0a0a;
                    font-size: 32px;
                    font-weight: bold;
                  }
                  .signal-type {
                    display: inline-block;
                    padding: 8px 16px;
                    background-color: rgba(0,0,0,0.2);
                    border-radius: 20px;
                    margin-top: 10px;
                    font-size: 14px;
                    font-weight: bold;
                  }
                  .content {
                    padding: 30px 20px;
                  }
                  .signal-info {
                    background-color: #0a0a0a;
                    border: 2px solid ${signal.type === 'long' ? '#00ff01' : '#ff0000'};
                    border-radius: 12px;
                    padding: 20px;
                    margin: 20px 0;
                  }
                  .info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid #333;
                  }
                  .info-row:last-child {
                    border-bottom: none;
                  }
                  .info-label {
                    color: #888;
                    font-size: 14px;
                  }
                  .info-value {
                    color: ${signal.type === 'long' ? '#00ff01' : '#ff0000'};
                    font-weight: bold;
                    font-size: 16px;
                  }
                  .targets-section {
                    background-color: #2a2a2a;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                  }
                  .targets-title {
                    color: #00ff01;
                    font-weight: bold;
                    margin-bottom: 10px;
                  }
                  .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #00ff01 0%, #00cc01 100%);
                    color: #0a0a0a;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    margin: 20px 0;
                    transition: transform 0.2s;
                  }
                  .button:hover {
                    transform: translateY(-2px);
                  }
                  .risk-warning {
                    background-color: #2a2a2a;
                    border-left: 4px solid #ff6b6b;
                    padding: 15px;
                    margin: 20px 0;
                    font-size: 13px;
                    color: #cccccc;
                  }
                  .footer {
                    padding: 20px;
                    text-align: center;
                    color: #666666;
                    font-size: 12px;
                    border-top: 1px solid #333333;
                  }
                  .footer a {
                    color: #00ff01;
                    text-decoration: none;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>${typeEmoji} ${signal.coin}</h1>
                    <div class="signal-type">${typeName}</div>
                  </div>
                  <div class="content">
                    <h2 style="color: #00ff01; margin-top: 0;">Novo Sinal Disponível!</h2>
                    <p style="color: #cccccc;">Um novo sinal de trading foi publicado. Confira os detalhes abaixo:</p>

                    <div class="signal-info">
                      <div class="info-row">
                        <span class="info-label">Moeda</span>
                        <span class="info-value">${signal.coin}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Tipo</span>
                        <span class="info-value">${typeName}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Entrada</span>
                        <span class="info-value">${signal.entry}</span>
                      </div>
                      ${signal.stopLoss ? `
                      <div class="info-row">
                        <span class="info-label">Stop Loss</span>
                        <span class="info-value" style="color: #ff6b6b;">${signal.stopLoss}</span>
                      </div>
                      ` : ''}
                    </div>

                    ${signal.targets && signal.targets.length > 0 ? `
                    <div class="targets-section">
                      <div class="targets-title">🎯 Alvos (Targets)</div>
                      ${targetsHtml}
                    </div>
                    ` : ''}

                    <div style="text-align: center;">
                      <a href="https://alanocryptofx-v2.web.app" class="button">Ver no App</a>
                    </div>

                    <div class="risk-warning">
                      <strong>⚠️ Aviso de Risco:</strong><br>
                      Trading de criptomoedas envolve riscos significativos. Nunca invista mais do que você pode perder. Este sinal não constitui aconselhamento financeiro.
                    </div>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} AlanoCryptoFX. Todos os direitos reservados.</p>
                    <p><a href="https://alanocryptofx-v2.web.app/settings">Desativar notificações por email</a></p>
                  </div>
                </div>
              </body>
            </html>
          `;

          // Enviar emails (um por vez para evitar rate limiting)
          let emailsSent = 0;
          for (const email of emails) {
            try {
              await resend.emails.send({
                from: EMAIL_FROM,
                to: email,
                subject: `${typeEmoji} Novo Sinal: ${signal.coin} (${typeName})`,
                html: emailHtml,
              });
              emailsSent++;
            } catch (emailError) {
              console.error(`❌ Erro ao enviar email para ${email}:`, emailError);
            }
          }

          console.log(`✅ ${emailsSent} emails enviados com sucesso`);
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao enviar notificações:', error);
      return null;
    }
  });

// Enviar notificação quando novo post do Alano é criado
exports.onAlanoPostCreated = onDocumentCreated('alano_posts/{postId}', async (event) => {
    try {
      const post = event.data.data();

      console.log('📝 Novo post do Alano:', post.title);

      // Buscar usuários
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('notificationsEnabled', '==', true)
        .where('approved', '==', true)
        .get();

      if (usersSnapshot.empty) {
        return null;
      }

      const tokens = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      });

      if (tokens.length === 0) {
        return null;
      }

      console.log(`📱 Enviando para ${tokens.length} usuários`);

      const message = {
        notification: {
          title: '📝 Novo Post do Alano!',
          body: post.title,
        },
        data: {
          type: 'post',
          postId: event.params.postId,
          title: post.title,
        },
      };

      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        ...message,
      });

      console.log(`✅ Enviado: ${response.successCount} sucesso, ${response.failureCount} falhas`);

      // ═══════════════════════════════════════════════════════════
      // ENVIAR EMAILS PARA USUÁRIOS COM EMAIL NOTIFICATIONS ATIVO
      // ═══════════════════════════════════════════════════════════

      // Buscar usuários com notificações de email ativas
      const emailUsersSnapshot = await admin.firestore()
        .collection('users')
        .where('emailNotifications', '==', true)
        .where('approved', '==', true)
        .get();

      if (!emailUsersSnapshot.empty) {
        const emails = [];
        emailUsersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.email) {
            emails.push(userData.email);
          }
        });

        if (emails.length > 0) {
          console.log(`📧 Enviando emails para ${emails.length} usuários`);

          // Template HTML do email
          const emailHtml = `
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
                    padding: 30px 20px;
                  }
                  .post-title {
                    color: #00ff01;
                    font-size: 24px;
                    font-weight: bold;
                    margin: 20px 0;
                  }
                  .post-content {
                    background-color: #0a0a0a;
                    border-left: 4px solid #00ff01;
                    padding: 20px;
                    margin: 20px 0;
                    line-height: 1.6;
                    color: #cccccc;
                    white-space: pre-wrap;
                  }
                  .video-section {
                    background-color: #2a2a2a;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                  }
                  .video-link {
                    display: inline-block;
                    background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
                    color: #ffffff;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    margin-top: 10px;
                    transition: transform 0.2s;
                  }
                  .video-link:hover {
                    transform: translateY(-2px);
                  }
                  .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #00ff01 0%, #00cc01 100%);
                    color: #0a0a0a;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    margin: 20px 0;
                    transition: transform 0.2s;
                  }
                  .button:hover {
                    transform: translateY(-2px);
                  }
                  .footer {
                    padding: 20px;
                    text-align: center;
                    color: #666666;
                    font-size: 12px;
                    border-top: 1px solid #333333;
                  }
                  .footer a {
                    color: #00ff01;
                    text-decoration: none;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>📝 AlanoCryptoFX</h1>
                  </div>
                  <div class="content">
                    <h2 style="color: #00ff01; margin-top: 0;">Novo Post do Alano!</h2>

                    <div class="post-title">
                      ${post.title}
                    </div>

                    ${post.content ? `
                    <div class="post-content">
                      ${post.content}
                    </div>
                    ` : ''}

                    ${post.videoUrl ? `
                    <div class="video-section">
                      <div style="color: #cccccc; margin-bottom: 10px;">
                        🎥 Este post contém um vídeo
                      </div>
                      <a href="${post.videoUrl}" class="video-link" target="_blank">Assistir Vídeo</a>
                    </div>
                    ` : ''}

                    <div style="text-align: center;">
                      <a href="https://alanocryptofx-v2.web.app" class="button">Ver no App</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} AlanoCryptoFX. Todos os direitos reservados.</p>
                    <p><a href="https://alanocryptofx-v2.web.app/settings">Desativar notificações por email</a></p>
                  </div>
                </div>
              </body>
            </html>
          `;

          // Enviar emails (um por vez para evitar rate limiting)
          let emailsSent = 0;
          for (const email of emails) {
            try {
              await resend.emails.send({
                from: EMAIL_FROM,
                to: email,
                subject: `📝 ${post.title} - AlanoCryptoFX`,
                html: emailHtml,
              });
              emailsSent++;
            } catch (emailError) {
              console.error(`❌ Erro ao enviar email para ${email}:`, emailError);
            }
          }

          console.log(`✅ ${emailsSent} emails enviados com sucesso`);
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao enviar notificações:', error);
      return null;
    }
  });
