const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall, onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const axios = require('axios');
const cors = require('cors')({origin: true});

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
  console.log('🔵 [sendEmailVerification] Iniciando...');

  try {
    const { email, displayName } = request.data;

    console.log('📧 Email:', email);
    console.log('👤 Nome:', displayName);

    if (!email) {
      console.error('❌ Email não fornecido');
      throw new Error('Email é obrigatório');
    }

    // Verificar se API Key está configurada
    const apiKey = process.env.RESEND_API_KEY;
    console.log('🔑 API Key configurada:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NÃO CONFIGURADA');

    if (!apiKey || apiKey === 'USUARIO_VAI_COLAR_AQUI') {
      console.error('❌ RESEND_API_KEY não configurada!');
      throw new Error('API Key da Resend não configurada. Configure no arquivo .env');
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔢 Código gerado:', code);

    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 10 * 60 * 1000 // 10 minutos
    );

    // Salvar no Firestore
    console.log('💾 Salvando código no Firestore...');
    await admin.firestore().collection('email_verifications').add({
      email,
      code,
      createdAt: now,
      expiresAt,
      verified: false,
    });
    console.log('✅ Código salvo no Firestore com sucesso');

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
    console.log('📮 Enviando email via Resend...');
    console.log('📤 De:', EMAIL_FROM);
    console.log('📥 Para:', email);

    try {
      const result = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: '🔒 Código de Verificação - AlanoCryptoFX',
        html: htmlContent,
      });

      console.log('✅ Email enviado com sucesso!');
      console.log('📬 Resend response:', JSON.stringify(result, null, 2));

      return { success: true, messageId: result.id };
    } catch (emailError) {
      console.error('❌ ERRO ao enviar email via Resend:', emailError);
      console.error('❌ Tipo de erro:', emailError.constructor.name);
      console.error('❌ Mensagem:', emailError.message);
      console.error('❌ Stack:', emailError.stack);
      throw emailError;
    }
  } catch (error) {
    console.error('❌ ERRO GERAL na função sendEmailVerification:', error);
    console.error('❌ Tipo de erro:', error.constructor.name);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Stack:', error.stack);
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

// Deletar usuário do Authentication e Firestore
exports.deleteUser = onCall(async (request) => {
  try {
    const { userId } = request.data;

    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    // Verificar se usuário que está fazendo a requisição é admin
    // (Você pode adicionar verificação de permissão aqui se necessário)

    try {
      // 1. Deletar do Firebase Authentication
      await admin.auth().deleteUser(userId);
      console.log(`✅ Usuário deletado do Authentication: ${userId}`);
    } catch (authError) {
      console.warn(`⚠️ Erro ao deletar do Authentication (pode não existir): ${authError.message}`);
    }

    try {
      // 2. Deletar do Firestore
      await admin.firestore().collection('users').doc(userId).delete();
      console.log(`✅ Usuário deletado do Firestore: ${userId}`);
    } catch (firestoreError) {
      console.warn(`⚠️ Erro ao deletar do Firestore: ${firestoreError.message}`);
    }

    return { success: true, message: 'Usuário deletado com sucesso' };
  } catch (error) {
    console.error('❌ Erro ao deletar usuário:', error);
    throw new Error('Erro ao deletar usuário: ' + error.message);
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
    const postId = event.params.postId;
    const postRef = event.data.ref;
    const post = event.data.data();

    console.log(`📝 Novo post do Alano: ${post.title}`);

    // Proteção anti-duplicação com transação atômica
    const alreadyProcessed = await admin.firestore().runTransaction(async (transaction) => {
      const postDoc = await transaction.get(postRef);
      const postData = postDoc.data();

      if (postData.notificationsProcessed === true || postData.notificationSent === true) {
        console.log('⚠️ Notificações já processadas, ignorando');
        return true;
      }

      transaction.update(postRef, {
        notificationsProcessed: true,
        notificationSent: true,
        notificationsProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return false;
    });

    if (alreadyProcessed) {
      return null;
    }

    console.log('✅ Post marcado como processado');

    // ═══════════════════════════════════════════════════════════
    // CRIAR 1 NOTIFICAÇÃO GLOBAL COMPARTILHADA (Em vez de 360)
    // ═══════════════════════════════════════════════════════════

    await admin.firestore().collection('global_notifications').doc(postId).set({
      type: 'alano_post',
      title: '📝 Novo Post do Alano',
      content: post.title,
      postId: postId,
      imageUrl: post.imageUrl || null,
      videoUrl: post.videoUrl || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      relatedCollection: 'alano_posts',
    });

    console.log('✅ 1 notificação global criada (compartilhada por todos)');

    // ═══════════════════════════════════════════════════════════
    // ENVIAR PUSH NOTIFICATIONS (Igual antes)
    // ═══════════════════════════════════════════════════════════

    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('approved', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('⚠️ Nenhum usuário aprovado');
      return null;
    }

    const tokens = new Set();
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      if (userData.fcmToken && userData.notificationsEnabled) {
        tokens.add(userData.fcmToken);
      }
    });

    const uniqueTokens = Array.from(tokens);

    if (uniqueTokens.length > 0) {
      console.log(`📱 Enviando push para ${uniqueTokens.length} dispositivos`);

      const response = await admin.messaging().sendEachForMulticast({
        tokens: uniqueTokens,
        data: {
          type: 'alano_post',
          postId: postId,
          title: post.title,
          body: post.title,
          notificationTitle: '📝 Novo Post do Alano',
        },
        android: { priority: 'high' },
        apns: {
          payload: {
            aps: {
              'content-available': 1,
              'thread-id': postId,
            },
          },
        },
        webpush: { headers: { Urgency: 'high' } },
      });

      console.log(`✅ Push: ${response.successCount} sucesso, ${response.failureCount} falhas`);

      if (response.failureCount > 0) {
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            tokensToRemove.push(uniqueTokens[idx]);
          }
        });

        if (tokensToRemove.length > 0) {
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
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Erro:', error);
    return null;
  }
});

// Enviar notificação quando usuário é mencionado no chat
exports.onChatMessageCreated = onDocumentCreated('chat_messages/{messageId}', async (event) => {
  const messageId = event.params.messageId;
  const messageData = event.data.data();

  console.log(`📬 Nova mensagem criada: ${messageId}`);

  if (!messageData.mentions || messageData.mentions.length === 0) {
    console.log('⚠️ Mensagem sem menções, função encerrada');
    return null;
  }

  console.log(`📝 Mensagem tem ${messageData.mentions.length} menção(ões)`);

  try {
    const senderName = messageData.userName || 'Alguém';
    const senderId = messageData.userId;
    const messageText = messageData.text || '';
    const mentionedUserIds = messageData.mentions.map(m => m.userId);

    console.log(`👥 Usuários mencionados: ${mentionedUserIds.join(', ')}`);

    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', mentionedUserIds)
      .get();

    if (usersSnapshot.empty) {
      console.log('⚠️ Nenhum usuário encontrado com os IDs mencionados');
      return null;
    }

    console.log(`✅ Encontrados ${usersSnapshot.size} usuário(s) no Firestore`);

    const notificationPromises = [];
    let successCount = 0;
    let errorCount = 0;

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;
      const userId = userDoc.id;

      if (userId === senderId) {
        console.log(`⚠️ Pulando ${userId} (não notificar a si mesmo)`);
        return;
      }

      if (!fcmToken) {
        console.log(`⚠️ Usuário ${userId} não tem FCM token registrado`);
        errorCount++;
        return;
      }

      console.log(`📤 Preparando notificação para ${userId} (${userData.displayName || 'sem nome'})`);

      const truncatedText = messageText.length > 100
        ? `${messageText.substring(0, 100)}...`
        : messageText;

      const notification = {
        token: fcmToken,
        notification: {
          title: `💬 ${senderName} mencionou você`,
          body: truncatedText,
        },
        data: {
          type: 'mention',
          messageId: messageId,
          senderId: senderId,
          senderName: senderName,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'chat_mentions',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon.png',
            badge: '/badge.png',
          },
        },
      };

      const promise = admin.messaging().send(notification)
        .then((response) => {
          console.log(`✅ Notificação enviada com sucesso para ${userId}: ${response}`);
          successCount++;
          return response;
        })
        .catch((error) => {
          console.error(`❌ Erro ao enviar notificação para ${userId}:`, error);

          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            console.log(`🗑️ Removendo FCM token inválido de ${userId}`);
            return admin.firestore()
              .collection('users')
              .doc(userId)
              .update({ fcmToken: admin.firestore.FieldValue.delete() });
          }

          errorCount++;
          return null;
        });

      notificationPromises.push(promise);
    });

    await Promise.all(notificationPromises);

    console.log(`✅ Processamento concluído: ${successCount} enviadas, ${errorCount} erros`);

    return null;

  } catch (error) {
    console.error('❌ Erro crítico ao processar menções:', error);
    return null;
  }
});

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE PROXY PARA APIs EXTERNAS
// ═══════════════════════════════════════════════════════════

// CLOUD FUNCTION 1: NOTÍCIAS (Alpha Vantage)
exports.getNews = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('📰 [getNews] Requisição recebida');

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      throw new Error('Alpha Vantage API key não configurada');
    }

    console.log('🔑 [getNews] API Key disponível');

    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=COIN,CRYPTO:BTC,FOREX:USD&apikey=${apiKey}&limit=10`;

    console.log('🌐 [getNews] Fazendo requisição para Alpha Vantage...');

    const response = await axios.get(url, {
      timeout: 10000,
    });

    console.log('✅ [getNews] Resposta recebida:', response.status);

    // LOG COMPLETO DA RESPOSTA
    console.log('📄 [getNews] Response keys:', Object.keys(response.data));
    console.log('📄 [getNews] Response completa (500 chars):', JSON.stringify(response.data).substring(0, 500));

    // Verificar rate limit
    if (response.data.Information) {
      console.warn('⚠️ [getNews] Rate limit:', response.data.Information);
      return res.status(200).json({
        Information: response.data.Information,
        feed: []
      });
    }

    // Verificar erro
    if (response.data['Error Message']) {
      console.error('❌ [getNews] Erro da API:', response.data['Error Message']);
      return res.status(200).json({
        'Error Message': response.data['Error Message'],
        feed: []
      });
    }

    // Verificar feed
    if (response.data.feed && Array.isArray(response.data.feed)) {
      console.log('📊 [getNews] Artigos encontrados:', response.data.feed.length);

      if (response.data.feed.length > 0) {
        console.log('📋 [getNews] Primeiro artigo:', JSON.stringify(response.data.feed[0]).substring(0, 200));
      }

      return res.status(200).json(response.data);
    } else {
      console.warn('⚠️ [getNews] Campo "feed" não encontrado ou não é array');
      console.log('📋 [getNews] Campos disponíveis:', Object.keys(response.data));

      return res.status(200).json({
        ...response.data,
        feed: []
      });
    }

  } catch (error) {
    console.error('❌ [getNews] ERRO:', error.message);

    if (error.response) {
      console.error('📡 [getNews] Response Status:', error.response.status);
      console.error('📄 [getNews] Response Data:', JSON.stringify(error.response.data).substring(0, 500));
    }

    return res.status(500).json({
      error: error.message,
      details: 'Erro ao buscar notícias'
    });
  }
});

// CLOUD FUNCTION 2: FOREX (FCS API)
exports.getForex = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('💱 [getForex] Requisição recebida');

    const apiKey = process.env.FCS_API_KEY;

    if (!apiKey) {
      throw new Error('FCS API key não configurada');
    }

    console.log('🔑 [getForex] API Key disponível');

    // Pares padrão de Forex
    const pairs = 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD,NZD/USD,EUR/GBP';

    const url = `https://fcsapi.com/api-v3/forex/latest?symbol=${pairs}&access_key=${apiKey}`;

    console.log('🌐 [getForex] Fazendo requisição para FCS API...');

    const response = await axios.get(url, {
      timeout: 10000,
    });

    console.log('✅ [getForex] Resposta recebida:', response.status);
    console.log('📊 [getForex] Pares retornados:', response.data.response?.length || 0);

    res.status(200).json(response.data);
  } catch (error) {
    console.error('❌ [getForex] Erro:', error.message);
    res.status(500).json({
      error: error.message,
      details: 'Erro ao buscar dados Forex'
    });
  }
});

// CLOUD FUNCTION 3: AÇÕES (Alpha Vantage)
exports.getStocks = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('📈 [getStocks] Requisição recebida');

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    const symbol = req.query.symbol || 'AAPL';

    if (!apiKey) {
      throw new Error('Alpha Vantage API key não configurada');
    }

    console.log('🔑 [getStocks] API Key disponível');
    console.log('📊 [getStocks] Symbol solicitado:', symbol);

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

    console.log('🌐 [getStocks] Fazendo requisição para Alpha Vantage...');

    const response = await axios.get(url, {
      timeout: 10000,
    });

    console.log('✅ [getStocks] Resposta recebida:', response.status);

    res.status(200).json(response.data);
  } catch (error) {
    console.error('❌ [getStocks] Erro:', error.message);
    res.status(500).json({
      error: error.message,
      details: 'Erro ao buscar dados de ações'
    });
  }
});

// CLOUD FUNCTION 4: MÚLTIPLAS AÇÕES (Top 5)
exports.getTopStocks = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('📈 [getTopStocks] Requisição recebida');

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      throw new Error('Alpha Vantage API key não configurada');
    }

    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
    const results = [];

    console.log('🔑 [getTopStocks] API Key disponível');
    console.log('📊 [getTopStocks] Buscando ações:', symbols.join(', '));

    // Buscar cada ação com delay de 500ms (rate limit da API)
    for (const symbol of symbols) {
      try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

        const response = await axios.get(url, { timeout: 10000 });

        if (response.data['Global Quote']) {
          results.push({
            symbol: symbol,
            data: response.data['Global Quote']
          });
        }

        // Delay entre requisições
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`⚠️ [getTopStocks] Erro ao buscar ${symbol}:`, err.message);
      }
    }

    console.log('✅ [getTopStocks] Ações retornadas:', results.length);

    res.status(200).json({ stocks: results });
  } catch (error) {
    console.error('❌ [getTopStocks] Erro:', error.message);
    res.status(500).json({
      error: error.message,
      details: 'Erro ao buscar top ações'
    });
  }
});

// ========================================
// CLOUD FUNCTION 5: CALENDÁRIO ECONÔMICO (FCS API)
// ========================================
exports.getEconomicCalendar = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('📅 [getEconomicCalendar] Requisição recebida');
    console.log('📅 [getEconomicCalendar] Method:', req.method);
    console.log('📅 [getEconomicCalendar] Headers:', JSON.stringify(req.headers));

    const apiKey = process.env.FCS_API_KEY;

    if (!apiKey) {
      const errorMsg = 'FCS API key não configurada no .env';
      console.error('❌ [getEconomicCalendar]', errorMsg);
      return res.status(500).json({
        error: errorMsg,
        details: 'Configure FCS_API_KEY no arquivo .env'
      });
    }

    console.log('🔑 [getEconomicCalendar] API Key disponível:', apiKey.substring(0, 5) + '...');

    // Parâmetros de data (próximos 7 dias)
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 1); // Ontem

    const toDate = new Date(now);
    toDate.setDate(now.getDate() + 7); // Próximos 7 dias

    const from = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const to = toDate.toISOString().split('T')[0];

    console.log(`📆 [getEconomicCalendar] Buscando eventos de ${from} até ${to}`);

    // URL CORRETA da FCS API - endpoint é /forex/economy_cal
    const url = `https://fcsapi.com/api-v3/forex/economy_cal?from=${from}&to=${to}&access_key=${apiKey}`;

    console.log('🌐 [getEconomicCalendar] URL (sem key):', url.replace(apiKey, 'HIDDEN'));
    console.log('🌐 [getEconomicCalendar] Fazendo requisição...');

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AlanoCryptoFX/1.0',
      },
    });

    console.log('✅ [getEconomicCalendar] Resposta recebida');
    console.log('📡 [getEconomicCalendar] Status:', response.status);
    console.log('📊 [getEconomicCalendar] Response keys:', Object.keys(response.data));

    // Verificar estrutura da resposta
    if (!response.data) {
      console.warn('⚠️ [getEconomicCalendar] Resposta vazia');
      return res.status(200).json({
        status: false,
        response: [],
        message: 'Resposta da API vazia'
      });
    }

    console.log('📄 [getEconomicCalendar] Response data:', JSON.stringify(response.data).substring(0, 500));

    // Verificar se é um erro da API
    if (response.data.status === false || response.data.error) {
      console.error('❌ [getEconomicCalendar] Erro da FCS API:', response.data.msg || response.data.error);
      return res.status(200).json({
        status: false,
        response: [],
        message: response.data.msg || response.data.error || 'Erro na API FCS',
        apiError: true
      });
    }

    // Extrair eventos
    const events = response.data.response || [];
    console.log('📊 [getEconomicCalendar] Total de eventos:', events.length);

    if (events.length === 0) {
      console.warn('⚠️ [getEconomicCalendar] Nenhum evento encontrado');
      return res.status(200).json({
        status: true,
        response: [],
        message: 'Nenhum evento disponível para o período'
      });
    }

    // Log de amostra de eventos
    console.log('📋 [getEconomicCalendar] Primeiro evento:', JSON.stringify(events[0]));
    console.log('📋 [getEconomicCalendar] Campos do primeiro evento:', Object.keys(events[0]));

    // Filtrar apenas eventos relevantes (remover feriados)
    // A FCS API não retorna campo 'impact', então vamos filtrar por outros critérios
    const filteredEvents = events.filter(event => {
      // Remover feriados e eventos não-econômicos
      const title = (event.title || event.event || '').toLowerCase();
      const isHoliday = title.includes('day') &&
                       (title.includes('holiday') ||
                        title.includes('thanksgiving') ||
                        title.includes('christmas') ||
                        title.includes('independence'));

      const isElection = title.includes('election');
      const isGenericHoliday = title.includes('saint') ||
                              title.includes('martyrdom') ||
                              title.includes('liberation');

      // Manter apenas eventos econômicos reais
      const shouldKeep = !isHoliday && !isElection && !isGenericHoliday;

      if (!shouldKeep) {
        console.log('⚠️ [getEconomicCalendar] Filtrando evento não-econômico:', event.title || event.event);
      }

      return shouldKeep;
    });

    console.log('🎯 [getEconomicCalendar] Eventos filtrados:', filteredEvents.length);
    console.log('✅ [getEconomicCalendar] Retornando eventos com sucesso');

    return res.status(200).json({
      status: true,
      response: filteredEvents,
      info: response.data.info || {},
      meta: {
        total: events.length,
        filtered: filteredEvents.length,
        from: from,
        to: to
      }
    });

  } catch (error) {
    console.error('❌ [getEconomicCalendar] ERRO CAPTURADO:');
    console.error('❌ [getEconomicCalendar] Mensagem:', error.message);
    console.error('❌ [getEconomicCalendar] Stack:', error.stack);

    if (error.response) {
      console.error('📡 [getEconomicCalendar] Response Status:', error.response.status);
      console.error('📡 [getEconomicCalendar] Response Headers:', JSON.stringify(error.response.headers));
      console.error('📄 [getEconomicCalendar] Response Data:', JSON.stringify(error.response.data).substring(0, 500));
    }

    if (error.code) {
      console.error('🔧 [getEconomicCalendar] Error Code:', error.code);
    }

    return res.status(500).json({
      error: error.message,
      details: 'Erro ao buscar calendário econômico',
      errorCode: error.code,
      errorType: error.name,
      stack: error.stack?.substring(0, 500)
    });
  }
});

// ═══════════════════════════════════════════════════════════
// FUNÇÃO SCHEDULED - ATUALIZA CACHE DE MERCADOS A CADA 10 MIN
// ═══════════════════════════════════════════════════════════

/**
 * updateMarketsCache
 * Atualiza o cache do Firestore com dados de Crypto, Stocks e Forex
 * Roda a cada 10 minutos para manter dados atualizados
 */
exports.updateMarketsCache = onSchedule({
  schedule: 'every 10 minutes',
  timeZone: 'America/Sao_Paulo',
  retryCount: 3,
}, async (event) => {
  console.log('🔄 [updateMarketsCache] Iniciando atualização do cache...');
  const db = admin.firestore();

  try {
    // ═══ 1. CRYPTO (CoinGecko) ═══
    console.log('📊 Buscando dados de Crypto...');
    const cryptoResponse = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 100,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
      },
    });

    await db.collection('market_cache').doc('crypto').set({
      data: cryptoResponse.data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'coingecko',
    });
    console.log(`✅ Crypto: ${cryptoResponse.data.length} moedas salvas`);

    // ═══ 2. STOCKS (Twelve Data) ═══
    console.log('📈 Buscando dados de Stocks...');
    const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM', 'V'];
    const companyNames = {
      'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.', 'NVDA': 'NVIDIA Corp.', 'META': 'Meta Platforms',
      'TSLA': 'Tesla Inc.', 'BRK.B': 'Berkshire Hathaway', 'JPM': 'JPMorgan Chase', 'V': 'Visa Inc.',
    };
    const marketCaps = {
      'AAPL': 2950000000000, 'MSFT': 2810000000000, 'GOOGL': 1780000000000,
      'AMZN': 1850000000000, 'NVDA': 1220000000000, 'META': 1290000000000,
      'TSLA': 758000000000, 'BRK.B': 785000000000, 'JPM': 565000000000, 'V': 575000000000,
    };

    const stocksResponse = await axios.get('https://api.twelvedata.com/quote', {
      params: {
        symbol: stockSymbols.join(','),
        apikey: '4be61c2528dd4e1a8ad18e41abfe92ea',
      },
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
      },
    });

    let stocksData = [];
    for (let i = 0; i < stockSymbols.length; i++) {
      const symbol = stockSymbols[i];
      const quote = stocksResponse.data[symbol];

      if (quote && quote.close && !quote.code) {
        const currentPrice = parseFloat(quote.close);
        const previousClose = parseFloat(quote.previous_close) || currentPrice;
        const priceChange = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

        stocksData.push({
          id: symbol.toLowerCase().replace('.', ''),
          symbol: symbol,
          name: companyNames[symbol] || symbol,
          current_price: currentPrice,
          price_change_percentage_24h: priceChange,
          market_cap: marketCaps[symbol] || 0,
          image: `https://logo.clearbit.com/${symbol.toLowerCase().replace('.b', '')}.com`,
          market_cap_rank: i + 1,
        });
      }
    }

    // Fallback: se API não retornou dados, usar dados simulados
    if (stocksData.length === 0) {
      console.log('⚠️ API Twelve Data sem dados, usando fallback simulado');
      const basePrices = {
        'AAPL': 189.95, 'MSFT': 378.91, 'GOOGL': 141.80, 'AMZN': 178.25, 'NVDA': 495.22,
        'META': 505.95, 'TSLA': 238.45, 'BRK.B': 363.15, 'JPM': 195.82, 'V': 279.50,
      };
      stocksData = stockSymbols.map((symbol, index) => ({
        id: symbol.toLowerCase().replace('.', ''),
        symbol: symbol,
        name: companyNames[symbol] || symbol,
        current_price: basePrices[symbol] * (1 + (Math.random() - 0.5) * 0.02),
        price_change_percentage_24h: (Math.random() - 0.5) * 4,
        market_cap: marketCaps[symbol] || 0,
        image: `https://logo.clearbit.com/${symbol.toLowerCase().replace('.b', '')}.com`,
        market_cap_rank: index + 1,
      }));
    }

    await db.collection('market_cache').doc('stocks').set({
      data: stocksData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: stocksData.length > 0 && stocksResponse.data[stockSymbols[0]]?.close ? 'twelvedata' : 'simulated',
    });
    console.log(`✅ Stocks: ${stocksData.length} ações salvas`);

    // ═══ 3. FOREX (Dados simulados com variação) ═══
    console.log('💱 Gerando dados de Forex...');
    const forexPairs = [
      { id: 'eurusd', symbol: 'EUR/USD', name: 'EUR/USD', base_price: 1.0850 },
      { id: 'gbpusd', symbol: 'GBP/USD', name: 'GBP/USD', base_price: 1.2650 },
      { id: 'usdjpy', symbol: 'USD/JPY', name: 'USD/JPY', base_price: 149.50 },
      { id: 'usdchf', symbol: 'USD/CHF', name: 'USD/CHF', base_price: 0.8750 },
      { id: 'audusd', symbol: 'AUD/USD', name: 'AUD/USD', base_price: 0.6520 },
      { id: 'usdcad', symbol: 'USD/CAD', name: 'USD/CAD', base_price: 1.3680 },
      { id: 'nzdusd', symbol: 'NZD/USD', name: 'NZD/USD', base_price: 0.5920 },
      { id: 'eurgbp', symbol: 'EUR/GBP', name: 'EUR/GBP', base_price: 0.8580 },
      { id: 'eurjpy', symbol: 'EUR/JPY', name: 'EUR/JPY', base_price: 162.20 },
      { id: 'gbpjpy', symbol: 'GBP/JPY', name: 'GBP/JPY', base_price: 189.10 },
    ];

    const forexData = forexPairs.map((pair, index) => ({
      id: pair.id,
      symbol: pair.symbol,
      name: pair.name,
      current_price: pair.base_price * (1 + (Math.random() - 0.5) * 0.01),
      price_change_percentage_24h: (Math.random() - 0.5) * 2,
      market_cap: 0,
      image: 'https://via.placeholder.com/32',
      market_cap_rank: index + 1,
    }));

    await db.collection('market_cache').doc('forex').set({
      data: forexData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'simulated',
    });
    console.log(`✅ Forex: ${forexData.length} pares salvos`);

    // ═══ 4. CALENDÁRIO ECONÔMICO (Trading Economics - 5 dias) ═══
    // NOTA: Para dados completos, considerar plano pago (~$50/mês)
    // Finnhub Economic Calendar: $50/mês | Trading Economics: ~$49/mês
    console.log('📅 Buscando dados do Calendário Econômico...');
    try {
      // Calcular datas: 2 dias antes até 3 dias depois
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 2);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 3);

      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };

      const calendarResponse = await axios.get('https://api.tradingeconomics.com/calendar', {
        params: {
          c: 'guest:guest',
          f: 'json',
          d1: formatDate(startDate),
          d2: formatDate(endDate),
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
        },
      });

      let calendarData = [];
      if (Array.isArray(calendarResponse.data)) {
        calendarData = calendarResponse.data.map(event => ({
          id: event.CalendarId || `${event.Date}_${event.Event}`,
          date: event.Date,
          country: event.Country,
          category: event.Category,
          event: event.Event,
          reference: event.Reference,
          source: event.Source,
          actual: event.Actual,
          previous: event.Previous,
          forecast: event.Forecast,
          importance: event.Importance || 1,
          currency: event.Currency,
        }));
      }

      await db.collection('market_cache').doc('economic_calendar').set({
        data: calendarData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'tradingeconomics',
        dateRange: {
          start: formatDate(startDate),
          end: formatDate(endDate),
        },
      });
      console.log(`✅ Calendário: ${calendarData.length} eventos salvos`);
    } catch (calError) {
      console.error('⚠️ Erro no calendário econômico:', calError.message);
      // Não falha a função inteira se o calendário falhar
    }

    // ═══ 5. NOTÍCIAS (NewsAPI ou similar) ═══
    console.log('📰 Buscando notícias...');
    try {
      // Usar NewsAPI para buscar notícias de crypto/finanças
      const newsResponse = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'cryptocurrency OR bitcoin OR forex OR stocks',
          language: 'pt',
          sortBy: 'publishedAt',
          pageSize: 20,
          apiKey: 'e3c0c2fbb3414c999b76db49cc1cd150',
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
        },
      });

      let newsData = [];
      if (newsResponse.data && newsResponse.data.articles) {
        newsData = newsResponse.data.articles.map((article, index) => ({
          id: `news_${index}_${Date.now()}`,
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          source: article.source?.name || 'Unknown',
          author: article.author,
        }));
      }

      // Se NewsAPI falhar, usar dados de exemplo
      if (newsData.length === 0) {
        newsData = [
          {
            id: 'news_1',
            title: 'Bitcoin atinge nova máxima histórica',
            description: 'A principal criptomoeda do mundo continua sua trajetória de alta...',
            url: '#',
            urlToImage: 'https://via.placeholder.com/400x200',
            publishedAt: new Date().toISOString(),
            source: 'Crypto News',
            author: 'Redação',
          },
          {
            id: 'news_2',
            title: 'Fed mantém taxas de juros estáveis',
            description: 'O Federal Reserve decidiu manter as taxas de juros inalteradas...',
            url: '#',
            urlToImage: 'https://via.placeholder.com/400x200',
            publishedAt: new Date().toISOString(),
            source: 'Financial Times',
            author: 'Redação',
          },
          {
            id: 'news_3',
            title: 'Ethereum 2.0 completa mais uma atualização',
            description: 'A rede Ethereum continua seu processo de migração para proof-of-stake...',
            url: '#',
            urlToImage: 'https://via.placeholder.com/400x200',
            publishedAt: new Date().toISOString(),
            source: 'Crypto Daily',
            author: 'Redação',
          },
        ];
      }

      await db.collection('market_cache').doc('news').set({
        data: newsData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: newsData.length > 3 ? 'newsapi' : 'simulated',
      });
      console.log(`✅ Notícias: ${newsData.length} artigos salvos`);
    } catch (newsError) {
      console.error('⚠️ Erro nas notícias:', newsError.message);
    }

    console.log('🎉 [updateMarketsCache] Cache atualizado com sucesso!');
  } catch (error) {
    console.error('❌ [updateMarketsCache] Erro:', error.message);
    throw error;
  }
});

/**
 * refreshMarketsCache
 * Endpoint HTTP para forçar atualização manual do cache
 */
exports.refreshMarketsCache = onRequest({cors: true}, async (req, res) => {
  console.log('🔄 [refreshMarketsCache] Forçando atualização do cache...');
  const db = admin.firestore();

  try {
    // ═══ 1. CRYPTO ═══
    let cryptoCount = 0;
    try {
      const cryptoResponse = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h',
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
        },
      });

      await db.collection('market_cache').doc('crypto').set({
        data: cryptoResponse.data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'coingecko',
      });
      cryptoCount = cryptoResponse.data?.length || 0;
    } catch (cryptoError) {
      console.error('⚠️ Erro no crypto (CoinGecko):', cryptoError.message);
    }

    // ═══ 2. STOCKS ═══
    let stocksCount = 0;
    try {
      const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM', 'V'];
      const companyNames = {
        'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.', 'NVDA': 'NVIDIA Corp.', 'META': 'Meta Platforms',
        'TSLA': 'Tesla Inc.', 'BRK.B': 'Berkshire Hathaway', 'JPM': 'JPMorgan Chase', 'V': 'Visa Inc.',
      };
      const marketCaps = {
        'AAPL': 2950000000000, 'MSFT': 2810000000000, 'GOOGL': 1780000000000,
        'AMZN': 1850000000000, 'NVDA': 1220000000000, 'META': 1290000000000,
        'TSLA': 758000000000, 'BRK.B': 785000000000, 'JPM': 565000000000, 'V': 575000000000,
      };

      const stocksResponse = await axios.get('https://api.twelvedata.com/quote', {
        params: {
          symbol: stockSymbols.join(','),
          apikey: '4be61c2528dd4e1a8ad18e41abfe92ea',
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
        },
      });

      let stocksData = [];
      for (let i = 0; i < stockSymbols.length; i++) {
        const symbol = stockSymbols[i];
        const quote = stocksResponse.data[symbol];

        if (quote && quote.close && !quote.code) {
          const currentPrice = parseFloat(quote.close);
          const previousClose = parseFloat(quote.previous_close) || currentPrice;
          const priceChange = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

          stocksData.push({
            id: symbol.toLowerCase().replace('.', ''),
            symbol: symbol,
            name: companyNames[symbol] || symbol,
            current_price: currentPrice,
            price_change_percentage_24h: priceChange,
            market_cap: marketCaps[symbol] || 0,
            image: `https://logo.clearbit.com/${symbol.toLowerCase().replace('.b', '')}.com`,
            market_cap_rank: i + 1,
          });
        }
      }

      await db.collection('market_cache').doc('stocks').set({
        data: stocksData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'twelvedata',
      });
      stocksCount = stocksData.length;
    } catch (stocksError) {
      console.error('⚠️ Erro nos stocks (Twelve Data):', stocksError.message);
    }

    // ═══ 3. FOREX ═══
    const forexPairs = [
      { id: 'eurusd', symbol: 'EUR/USD', name: 'EUR/USD', base_price: 1.0850 },
      { id: 'gbpusd', symbol: 'GBP/USD', name: 'GBP/USD', base_price: 1.2650 },
      { id: 'usdjpy', symbol: 'USD/JPY', name: 'USD/JPY', base_price: 149.50 },
      { id: 'usdchf', symbol: 'USD/CHF', name: 'USD/CHF', base_price: 0.8750 },
      { id: 'audusd', symbol: 'AUD/USD', name: 'AUD/USD', base_price: 0.6520 },
      { id: 'usdcad', symbol: 'USD/CAD', name: 'USD/CAD', base_price: 1.3680 },
      { id: 'nzdusd', symbol: 'NZD/USD', name: 'NZD/USD', base_price: 0.5920 },
      { id: 'eurgbp', symbol: 'EUR/GBP', name: 'EUR/GBP', base_price: 0.8580 },
      { id: 'eurjpy', symbol: 'EUR/JPY', name: 'EUR/JPY', base_price: 162.20 },
      { id: 'gbpjpy', symbol: 'GBP/JPY', name: 'GBP/JPY', base_price: 189.10 },
    ];

    const forexData = forexPairs.map((pair, index) => ({
      id: pair.id,
      symbol: pair.symbol,
      name: pair.name,
      current_price: pair.base_price * (1 + (Math.random() - 0.5) * 0.01),
      price_change_percentage_24h: (Math.random() - 0.5) * 2,
      market_cap: 0,
      image: 'https://via.placeholder.com/32',
      market_cap_rank: index + 1,
    }));

    await db.collection('market_cache').doc('forex').set({
      data: forexData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'simulated',
    });

    // ═══ 4. CALENDÁRIO ECONÔMICO (Trading Economics) ═══
    let calendarCount = 0;
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 2);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 3);

      const formatDate = (date) => date.toISOString().split('T')[0];

      const calendarResponse = await axios.get('https://api.tradingeconomics.com/calendar', {
        params: {
          c: 'guest:guest',
          f: 'json',
          d1: formatDate(startDate),
          d2: formatDate(endDate),
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
        },
      });

      let calendarData = [];
      if (Array.isArray(calendarResponse.data)) {
        calendarData = calendarResponse.data.map(event => ({
          id: event.CalendarId || `${event.Date}_${event.Event}`,
          date: event.Date,
          country: event.Country,
          category: event.Category,
          event: event.Event,
          reference: event.Reference,
          source: event.Source,
          actual: event.Actual,
          previous: event.Previous,
          forecast: event.Forecast,
          importance: event.Importance || 1,
          currency: event.Currency,
        }));
      }

      await db.collection('market_cache').doc('economic_calendar').set({
        data: calendarData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'tradingeconomics',
        dateRange: { start: formatDate(startDate), end: formatDate(endDate) },
      });
      calendarCount = calendarData.length;
    } catch (calError) {
      console.error('⚠️ Erro no calendário:', calError.message);
    }

    // ═══ 5. NOTÍCIAS ═══
    let newsCount = 0;
    try {
      const newsResponse = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'cryptocurrency OR bitcoin OR forex OR stocks',
          language: 'pt',
          sortBy: 'publishedAt',
          pageSize: 20,
          apiKey: 'e3c0c2fbb3414c999b76db49cc1cd150',
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
        },
      });

      let newsData = [];
      if (newsResponse.data && newsResponse.data.articles) {
        newsData = newsResponse.data.articles.map((article, index) => ({
          id: `news_${index}_${Date.now()}`,
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          source: article.source?.name || 'Unknown',
          author: article.author,
        }));
      }

      if (newsData.length === 0) {
        newsData = [
          { id: 'news_1', title: 'Bitcoin atinge nova máxima histórica', description: 'A principal criptomoeda do mundo continua sua trajetória de alta...', url: '#', urlToImage: 'https://via.placeholder.com/400x200', publishedAt: new Date().toISOString(), source: 'Crypto News', author: 'Redação' },
          { id: 'news_2', title: 'Fed mantém taxas de juros estáveis', description: 'O Federal Reserve decidiu manter as taxas de juros inalteradas...', url: '#', urlToImage: 'https://via.placeholder.com/400x200', publishedAt: new Date().toISOString(), source: 'Financial Times', author: 'Redação' },
          { id: 'news_3', title: 'Ethereum 2.0 completa mais uma atualização', description: 'A rede Ethereum continua seu processo de migração para proof-of-stake...', url: '#', urlToImage: 'https://via.placeholder.com/400x200', publishedAt: new Date().toISOString(), source: 'Crypto Daily', author: 'Redação' },
        ];
      }

      await db.collection('market_cache').doc('news').set({
        data: newsData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: newsData.length > 3 ? 'newsapi' : 'simulated',
      });
      newsCount = newsData.length;
    } catch (newsError) {
      console.error('⚠️ Erro nas notícias:', newsError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Cache atualizado com sucesso',
      crypto: cryptoCount,
      stocks: stocksCount,
      forex: 10,
      calendar: calendarCount,
      news: newsCount,
    });
  } catch (error) {
    console.error('❌ [refreshMarketsCache] Erro:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE API DE MERCADOS (CoinGecko)
// ═══════════════════════════════════════════════════════════

/**
 * getGlobalCryptoData
 * Retorna dados globais do mercado cripto via CoinGecko API
 * Endpoint: https://api.coingecko.com/api/v3/global
 */
exports.getGlobalCryptoData = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('📊 [getGlobalCryptoData] Buscando dados globais da CoinGecko...');

    const response = await axios.get('https://api.coingecko.com/api/v3/global', {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
      },
    });

    console.log('✅ [getGlobalCryptoData] Dados globais obtidos com sucesso');

    return res.status(200).json({
      success: true,
      data: response.data.data,
    });
  } catch (error) {
    console.error('❌ [getGlobalCryptoData] Erro:', error.message);
    if (error.response) {
      console.error('📡 [getGlobalCryptoData] Status:', error.response.status);
      console.error('📡 [getGlobalCryptoData] Data:', error.response.data);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Erro ao buscar dados globais da CoinGecko',
    });
  }
});

/**
 * getCryptoMarkets
 * Retorna lista de top criptomoedas com preços e dados de mercado
 * Endpoint: https://api.coingecko.com/api/v3/coins/markets
 * Query params: per_page (default: 100), page (default: 1)
 */
exports.getCryptoMarkets = onRequest({cors: true}, async (req, res) => {
  try {
    const perPage = req.query.per_page || 100;
    const page = req.query.page || 1;

    console.log(`📊 [getCryptoMarkets] Buscando top ${perPage} criptomoedas (página ${page})...`);

    const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: perPage,
        page: page,
        sparkline: false,
        price_change_percentage: '24h',
      },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
      },
    });

    console.log(`✅ [getCryptoMarkets] ${response.data.length} moedas obtidas com sucesso`);

    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('❌ [getCryptoMarkets] Erro:', error.message);
    if (error.response) {
      console.error('📡 [getCryptoMarkets] Status:', error.response.status);
      console.error('📡 [getCryptoMarkets] Data:', error.response.data);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Erro ao buscar mercados de criptomoedas',
    });
  }
});

/**
 * searchCrypto
 * Busca criptomoedas por nome ou símbolo
 * Endpoint: https://api.coingecko.com/api/v3/search
 * Query param obrigatório: q (termo de busca)
 */
exports.searchCrypto = onRequest({cors: true}, async (req, res) => {
  try {
    const query = req.query.q || '';

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
        details: 'Parâmetro "q" é obrigatório para busca',
      });
    }

    console.log(`🔍 [searchCrypto] Buscando: "${query}"...`);

    const response = await axios.get('https://api.coingecko.com/api/v3/search', {
      params: {
        query: query,
      },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
      },
    });

    console.log(`✅ [searchCrypto] ${response.data.coins.length} resultados encontrados`);

    return res.status(200).json({
      success: true,
      data: response.data.coins,
    });
  } catch (error) {
    console.error('❌ [searchCrypto] Erro:', error.message);
    if (error.response) {
      console.error('📡 [searchCrypto] Status:', error.response.status);
      console.error('📡 [searchCrypto] Data:', error.response.data);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Erro ao buscar criptomoedas',
    });
  }
});

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE API DE AÇÕES (Stocks)
// ═══════════════════════════════════════════════════════════

/**
 * getStocksData
 * Retorna dados das principais ações via Alpha Vantage API
 * Top 10 ações: AAPL, MSFT, GOOGL, AMZN, TSLA, META, NVDA, NFLX, AMD, INTC
 */
exports.getStocksData = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('📈 [getStocksData] Buscando dados de ações via Twelve Data...');

    const apiKey = '4be61c2528dd4e1a8ad18e41abfe92ea';
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'JPM', 'V'];

    // Nomes das empresas para exibição
    const companyNames = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corp.',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'NVDA': 'NVIDIA Corp.',
      'META': 'Meta Platforms',
      'TSLA': 'Tesla Inc.',
      'BRK.B': 'Berkshire Hathaway',
      'JPM': 'JPMorgan Chase',
      'V': 'Visa Inc.',
    };

    // Market caps aproximados (em bilhões) - atualizados periodicamente
    const marketCaps = {
      'AAPL': 2950000000000,
      'MSFT': 2810000000000,
      'GOOGL': 1780000000000,
      'AMZN': 1850000000000,
      'NVDA': 1220000000000,
      'META': 1290000000000,
      'TSLA': 758000000000,
      'BRK.B': 785000000000,
      'JPM': 565000000000,
      'V': 575000000000,
    };

    // Buscar preços atuais e variação - usando batch request
    const response = await axios.get('https://api.twelvedata.com/quote', {
      params: {
        symbol: symbols.join(','),
        apikey: apiKey,
      },
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
      },
    });

    const data = response.data;
    const stocksData = [];

    // Processar resposta (pode ser objeto único ou múltiplos)
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const quote = data[symbol] || data;

      if (quote && quote.close && !quote.code) {
        const currentPrice = parseFloat(quote.close);
        const previousClose = parseFloat(quote.previous_close) || currentPrice;
        const priceChange = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;

        stocksData.push({
          id: symbol.toLowerCase().replace('.', ''),
          symbol: symbol,
          name: companyNames[symbol] || symbol,
          current_price: currentPrice,
          price_change_percentage_24h: priceChange,
          market_cap: marketCaps[symbol] || 0,
          image: `https://logo.clearbit.com/${symbol.toLowerCase().replace('.b', '')}.com`,
          market_cap_rank: i + 1,
        });
      } else {
        console.warn(`⚠️ [getStocksData] Dados incompletos para ${symbol}:`, quote?.code || 'sem dados');
      }
    }

    console.log(`✅ [getStocksData] ${stocksData.length}/${symbols.length} ações obtidas com sucesso`);

    return res.status(200).json({
      success: true,
      data: stocksData,
    });
  } catch (error) {
    console.error('❌ [getStocksData] Erro:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Erro ao buscar dados de ações',
    });
  }
});

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE API DE FOREX
// ═══════════════════════════════════════════════════════════

/**
 * getForexData
 * Retorna dados dos principais pares de moedas Forex
 * Top 10 pares: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD, EUR/GBP, EUR/JPY, GBP/JPY
 */
exports.getForexData = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('💱 [getForexData] Buscando dados de Forex...');

    const pairs = [
      { from: 'EUR', to: 'USD', name: 'EUR/USD' },
      { from: 'GBP', to: 'USD', name: 'GBP/USD' },
      { from: 'USD', to: 'JPY', name: 'USD/JPY' },
      { from: 'USD', to: 'CHF', name: 'USD/CHF' },
      { from: 'AUD', to: 'USD', name: 'AUD/USD' },
      { from: 'USD', to: 'CAD', name: 'USD/CAD' },
      { from: 'NZD', to: 'USD', name: 'NZD/USD' },
      { from: 'EUR', to: 'GBP', name: 'EUR/GBP' },
      { from: 'EUR', to: 'JPY', name: 'EUR/JPY' },
      { from: 'GBP', to: 'JPY', name: 'GBP/JPY' },
    ];

    // Gerar dados simulados (pode ser substituído por API real posteriormente)
    const forexData = pairs.map((pair, index) => ({
      id: pair.name.toLowerCase().replace('/', ''),
      symbol: pair.name,
      name: pair.name,
      current_price: 1.0 + Math.random() * 0.5,
      price_change_percentage_24h: (Math.random() - 0.5) * 2,
      market_cap: 0,
      image: 'https://via.placeholder.com/32',
      market_cap_rank: index + 1,
    }));

    console.log(`✅ [getForexData] ${forexData.length} pares de Forex gerados`);

    return res.status(200).json({
      success: true,
      data: forexData,
    });
  } catch (error) {
    console.error('❌ [getForexData] Erro:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Erro ao buscar dados de Forex',
    });
  }
});
