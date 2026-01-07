const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall, onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const axios = require('axios');
const cors = require('cors')({origin: true});

const resend = new Resend('re_D69j8Fvi_FKMwYdGUvvtebz3Q616wfcV8');
const EMAIL_FROM = 'suporte@alanocryptofx.com.br';

admin.initializeApp();

exports.testResendEmail = onRequest({
  memory: '128MiB',
  timeoutSeconds: 30
}, async (req, res) => {
  try {
    const testEmail = req.query.email || 'erik.vieiradev@hotmail.com';
    console.log('🧪 Testando envio de email para:', testEmail);
    console.log('📤 Remetente:', EMAIL_FROM);

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: testEmail,
      subject: '🧪 Teste Resend - AlanoCryptoFX',
      html: '<h1>Teste de Email</h1><p>Se você está vendo isso, o Resend está funcionando!</p>',
    });

    console.log('📧 Resposta do Resend:', JSON.stringify(result, null, 2));

    res.json({
      success: true,
      message: 'Email enviado!',
      resendResponse: result,
      from: EMAIL_FROM,
      to: testEmail
    });
  } catch (error) {
    console.error('❌ Erro Resend:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error,
      from: EMAIL_FROM
    });
  }
});

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE VERIFICAÇÃO DE EMAIL
// ═══════════════════════════════════════════════════════════

// Enviar código de verificação de email
exports.sendEmailVerification = onCall({
  memory: '128MiB',
  timeoutSeconds: 60
}, async (request) => {
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

// Verificar código de email (2FA)
exports.verifyEmailCode = onCall({
  memory: '128MiB',
  timeoutSeconds: 60
}, async (request) => {
  try {
    const { email, code } = request.data;

    if (!email || !code) {
      throw new Error('Email e código são obrigatórios');
    }

    const emailLower = email.toLowerCase().trim();

    // Buscar código no Firestore
    const verificationsSnapshot = await admin.firestore()
      .collection('email_verifications')
      .where('email', '==', emailLower)
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

    // Marcar código como verificado
    await verificationDoc.ref.update({
      verified: true,
      verifiedAt: now,
    });

    // Buscar usuário pelo email e atualizar emailVerified no documento
    try {
      const userRecord = await admin.auth().getUserByEmail(emailLower);
      await admin.firestore().collection('users').doc(userRecord.uid).update({
        emailVerified: true,
        emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✅ Campo emailVerified atualizado para usuário: ${userRecord.uid}`);
    } catch (updateError) {
      console.warn('⚠️ Não foi possível atualizar emailVerified no documento do usuário:', updateError.message);
    }

    console.log(`✅ Email verificado com sucesso: ${emailLower}`);

    return { success: true, verified: true };
  } catch (error) {
    console.error('❌ Erro ao verificar código:', error);
    throw new Error(error.message || 'Erro ao verificar código');
  }
});

// Deletar usuário do Authentication e Firestore
exports.deleteUser = onCall({
  memory: '128MiB',
  timeoutSeconds: 60
}, async (request) => {
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
exports.onSignalCreated = onDocumentCreated({
  document: 'signals/{signalId}',
  memory: '128MiB',
  timeoutSeconds: 60
}, async (event) => {
  try {
    const signal = event.data.data();
    console.log('🚀 Novo sinal criado:', signal.coin);

    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('approved', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('⚠️ Nenhum usuário aprovado encontrado');
      return null;
    }

    const tokens = [];
    const emailRecipients = [];

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const prefs = userData.notificationPreferences || {};

      if (prefs.signals !== false) {
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
        if (userData.email && userData.emailNotifications) {
          emailRecipients.push(userData.email);
        }
      }
    });

    console.log(`📱 FCM: ${tokens.length} usuários | 📧 Email: ${emailRecipients.length} usuários`);

    if (tokens.length === 0 && emailRecipients.length === 0) {
      console.log('⚠️ Nenhum usuário com notificações de sinais ativas');
      return null;
    }

    const typeEmoji = signal.type === 'long' ? '📈' : '📉';
    const typeName = signal.type === 'long' ? 'LONG' : 'SHORT';

    if (tokens.length > 0) {
      const message = {
        data: {
          type: 'signal',
          signalId: event.params.signalId,
          coin: signal.coin,
          signalType: signal.type,
          notificationTitle: `${typeEmoji} Novo Sinal ${typeName}: ${signal.coin}`,
          body: `Entrada: ${signal.entry} | SL: ${signal.stopLoss || 'N/A'}`,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        tokens: tokens,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              'content-available': 1,
            },
          },
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ FCM enviado: ${response.successCount} sucesso, ${response.failureCount} falhas`);

      if (response.failureCount > 0) {
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            tokensToRemove.push(tokens[idx]);
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

    if (emailRecipients.length > 0) {
      const targetsHtml = signal.targets && signal.targets.length > 0
        ? signal.targets.map((target, idx) => `
            <div style="padding: 8px 0; border-bottom: 1px solid #333;">
              <strong>Alvo ${idx + 1}:</strong> ${target}
            </div>
          `).join('')
        : '<div style="padding: 8px 0;">Nenhum alvo definido</div>';

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; }
              .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; }
              .header { background: linear-gradient(135deg, ${signal.type === 'long' ? '#00ff01' : '#ff0000'} 0%, ${signal.type === 'long' ? '#00cc01' : '#cc0000'} 100%); padding: 40px 20px; text-align: center; }
              .header h1 { margin: 0; color: #0a0a0a; font-size: 32px; font-weight: bold; }
              .signal-type { display: inline-block; padding: 8px 16px; background-color: rgba(0,0,0,0.2); border-radius: 20px; margin-top: 10px; font-size: 14px; font-weight: bold; }
              .content { padding: 30px 20px; }
              .signal-info { background-color: #0a0a0a; border: 2px solid ${signal.type === 'long' ? '#00ff01' : '#ff0000'}; border-radius: 12px; padding: 20px; margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #333; }
              .info-row:last-child { border-bottom: none; }
              .info-label { color: #888; font-size: 14px; }
              .info-value { color: ${signal.type === 'long' ? '#00ff01' : '#ff0000'}; font-weight: bold; font-size: 16px; }
              .targets-section { background-color: #2a2a2a; border-radius: 8px; padding: 15px; margin: 20px 0; }
              .targets-title { color: #00ff01; font-weight: bold; margin-bottom: 10px; }
              .button { display: inline-block; background: linear-gradient(135deg, #00ff01 0%, #00cc01 100%); color: #0a0a0a; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .risk-warning { background-color: #2a2a2a; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0; font-size: 13px; color: #cccccc; }
              .footer { padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #333333; }
              .footer a { color: #00ff01; text-decoration: none; }
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
                  <div class="info-row"><span class="info-label">Moeda</span><span class="info-value">${signal.coin}</span></div>
                  <div class="info-row"><span class="info-label">Tipo</span><span class="info-value">${typeName}</span></div>
                  <div class="info-row"><span class="info-label">Entrada</span><span class="info-value">${signal.entry}</span></div>
                  ${signal.stopLoss ? `<div class="info-row"><span class="info-label">Stop Loss</span><span class="info-value" style="color: #ff6b6b;">${signal.stopLoss}</span></div>` : ''}
                </div>
                ${signal.targets && signal.targets.length > 0 ? `<div class="targets-section"><div class="targets-title">🎯 Alvos (Targets)</div>${targetsHtml}</div>` : ''}
                <div style="text-align: center;"><a href="https://alanocryptofx-v2.web.app" class="button">Ver no App</a></div>
                <div class="risk-warning"><strong>⚠️ Aviso de Risco:</strong><br>Trading de criptomoedas envolve riscos significativos. Nunca invista mais do que você pode perder.</div>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} AlanoCryptoFX. Todos os direitos reservados.</p>
                <p><a href="https://alanocryptofx-v2.web.app/settings">Desativar notificações por email</a></p>
              </div>
            </div>
          </body>
        </html>
      `;

      let emailsSent = 0;
      for (const email of emailRecipients) {
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

    return null;
  } catch (error) {
    console.error('❌ Erro ao processar novo sinal:', error);
    return null;
  }
});

// Enviar notificação quando novo post do Alano é criado
exports.onAlanoPostCreated = onDocumentCreated({
  document: 'alano_posts/{postId}',
  memory: '512MiB',
  timeoutSeconds: 540
}, async (event) => {
  try {
    const postId = event.params.postId;
    const postRef = event.data.ref;
    const post = event.data.data();

    console.log(`📝 Novo post do Alano: ${post.title}`);

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

    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('approved', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('⚠️ Nenhum usuário aprovado encontrado');
      return null;
    }

    const tokens = [];
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const prefs = userData.notificationPreferences || {};

      if (prefs.posts !== false) {
        if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      }
    });

    console.log(`📱 FCM: ${tokens.length} usuários com notificações de posts ativas`);

    if (tokens.length > 0) {
      const message = {
        data: {
          type: 'alano_post',
          postId: postId,
          notificationTitle: '📝 Novo Post do Alano!',
          body: post.title || 'Confira o novo conteúdo',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        tokens: tokens,
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              'content-available': 1,
            },
          },
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ FCM enviado: ${response.successCount} sucesso, ${response.failureCount} falhas`);

      if (response.failureCount > 0) {
        const tokensToRemove = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            tokensToRemove.push(tokens[idx]);
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

    if (post.sendEmailNotification === false) {
      console.log('📧 Email desabilitado pelo admin para este post');
    } else {
      const emailUsers = [];
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const prefs = userData.notificationPreferences || {};
        if (prefs.postsEmail !== false && userData.email && userData.email.trim() !== '') {
          emailUsers.push({
            email: userData.email,
            displayName: userData.displayName || 'Membro',
          });
        }
      });

      const MAX_EMAILS_PER_POST = 90;
      const limitedEmailUsers = emailUsers.slice(0, MAX_EMAILS_PER_POST);

      console.log(`📧 [EMAIL] Total qualificados: ${emailUsers.length}`);
      console.log(`📧 [EMAIL] Enviando para: ${limitedEmailUsers.length} (limite: ${MAX_EMAILS_PER_POST})`);

      if (emailUsers.length > MAX_EMAILS_PER_POST) {
        console.log(`⚠️ [EMAIL] ${emailUsers.length - MAX_EMAILS_PER_POST} usuários não receberão (limite diário)`);
      }

      if (limitedEmailUsers.length > 0) {
        let emailsSent = 0;
        let emailsFailed = 0;

        for (const user of limitedEmailUsers) {
          try {
            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: Arial, sans-serif; background-color: #0f0f0f; margin: 0; padding: 20px;">
                  <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a2a;">
                    <div style="background: linear-gradient(135deg, #00d4aa 0%, #00a884 100%); padding: 30px; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 24px;">🎥 Novo Post do Alano</h1>
                    </div>
                    <div style="padding: 30px; color: #e0e0e0;">
                      <p>Olá, ${user.displayName}!</p>
                      <h2 style="color: #00d4aa; margin-top: 0;">${post.title}</h2>
                      <p style="font-size: 16px; line-height: 1.6; color: #b0b0b0;">Alano acabou de publicar um novo conteúdo exclusivo para membros.</p>
                      ${post.videoUrl ? `
                        <div style="background-color: #0f0f0f; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #2a2a2a;">
                          <p style="color: #00d4aa; font-weight: bold; margin-bottom: 15px;">📹 Vídeo Disponível</p>
                          <a href="${post.videoUrl}" style="display: inline-block; background: linear-gradient(135deg, #00d4aa 0%, #00a884 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold;">Assistir Agora</a>
                        </div>
                      ` : ''}
                      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #2a2a2a; text-align: center;">
                        <a href="https://alanocryptofx.com.br" style="display: inline-block; background-color: transparent; color: #00d4aa; text-decoration: none; padding: 10px 20px; border: 2px solid #00d4aa; border-radius: 6px; font-weight: bold;">Abrir App</a>
                      </div>
                    </div>
                    <div style="background-color: #0f0f0f; padding: 20px; text-align: center; border-top: 1px solid #2a2a2a;">
                      <p style="color: #666; font-size: 12px; margin: 0;">Você está recebendo este email porque ativou notificações de posts do Alano.</p>
                      <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">© 2025 AlanoCryptoFX. Todos os direitos reservados.</p>
                    </div>
                  </div>
                </body>
              </html>
            `;

            await resend.emails.send({
              from: EMAIL_FROM,
              to: [user.email],
              subject: `🎥 Novo Post: ${post.title}`,
              html: htmlContent,
            });

            emailsSent++;

            if (emailsSent % 10 === 0) {
              console.log(`📧 [EMAIL] Progresso: ${emailsSent}/${emailUsers.length}`);
            }

            await new Promise(resolve => setTimeout(resolve, 600));

          } catch (err) {
            emailsFailed++;
            console.error(`❌ [EMAIL] Falha para ${user.email}: ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        }

        console.log(`✅ [EMAIL] Concluído: ${emailsSent} enviados, ${emailsFailed} falharam de ${limitedEmailUsers.length}`);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Erro ao processar novo post:', error);
    return null;
  }
});

exports.onChatMessageCreated = onDocumentCreated({
  document: 'chat_messages/{messageId}',
  memory: '256MiB',
  timeoutSeconds: 120
}, async (event) => {
  console.log('🔥🔥🔥 [DEBUG] onChatMessageCreated DISPAROU!');

  const messageId = event.params.messageId;
  const messageData = event.data.data();

  console.log('🔥 Message ID:', messageId);
  console.log('🔥 Message data:', JSON.stringify(messageData));

  console.log(`💬 [CHAT] Nova mensagem criada: ${messageId}`);

  const senderName = messageData.userName || 'Alguém';
  const senderId = messageData.userId;

  console.log(`💬 [CHAT] Nova mensagem de ${senderName}`);

  try {
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('approved', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('⚠️ [CHAT] Nenhum usuário aprovado encontrado');
      return null;
    }

    const usersWithInstantPush = [];
    const usersForBatch = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const prefs = userData.notificationPreferences || {};

      if (userId === senderId) {
        return;
      }

      if (!userData.fcmToken) {
        return;
      }

      if (prefs.chatMessages === true) {
        usersWithInstantPush.push({
          id: userId,
          fcmToken: userData.fcmToken,
          displayName: userData.displayName,
          email: userData.email,
        });
      } else {
        usersForBatch.push(userId);
      }
    });

    console.log(`💬 [CHAT] Usuários com chatMessages=true: ${usersWithInstantPush.length}`);
    console.log(`💬 [CHAT] Usuários com chatMessages=false: ${usersForBatch.length} (vão para batch)`);

    if (usersWithInstantPush.length > 0) {
      const notificationPromises = [];
      let successCount = 0;
      let errorCount = 0;

      for (const user of usersWithInstantPush) {
        const count = await incrementChatCounter(user.id);

        console.log(`📱 [CHAT] Enviando push para ${user.email || user.id}`);
        console.log(`📊 [CHAT] Count: ${count} mensagens não lidas`);

        const titleText = count === 1
          ? '1 nova mensagem no chat'
          : `${count} novas mensagens no chat`;

        console.log(`📊 [CHAT] Tag: chat_general`);
        console.log(`📊 [CHAT] Título: ${titleText}`);

        const message = {
          token: user.fcmToken,
          data: {
            type: 'chat_grouped',
            count: count.toString(),
            title: titleText,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            timestamp: Date.now().toString(),
          },
          android: {
            priority: 'high',
            collapseKey: 'chat_general',
          },
          apns: {
            payload: {
              aps: {
                badge: count,
                sound: 'default',
                threadId: 'chat_general',
                'content-available': 1,
              },
            },
            headers: {
              'apns-priority': '10',
              'apns-collapse-id': 'chat_general',
            },
          },
          webpush: {
            headers: {
              Urgency: 'high',
              TTL: '0',
            },
            data: {
              type: 'chat_grouped',
              count: count.toString(),
              title: titleText,
            },
          },
        };

        const promise = admin.messaging().send(message)
          .then((response) => {
            console.log(`✅ [CHAT] Push enviado para ${user.id}, count=${count}`);
            successCount++;
            return response;
          })
          .catch((error) => {
            console.error(`❌ [CHAT] Erro ao enviar push para ${user.id}:`, error.message);

            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              console.log(`🗑️ [CHAT] Removendo FCM token inválido de ${user.id}`);
              return admin.firestore()
                .collection('users')
                .doc(user.id)
                .update({ fcmToken: admin.firestore.FieldValue.delete() });
            }

            errorCount++;
            return null;
          });

        notificationPromises.push(promise);
      }

      await Promise.all(notificationPromises);
      console.log(`✅ [CHAT] Push instantâneo: ${successCount} enviados, ${errorCount} erros`);
    }

    if (usersForBatch.length > 0) {
      console.log(`⏳ [CHAT] ${usersForBatch.length} usuários adicionados ao batch (próximo em 15min)`);
    }

    if (messageData.mentions && messageData.mentions.length > 0) {
      console.log(`📝 [CHAT] Mensagem tem ${messageData.mentions.length} menção(ões)`);
      await sendMentionNotifications(messageId, messageData, senderId, senderName);
    }

    return null;

  } catch (error) {
    console.error('❌ [CHAT] Erro crítico ao processar mensagem:', error);
    return null;
  }
});

async function incrementChatCounter(userId) {
  try {
    const counterRef = admin.firestore()
      .collection('users')
      .doc(userId);

    const result = await admin.firestore().runTransaction(async (transaction) => {
      const userDoc = await transaction.get(counterRef);
      const currentCount = userDoc.exists ? (userDoc.data().chatNotificationCount || 0) : 0;
      const newCount = currentCount + 1;

      transaction.update(counterRef, { chatNotificationCount: newCount });

      return newCount;
    });

    console.log(`📊 [CHAT] Contador de ${userId}: ${result}`);
    return result;
  } catch (error) {
    console.error(`❌ [CHAT] Erro ao incrementar contador: ${error.message}`);
    return 1;
  }
}

async function sendMentionNotifications(messageId, messageData, senderId, senderName) {
  try {
    const mentionedUserIds = messageData.mentions.map(m => m.userId);
    const messageText = messageData.text || '';

    if (mentionedUserIds.length === 0) return;

    const batchSize = 10;
    for (let i = 0; i < mentionedUserIds.length; i += batchSize) {
      const batch = mentionedUserIds.slice(i, i + batchSize);

      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get();

      const notificationPromises = [];

      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const fcmToken = userData.fcmToken;

        if (userId === senderId || !fcmToken) return;

        const truncatedText = messageText.length > 100
          ? `${messageText.substring(0, 100)}...`
          : messageText;

        const notification = {
          token: fcmToken,
          data: {
            type: 'mention',
            messageId: messageId,
            senderId: senderId,
            senderName: senderName,
            notificationTitle: `💬 ${senderName} mencionou você`,
            body: truncatedText,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
          android: {
            priority: 'high',
            notification: {
              tag: `mention_${messageId}`,
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
              },
            },
          },
          webpush: {
            headers: {
              Urgency: 'high',
            },
          },
        };

        const promise = admin.messaging().send(notification)
          .then((response) => {
            console.log(`✅ [MENTION] Notificação enviada para ${userId}`);
            return response;
          })
          .catch((error) => {
            console.error(`❌ [MENTION] Erro ao enviar para ${userId}:`, error.message);
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
              return admin.firestore()
                .collection('users')
                .doc(userId)
                .update({ fcmToken: admin.firestore.FieldValue.delete() });
            }
            return null;
          });

        notificationPromises.push(promise);
      });

      await Promise.all(notificationPromises);
    }
  } catch (error) {
    console.error('❌ [MENTION] Erro ao processar menções:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE PROXY PARA APIs EXTERNAS
// ═══════════════════════════════════════════════════════════

// CLOUD FUNCTION 1: NOTÍCIAS (Alpha Vantage)
exports.getNews = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
  try {
    console.log('📰 [getNews] Requisição recebida');

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      throw new Error('Alpha Vantage API key não configurada');
    }

    console.log('🔑 [getNews] API Key disponível');

    const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=COIN,CRYPTO:BTC,FOREX:USD&apikey=${apiKey}&limit=50`;

    console.log('🌐 [getNews] Fazendo requisição para Alpha Vantage...');

    const response = await axios.get(url, {
      timeout: 15000,
    });

    console.log('✅ [getNews] Resposta recebida:', response.status);

    if (response.data.Information) {
      console.warn('⚠️ [getNews] Rate limit:', response.data.Information);
      return res.status(200).json({
        Information: response.data.Information,
        feed: []
      });
    }

    if (response.data['Error Message']) {
      console.error('❌ [getNews] Erro da API:', response.data['Error Message']);
      return res.status(200).json({
        'Error Message': response.data['Error Message'],
        feed: []
      });
    }

    if (response.data.feed && Array.isArray(response.data.feed)) {
      console.log(`📰 [getNews] Total de artigos brutos: ${response.data.feed.length}`);

      const filteredFeed = response.data.feed
        .filter(article => {
          return article &&
                 article.title &&
                 article.title.trim() !== '' &&
                 article.url &&
                 article.url.trim() !== '';
        })
        .slice(0, 50)
        .map(article => ({
          title: article.title || 'Sem título',
          summary: article.summary || 'Sem descrição disponível',
          url: article.url || '',
          source: article.source || 'Alpha Vantage',
          time_published: article.time_published || new Date().toISOString(),
          banner_image: article.banner_image || null,
          overall_sentiment_label: article.overall_sentiment_label || 'Neutral',
          overall_sentiment_score: article.overall_sentiment_score || 0,
          topics: article.topics || [],
          ticker_sentiment: article.ticker_sentiment || []
        }));

      console.log(`📰 [getNews] Artigos após filtro: ${filteredFeed.length}`);

      return res.status(200).json({
        ...response.data,
        feed: filteredFeed,
        items: filteredFeed.length
      });
    } else {
      console.warn('⚠️ [getNews] Campo "feed" não encontrado ou não é array');
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

exports.getForexNews = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
  try {
    console.log('📰 [getForexNews] Requisição recebida');

    const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;

    if (!ALPHA_VANTAGE_KEY) {
      console.error('❌ [getForexNews] API Key não configurada');
      return res.status(500).json({
        success: false,
        error: 'API Key não configurada'
      });
    }

    const topics = 'forex,currency,fx_markets';
    const apiUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&topics=${topics}&apikey=${ALPHA_VANTAGE_KEY}&limit=50`;

    console.log('🔍 [getForexNews] Buscando notícias de Forex...');

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.Note) {
      console.log('⚠️ [getForexNews] Rate limit atingido');
      return res.status(429).json({
        success: false,
        error: 'Rate limit atingido. Tente novamente em 1 minuto.',
        message: data.Note
      });
    }

    if (!data.feed || data.feed.length === 0) {
      console.log('📭 [getForexNews] Nenhuma notícia encontrada');
      return res.json({
        success: true,
        news: [],
        count: 0
      });
    }

    const forexNews = data.feed
      .filter(article => {
        const summary = (article.summary || '').toLowerCase();
        const title = (article.title || '').toLowerCase();
        const forexKeywords = ['forex', 'currency', 'exchange rate', 'fx', 'dollar', 'euro', 'pound', 'yen'];
        return forexKeywords.some(keyword =>
          title.includes(keyword) || summary.includes(keyword)
        );
      })
      .slice(0, 20)
      .map(article => ({
        title: article.title || 'Sem título',
        summary: article.summary || 'Sem descrição',
        url: article.url || '',
        source: article.source || 'Alpha Vantage',
        publishedAt: article.time_published || new Date().toISOString(),
        image: article.banner_image || null,
        sentiment: article.overall_sentiment_label || 'Neutral',
        sentimentScore: article.overall_sentiment_score || 0,
        relevanceScore: article.relevance_score || 0,
        topics: article.topics || []
      }));

    console.log(`✅ [getForexNews] ${forexNews.length} notícias de Forex retornadas`);

    return res.json({
      success: true,
      news: forexNews,
      count: forexNews.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [getForexNews] Erro:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar notícias de Forex',
      message: error.message
    });
  }
});

// CLOUD FUNCTION 2: FOREX (FCS API)
exports.getForex = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
  try {
    console.log('💱 [getForex] Requisição recebida');

    const apiKey = process.env.FCS_API_KEY;

    if (!apiKey) {
      throw new Error('FCS API key não configurada');
    }

    console.log('🔑 [getForex] API Key disponível');

    const pairs = 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD,NZD/USD,EUR/GBP,EUR/JPY,GBP/JPY,CHF/JPY,EUR/CHF,GBP/CHF,AUD/JPY,NZD/JPY,EUR/AUD,GBP/AUD,EUR/CAD,GBP/CAD,AUD/CAD,USD/CHF';

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
exports.getStocks = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
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
exports.getTopStocks = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
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
exports.getEconomicCalendar = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
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

    // ═══ 2. STOCKS (Finnhub API - Dados Reais) ═══
    console.log('📈 Buscando dados de Stocks do Finnhub...');
    try {
      const finnhubApiKey = process.env.FINNHUB_API_KEY || process.env.TRADING_ECONOMICS_KEY;

      if (!finnhubApiKey) {
        console.warn('⚠️ FINNHUB_API_KEY não configurada, usando dados simulados');
        throw new Error('Finnhub API key not configured');
      }

      const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'JNJ', 'NFLX', 'AMD', 'INTC', 'DIS', 'BA', 'MA', 'PYPL', 'SHOP', 'COIN', 'HOOD'];
      const stockNames = {
        'AAPL': 'Apple Inc.',
        'MSFT': 'Microsoft Corp.',
        'GOOGL': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.',
        'TSLA': 'Tesla Inc.',
        'META': 'Meta Platforms',
        'NVDA': 'NVIDIA Corp.',
        'JPM': 'JPMorgan Chase',
        'V': 'Visa Inc.',
        'JNJ': 'Johnson & Johnson',
        'NFLX': 'Netflix Inc.',
        'AMD': 'Advanced Micro Devices',
        'INTC': 'Intel Corp.',
        'DIS': 'Walt Disney Co.',
        'BA': 'Boeing Co.',
        'MA': 'Mastercard Inc.',
        'PYPL': 'PayPal Holdings',
        'SHOP': 'Shopify Inc.',
        'COIN': 'Coinbase Global',
        'HOOD': 'Robinhood Markets',
      };

      const stocksData = [];

      for (let i = 0; i < stockSymbols.length; i++) {
        const symbol = stockSymbols[i];
        try {
          // Delay de 100ms entre requisições para não estourar rate limit
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));

          const response = await axios.get('https://finnhub.io/api/v1/quote', {
            params: {
              symbol: symbol,
              token: finnhubApiKey,
            },
            timeout: 10000,
          });

          if (response.data && response.data.c) {
            stocksData.push({
              id: symbol.toLowerCase(),
              symbol: symbol,
              name: stockNames[symbol] || symbol,
              current_price: response.data.c,
              price_change_percentage_24h: response.data.dp || 0,
              high_24h: response.data.h || response.data.c,
              low_24h: response.data.l || response.data.c,
              open: response.data.o || response.data.c,
              previous_close: response.data.pc || response.data.c,
              market_cap: 0, // Finnhub não retorna market cap no quote endpoint
              image: `https://logo.clearbit.com/${symbol.toLowerCase()}.com`,
              market_cap_rank: i + 1,
            });
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar ${symbol}:`, error.message);
          // Continuar com as outras ações mesmo se uma falhar
        }
      }

      await db.collection('market_cache').doc('stocks').set({
        data: stocksData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'finnhub',
      });
      console.log(`✅ Stocks: ${stocksData.length} ações salvas`);
    } catch (stocksError) {
      console.error('⚠️ Erro geral nos Stocks:', stocksError.message);
      const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'JNJ', 'NFLX', 'AMD', 'INTC', 'DIS', 'BA', 'MA', 'PYPL', 'SHOP', 'COIN', 'HOOD'];
      const basePrices = {
        'AAPL': 189.95, 'MSFT': 378.91, 'GOOGL': 141.80, 'AMZN': 178.25, 'TSLA': 248.50, 'META': 505.75, 'NVDA': 495.22, 'JPM': 195.40, 'V': 275.80, 'JNJ': 155.20,
        'NFLX': 485.30, 'AMD': 145.60, 'INTC': 45.80, 'DIS': 95.40, 'BA': 215.70, 'MA': 445.90, 'PYPL': 62.40, 'SHOP': 78.50, 'COIN': 255.30, 'HOOD': 18.90,
      };
      const stockNames = {
        'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet Inc.', 'AMZN': 'Amazon.com Inc.', 'TSLA': 'Tesla Inc.', 'META': 'Meta Platforms', 'NVDA': 'NVIDIA Corp.', 'JPM': 'JPMorgan Chase', 'V': 'Visa Inc.', 'JNJ': 'Johnson & Johnson',
        'NFLX': 'Netflix Inc.', 'AMD': 'Advanced Micro Devices', 'INTC': 'Intel Corp.', 'DIS': 'Walt Disney Co.', 'BA': 'Boeing Co.', 'MA': 'Mastercard Inc.', 'PYPL': 'PayPal Holdings', 'SHOP': 'Shopify Inc.', 'COIN': 'Coinbase Global', 'HOOD': 'Robinhood Markets',
      };

      const stocksData = stockSymbols.map((symbol, index) => ({
        id: symbol.toLowerCase(),
        symbol: symbol,
        name: stockNames[symbol] || symbol,
        current_price: basePrices[symbol] * (1 + (Math.random() - 0.5) * 0.02),
        price_change_percentage_24h: (Math.random() - 0.5) * 4,
        market_cap: 0,
        image: `https://logo.clearbit.com/${symbol.toLowerCase()}.com`,
        market_cap_rank: index + 1,
      }));

      await db.collection('market_cache').doc('stocks').set({
        data: stocksData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'simulated',
      });
      console.log(`✅ Stocks (simulado): ${stocksData.length} ações salvas`);
    }

    // ═══ 3. FOREX (ExchangeRate-API - Gratuita, Sem Cadastro) ═══
    console.log('💱 Buscando dados de Forex (ExchangeRate-API)...');
    try {
      const forexResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
        timeout: 10000,
      });

      if (forexResponse.data && forexResponse.data.rates) {
        const rates = forexResponse.data.rates;

        // TODO: Implementar API real para commodities (XAU/USD, XAG/USD)
        // Dados mockados removidos pois o mercado financeiro é muito volátil
        // e preços desatualizados podem causar problemas.
        // Sugestões de APIs: Finnhub, GoldAPI.io, MetalpriceAPI, Metals.live
        // const commodities = [
        //   { id: 'xauusd', symbol: 'XAU/USD', name: 'Gold / US Dollar', rate: 4189.00, flag: '🥇' },
        //   { id: 'xagusd', symbol: 'XAG/USD', name: 'Silver / US Dollar', rate: 31.50, flag: '🥈' },
        // ];

        const forexPairs = [
          // ...commodities, // Descomentar quando implementar API de commodities
          {
            id: 'eurusd',
            symbol: 'EUR/USD',
            name: 'Euro / US Dollar',
            rate: 1 / rates.EUR,
            flag: '🇪🇺'
          },
          {
            id: 'gbpusd',
            symbol: 'GBP/USD',
            name: 'British Pound / US Dollar',
            rate: 1 / rates.GBP,
            flag: '🇬🇧'
          },
          {
            id: 'usdjpy',
            symbol: 'USD/JPY',
            name: 'US Dollar / Japanese Yen',
            rate: rates.JPY,
            flag: '🇯🇵'
          },
          {
            id: 'usdchf',
            symbol: 'USD/CHF',
            name: 'US Dollar / Swiss Franc',
            rate: rates.CHF,
            flag: '🇨🇭'
          },
          {
            id: 'audusd',
            symbol: 'AUD/USD',
            name: 'Australian Dollar / US Dollar',
            rate: 1 / rates.AUD,
            flag: '🇦🇺'
          },
          {
            id: 'usdcad',
            symbol: 'USD/CAD',
            name: 'US Dollar / Canadian Dollar',
            rate: rates.CAD,
            flag: '🇨🇦'
          },
          {
            id: 'nzdusd',
            symbol: 'NZD/USD',
            name: 'New Zealand Dollar / US Dollar',
            rate: 1 / rates.NZD,
            flag: '🇳🇿'
          },
          {
            id: 'usdmxn',
            symbol: 'USD/MXN',
            name: 'US Dollar / Mexican Peso',
            rate: rates.MXN,
            flag: '🇲🇽'
          },
          {
            id: 'usdbrl',
            symbol: 'USD/BRL',
            name: 'US Dollar / Brazilian Real',
            rate: rates.BRL,
            flag: '🇧🇷'
          },
          {
            id: 'usdcny',
            symbol: 'USD/CNY',
            name: 'US Dollar / Chinese Yuan',
            rate: rates.CNY,
            flag: '🇨🇳'
          },
          {
            id: 'usdinr',
            symbol: 'USD/INR',
            name: 'US Dollar / Indian Rupee',
            rate: rates.INR,
            flag: '🇮🇳'
          },
          {
            id: 'usdkrw',
            symbol: 'USD/KRW',
            name: 'US Dollar / South Korean Won',
            rate: rates.KRW,
            flag: '🇰🇷'
          },
          {
            id: 'usdsgd',
            symbol: 'USD/SGD',
            name: 'US Dollar / Singapore Dollar',
            rate: rates.SGD,
            flag: '🇸🇬'
          },
          {
            id: 'usdhkd',
            symbol: 'USD/HKD',
            name: 'US Dollar / Hong Kong Dollar',
            rate: rates.HKD,
            flag: '🇭🇰'
          },
          {
            id: 'usdsek',
            symbol: 'USD/SEK',
            name: 'US Dollar / Swedish Krona',
            rate: rates.SEK,
            flag: '🇸🇪'
          },
          {
            id: 'usdnok',
            symbol: 'USD/NOK',
            name: 'US Dollar / Norwegian Krone',
            rate: rates.NOK,
            flag: '🇳🇴'
          },
          {
            id: 'usddkk',
            symbol: 'USD/DKK',
            name: 'US Dollar / Danish Krone',
            rate: rates.DKK,
            flag: '🇩🇰'
          },
          {
            id: 'usdpln',
            symbol: 'USD/PLN',
            name: 'US Dollar / Polish Zloty',
            rate: rates.PLN,
            flag: '🇵🇱'
          },
          {
            id: 'usdtry',
            symbol: 'USD/TRY',
            name: 'US Dollar / Turkish Lira',
            rate: rates.TRY,
            flag: '🇹🇷'
          },
          {
            id: 'usdzar',
            symbol: 'USD/ZAR',
            name: 'US Dollar / South African Rand',
            rate: rates.ZAR,
            flag: '🇿🇦'
          },
        ];

        const forexData = forexPairs.map((pair, index) => {
          const randomChange = (Math.random() - 0.5) * 0.5;

          return {
            id: pair.id,
            symbol: pair.symbol,
            name: pair.name,
            current_price: parseFloat(pair.rate.toFixed(4)),
            price_change_percentage_24h: parseFloat(randomChange.toFixed(2)),
            high_24h: parseFloat((pair.rate * 1.002).toFixed(4)),
            low_24h: parseFloat((pair.rate * 0.998).toFixed(4)),
            flag: pair.flag,
            market_cap: 0,
            image: 'https://via.placeholder.com/32',
            market_cap_rank: index + 1,
          };
        });

        await db.collection('market_cache').doc('forex').set({
          data: forexData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'exchangerate-api',
        });

        console.log(`✅ Forex: ${forexData.length} pares salvos (ExchangeRate-API)`);
      }
    } catch (forexError) {
      console.error('⚠️ Erro no Forex:', forexError.message);

      // Fallback com dados aproximados atuais
      const fallbackForex = [
        // TODO: Commodities (XAU/USD, XAG/USD) - Implementar API real
        // { id: 'xauusd', symbol: 'XAU/USD', name: 'Gold / US Dollar', current_price: 4189.00, price_change_percentage_24h: 0.35, flag: '🥇' },
        // { id: 'xagusd', symbol: 'XAG/USD', name: 'Silver / US Dollar', current_price: 31.50, price_change_percentage_24h: 0.28, flag: '🥈' },
        // Currency Pairs
        { id: 'eurusd', symbol: 'EUR/USD', name: 'Euro / US Dollar', current_price: 1.0520, price_change_percentage_24h: 0.12, flag: '🇪🇺' },
        { id: 'gbpusd', symbol: 'GBP/USD', name: 'British Pound / US Dollar', current_price: 1.2580, price_change_percentage_24h: -0.08, flag: '🇬🇧' },
        { id: 'usdjpy', symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', current_price: 154.50, price_change_percentage_24h: 0.25, flag: '🇯🇵' },
        { id: 'usdchf', symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', current_price: 0.8850, price_change_percentage_24h: -0.15, flag: '🇨🇭' },
        { id: 'audusd', symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', current_price: 0.6520, price_change_percentage_24h: 0.18, flag: '🇦🇺' },
        { id: 'usdcad', symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', current_price: 1.4020, price_change_percentage_24h: -0.22, flag: '🇨🇦' },
        { id: 'nzdusd', symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', current_price: 0.5890, price_change_percentage_24h: 0.05, flag: '🇳🇿' },
        { id: 'usdmxn', symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso', current_price: 20.35, price_change_percentage_24h: 0.32, flag: '🇲🇽' },
        { id: 'usdbrl', symbol: 'USD/BRL', name: 'US Dollar / Brazilian Real', current_price: 5.82, price_change_percentage_24h: -0.45, flag: '🇧🇷' },
        { id: 'usdcny', symbol: 'USD/CNY', name: 'US Dollar / Chinese Yuan', current_price: 7.25, price_change_percentage_24h: 0.08, flag: '🇨🇳' },
        { id: 'usdinr', symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', current_price: 84.05, price_change_percentage_24h: 0.15, flag: '🇮🇳' },
        { id: 'usdkrw', symbol: 'USD/KRW', name: 'US Dollar / South Korean Won', current_price: 1385.50, price_change_percentage_24h: -0.18, flag: '🇰🇷' },
        { id: 'usdsgd', symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', current_price: 1.3450, price_change_percentage_24h: 0.08, flag: '🇸🇬' },
        { id: 'usdhkd', symbol: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar', current_price: 7.7850, price_change_percentage_24h: 0.02, flag: '🇭🇰' },
        { id: 'usdsek', symbol: 'USD/SEK', name: 'US Dollar / Swedish Krona', current_price: 10.85, price_change_percentage_24h: -0.25, flag: '🇸🇪' },
        { id: 'usdnok', symbol: 'USD/NOK', name: 'US Dollar / Norwegian Krone', current_price: 11.15, price_change_percentage_24h: 0.12, flag: '🇳🇴' },
        { id: 'usddkk', symbol: 'USD/DKK', name: 'US Dollar / Danish Krone', current_price: 7.05, price_change_percentage_24h: -0.08, flag: '🇩🇰' },
        { id: 'usdpln', symbol: 'USD/PLN', name: 'US Dollar / Polish Zloty', current_price: 4.05, price_change_percentage_24h: 0.22, flag: '🇵🇱' },
        { id: 'usdtry', symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira', current_price: 34.25, price_change_percentage_24h: 0.45, flag: '🇹🇷' },
        { id: 'usdzar', symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', current_price: 18.45, price_change_percentage_24h: -0.35, flag: '🇿🇦' },
      ];

      await db.collection('market_cache').doc('forex').set({
        data: fallbackForex,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'fallback',
      });

      console.log('⚠️ Forex: Usando dados de fallback');
    }

    // ═══ 4. CALENDÁRIO ECONÔMICO (Finnhub API) ═══
    // API: Finnhub.io Economic Calendar
    // Chave configurada via Firebase Functions config
    console.log('📅 Buscando dados do Calendário Econômico (Finnhub)...');
    try {
      const finnhubApiKey = process.env.FINNHUB_API_KEY || process.env.TRADING_ECONOMICS_KEY;

      if (!finnhubApiKey) {
        console.error('❌ FINNHUB_API_KEY não configurada');
        throw new Error('Finnhub API key not configured');
      }

      console.log('✅ Usando API Finnhub para calendário econômico');

      const calendarResponse = await axios.get('https://finnhub.io/api/v1/calendar/economic', {
        params: {
          token: finnhubApiKey,
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
        },
      });

      let calendarData = [];
      if (calendarResponse.data && calendarResponse.data.economicCalendar) {
        // Países relevantes para mercado americano
        const relevantCountries = ['US', 'EU', 'GB', 'CN', 'JP', 'CA', 'AU'];

        // Converter impacto para importância numérica (1=low, 2=medium, 3=high)
        const impactToImportance = (impact) => {
          const impactLower = (impact || '').toLowerCase();
          if (impactLower === 'high') return 3;
          if (impactLower === 'medium') return 2;
          return 1;
        };

        // Filtrar apenas países relevantes
        const filteredEvents = calendarResponse.data.economicCalendar.filter(event =>
          relevantCountries.includes(event.country)
        );

        calendarData = filteredEvents.map(event => ({
          id: `${event.time}_${event.event}_${event.country}`,
          date: event.time,
          country: event.country,
          category: event.event,
          event: event.event,
          reference: '',
          source: 'Finnhub',
          actual: event.actual !== null ? event.actual : '',
          previous: event.prev !== null ? event.prev : '',
          forecast: event.estimate !== null ? event.estimate : '',
          importance: impactToImportance(event.impact),
          currency: event.country,
          unit: event.unit || '',
          impact: event.impact || 'low',
          isUS: event.country === 'US', // Flag para destacar eventos US
        }));

        // Ordenar: Eventos US primeiro, depois por data/hora
        calendarData.sort((a, b) => {
          // US sempre vem primeiro
          if (a.isUS && !b.isUS) return -1;
          if (!a.isUS && b.isUS) return 1;

          // Depois ordenar por data
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
      }

      await db.collection('market_cache').doc('economic_calendar').set({
        data: calendarData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'finnhub',
        marketFocus: 'US', // Indicar foco no mercado americano
      });
      console.log(`✅ Calendário: ${calendarData.length} eventos salvos (foco EUA)`);
    } catch (calError) {
      console.error('⚠️ Erro no calendário econômico:', calError.message);
      if (calError.response) {
        console.error('⚠️ Response status:', calError.response.status);
        console.error('⚠️ Response data:', JSON.stringify(calError.response.data).substring(0, 200));
      }
      // Não falha a função inteira se o calendário falhar
    }

    console.log('📰 Buscando notícias...');
    try {
      const newsResponse = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: 'cryptocurrency OR bitcoin OR forex OR stocks',
          language: 'pt',
          sortBy: 'publishedAt',
          pageSize: 50,
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
        newsData = newsResponse.data.articles
          .filter(article => {
            return article &&
                   article.title &&
                   article.title.trim() !== '' &&
                   article.title !== '[Removed]' &&
                   article.url &&
                   article.url.trim() !== '';
          })
          .slice(0, 30)
          .map((article, index) => ({
            id: `news_${index}_${Date.now()}`,
            title: article.title || 'Sem título',
            description: article.description || 'Sem descrição',
            url: article.url || '',
            urlToImage: article.urlToImage || null,
            publishedAt: article.publishedAt || new Date().toISOString(),
            source: article.source?.name || 'Unknown',
            author: article.author || 'Redação',
          }));
        console.log(`📰 [updateMarketsCache] Artigos brutos: ${newsResponse.data.articles.length}, após filtro: ${newsData.length}`);
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
exports.refreshMarketsCache = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
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

    // ═══ 2. STOCKS (Finnhub API) ═══
    let stocksCount = 0;
    try {
      const finnhubApiKey = process.env.FINNHUB_API_KEY || process.env.TRADING_ECONOMICS_KEY;
      const stockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'V', 'JNJ', 'NFLX', 'AMD', 'INTC', 'DIS', 'BA', 'MA', 'PYPL', 'SHOP', 'COIN', 'HOOD'];
      const stockNames = {
        'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet Inc.', 'AMZN': 'Amazon.com Inc.', 'TSLA': 'Tesla Inc.', 'META': 'Meta Platforms', 'NVDA': 'NVIDIA Corp.', 'JPM': 'JPMorgan Chase', 'V': 'Visa Inc.', 'JNJ': 'Johnson & Johnson',
        'NFLX': 'Netflix Inc.', 'AMD': 'Advanced Micro Devices', 'INTC': 'Intel Corp.', 'DIS': 'Walt Disney Co.', 'BA': 'Boeing Co.', 'MA': 'Mastercard Inc.', 'PYPL': 'PayPal Holdings', 'SHOP': 'Shopify Inc.', 'COIN': 'Coinbase Global', 'HOOD': 'Robinhood Markets',
      };

      const stocksData = [];
      for (let i = 0; i < stockSymbols.length; i++) {
        const symbol = stockSymbols[i];
        try {
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 100));
          const response = await axios.get('https://finnhub.io/api/v1/quote', {
            params: { symbol, token: finnhubApiKey },
            timeout: 10000,
          });

          if (response.data && response.data.c) {
            stocksData.push({
              id: symbol.toLowerCase(),
              symbol: symbol,
              name: stockNames[symbol] || symbol,
              current_price: response.data.c,
              price_change_percentage_24h: response.data.dp || 0,
              high_24h: response.data.h || response.data.c,
              low_24h: response.data.l || response.data.c,
              image: `https://logo.clearbit.com/${symbol.toLowerCase()}.com`,
              market_cap_rank: i + 1,
            });
          }
        } catch (error) {
          console.warn(`⚠️ Erro ao buscar ${symbol}:`, error.message);
        }
      }

      await db.collection('market_cache').doc('stocks').set({
        data: stocksData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'finnhub',
      });
      stocksCount = stocksData.length;
    } catch (stocksError) {
      console.error('⚠️ Erro nos stocks:', stocksError.message);
    }

    // ═══ 3. FOREX (ExchangeRate-API - Gratuita, Sem Cadastro) ═══
    let forexCount = 0;
    try {
      const forexResponse = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
        timeout: 10000,
      });

      if (forexResponse.data && forexResponse.data.rates) {
        const rates = forexResponse.data.rates;

        // TODO: Implementar API real para commodities (XAU/USD, XAG/USD)
        // Dados mockados removidos pois o mercado financeiro é muito volátil
        // e preços desatualizados podem causar problemas.
        // Sugestões de APIs: Finnhub, GoldAPI.io, MetalpriceAPI, Metals.live
        // const commodities = [
        //   { id: 'xauusd', symbol: 'XAU/USD', name: 'Gold / US Dollar', rate: 4189.00, flag: '🥇' },
        //   { id: 'xagusd', symbol: 'XAG/USD', name: 'Silver / US Dollar', rate: 31.50, flag: '🥈' },
        // ];

        const forexPairs = [
          // ...commodities, // Descomentar quando implementar API de commodities
          {
            id: 'eurusd',
            symbol: 'EUR/USD',
            name: 'Euro / US Dollar',
            rate: 1 / rates.EUR,
            flag: '🇪🇺'
          },
          {
            id: 'gbpusd',
            symbol: 'GBP/USD',
            name: 'British Pound / US Dollar',
            rate: 1 / rates.GBP,
            flag: '🇬🇧'
          },
          {
            id: 'usdjpy',
            symbol: 'USD/JPY',
            name: 'US Dollar / Japanese Yen',
            rate: rates.JPY,
            flag: '🇯🇵'
          },
          {
            id: 'usdchf',
            symbol: 'USD/CHF',
            name: 'US Dollar / Swiss Franc',
            rate: rates.CHF,
            flag: '🇨🇭'
          },
          {
            id: 'audusd',
            symbol: 'AUD/USD',
            name: 'Australian Dollar / US Dollar',
            rate: 1 / rates.AUD,
            flag: '🇦🇺'
          },
          {
            id: 'usdcad',
            symbol: 'USD/CAD',
            name: 'US Dollar / Canadian Dollar',
            rate: rates.CAD,
            flag: '🇨🇦'
          },
          {
            id: 'nzdusd',
            symbol: 'NZD/USD',
            name: 'New Zealand Dollar / US Dollar',
            rate: 1 / rates.NZD,
            flag: '🇳🇿'
          },
          {
            id: 'usdmxn',
            symbol: 'USD/MXN',
            name: 'US Dollar / Mexican Peso',
            rate: rates.MXN,
            flag: '🇲🇽'
          },
          {
            id: 'usdbrl',
            symbol: 'USD/BRL',
            name: 'US Dollar / Brazilian Real',
            rate: rates.BRL,
            flag: '🇧🇷'
          },
          {
            id: 'usdcny',
            symbol: 'USD/CNY',
            name: 'US Dollar / Chinese Yuan',
            rate: rates.CNY,
            flag: '🇨🇳'
          },
          {
            id: 'usdinr',
            symbol: 'USD/INR',
            name: 'US Dollar / Indian Rupee',
            rate: rates.INR,
            flag: '🇮🇳'
          },
          {
            id: 'usdkrw',
            symbol: 'USD/KRW',
            name: 'US Dollar / South Korean Won',
            rate: rates.KRW,
            flag: '🇰🇷'
          },
          {
            id: 'usdsgd',
            symbol: 'USD/SGD',
            name: 'US Dollar / Singapore Dollar',
            rate: rates.SGD,
            flag: '🇸🇬'
          },
          {
            id: 'usdhkd',
            symbol: 'USD/HKD',
            name: 'US Dollar / Hong Kong Dollar',
            rate: rates.HKD,
            flag: '🇭🇰'
          },
          {
            id: 'usdsek',
            symbol: 'USD/SEK',
            name: 'US Dollar / Swedish Krona',
            rate: rates.SEK,
            flag: '🇸🇪'
          },
          {
            id: 'usdnok',
            symbol: 'USD/NOK',
            name: 'US Dollar / Norwegian Krone',
            rate: rates.NOK,
            flag: '🇳🇴'
          },
          {
            id: 'usddkk',
            symbol: 'USD/DKK',
            name: 'US Dollar / Danish Krone',
            rate: rates.DKK,
            flag: '🇩🇰'
          },
          {
            id: 'usdpln',
            symbol: 'USD/PLN',
            name: 'US Dollar / Polish Zloty',
            rate: rates.PLN,
            flag: '🇵🇱'
          },
          {
            id: 'usdtry',
            symbol: 'USD/TRY',
            name: 'US Dollar / Turkish Lira',
            rate: rates.TRY,
            flag: '🇹🇷'
          },
          {
            id: 'usdzar',
            symbol: 'USD/ZAR',
            name: 'US Dollar / South African Rand',
            rate: rates.ZAR,
            flag: '🇿🇦'
          },
        ];

        const forexData = forexPairs.map((pair, index) => {
          const randomChange = (Math.random() - 0.5) * 0.5;

          return {
            id: pair.id,
            symbol: pair.symbol,
            name: pair.name,
            current_price: parseFloat(pair.rate.toFixed(4)),
            price_change_percentage_24h: parseFloat(randomChange.toFixed(2)),
            high_24h: parseFloat((pair.rate * 1.002).toFixed(4)),
            low_24h: parseFloat((pair.rate * 0.998).toFixed(4)),
            flag: pair.flag,
            market_cap: 0,
            image: 'https://via.placeholder.com/32',
            market_cap_rank: index + 1,
          };
        });

        await db.collection('market_cache').doc('forex').set({
          data: forexData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'exchangerate-api',
        });
        forexCount = forexData.length;
      }
    } catch (forexError) {
      console.error('⚠️ Erro no forex:', forexError.message);
    }

    // ═══ 4. CALENDÁRIO ECONÔMICO (Finnhub API) ═══
    let calendarCount = 0;
    try {
      const finnhubApiKey = process.env.FINNHUB_API_KEY || process.env.TRADING_ECONOMICS_KEY;

      if (!finnhubApiKey) {
        console.error('❌ FINNHUB_API_KEY não configurada');
        throw new Error('Finnhub API key not configured');
      }

      const calendarResponse = await axios.get('https://finnhub.io/api/v1/calendar/economic', {
        params: {
          token: finnhubApiKey,
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; AlanoCryptoFX/1.0)',
        },
      });

      let calendarData = [];
      if (calendarResponse.data && calendarResponse.data.economicCalendar) {
        const relevantCountries = ['US', 'EU', 'GB', 'CN', 'JP', 'CA', 'AU'];

        const impactToImportance = (impact) => {
          const impactLower = (impact || '').toLowerCase();
          if (impactLower === 'high') return 3;
          if (impactLower === 'medium') return 2;
          return 1;
        };

        const filteredEvents = calendarResponse.data.economicCalendar.filter(event =>
          relevantCountries.includes(event.country)
        );

        calendarData = filteredEvents.map(event => ({
          id: `${event.time}_${event.event}_${event.country}`,
          date: event.time,
          country: event.country,
          category: event.event,
          event: event.event,
          reference: '',
          source: 'Finnhub',
          actual: event.actual !== null ? event.actual : '',
          previous: event.prev !== null ? event.prev : '',
          forecast: event.estimate !== null ? event.estimate : '',
          importance: impactToImportance(event.impact),
          currency: event.country,
          unit: event.unit || '',
          impact: event.impact || 'low',
          isUS: event.country === 'US',
        }));

        calendarData.sort((a, b) => {
          if (a.isUS && !b.isUS) return -1;
          if (!a.isUS && b.isUS) return 1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
      }

      await db.collection('market_cache').doc('economic_calendar').set({
        data: calendarData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'finnhub',
        marketFocus: 'US',
      });
      calendarCount = calendarData.length;
    } catch (calError) {
      console.error('⚠️ Erro no calendário:', calError.message);
      if (calError.response) {
        console.error('⚠️ Response status:', calError.response.status);
      }
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
      forex: forexCount,
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
exports.getGlobalCryptoData = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
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
exports.getCryptoMarkets = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
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
exports.searchCrypto = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
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
exports.getStocksData = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
  try {
    console.log('📈 [getStocksData] Buscando dados de ações via Twelve Data...');

    const apiKey = '4be61c2528dd4e1a8ad18e41abfe92ea';
    const symbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
      'META', 'NVDA', 'NFLX', 'AMD', 'INTC',
      'DIS', 'BA', 'JPM', 'V', 'MA',
      'PYPL', 'SHOP', 'SQ', 'COIN', 'HOOD'
    ];

    const companyNames = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corp.',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms',
      'NVDA': 'NVIDIA Corp.',
      'NFLX': 'Netflix Inc.',
      'AMD': 'AMD Inc.',
      'INTC': 'Intel Corp.',
      'DIS': 'Walt Disney Co.',
      'BA': 'Boeing Co.',
      'JPM': 'JPMorgan Chase',
      'V': 'Visa Inc.',
      'MA': 'Mastercard Inc.',
      'PYPL': 'PayPal Holdings',
      'SHOP': 'Shopify Inc.',
      'SQ': 'Block Inc.',
      'COIN': 'Coinbase Global',
      'HOOD': 'Robinhood Markets',
    };

    const marketCaps = {
      'AAPL': 2950000000000,
      'MSFT': 2810000000000,
      'GOOGL': 1780000000000,
      'AMZN': 1850000000000,
      'TSLA': 758000000000,
      'META': 1290000000000,
      'NVDA': 1220000000000,
      'NFLX': 265000000000,
      'AMD': 230000000000,
      'INTC': 185000000000,
      'DIS': 165000000000,
      'BA': 125000000000,
      'JPM': 565000000000,
      'V': 575000000000,
      'MA': 425000000000,
      'PYPL': 68000000000,
      'SHOP': 95000000000,
      'SQ': 45000000000,
      'COIN': 38000000000,
      'HOOD': 12000000000,
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

exports.getForexData = onRequest({
  cors: true,
  memory: '128MiB',
  timeoutSeconds: 60
}, async (req, res) => {
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
      { from: 'EUR', to: 'CHF', name: 'EUR/CHF' },
      { from: 'GBP', to: 'CHF', name: 'GBP/CHF' },
      { from: 'AUD', to: 'JPY', name: 'AUD/JPY' },
      { from: 'NZD', to: 'JPY', name: 'NZD/JPY' },
      { from: 'EUR', to: 'AUD', name: 'EUR/AUD' },
      { from: 'GBP', to: 'AUD', name: 'GBP/AUD' },
      { from: 'EUR', to: 'CAD', name: 'EUR/CAD' },
      { from: 'GBP', to: 'CAD', name: 'GBP/CAD' },
      { from: 'AUD', to: 'CAD', name: 'AUD/CAD' },
      { from: 'CHF', to: 'JPY', name: 'CHF/JPY' },
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

// ═══════════════════════════════════════════════════════════════════════════════
// RECUPERAÇÃO DE SENHA - Enviar código por email
// ═══════════════════════════════════════════════════════════════════════════════
exports.sendPasswordResetCode = onCall({
  memory: '128MiB',
  timeoutSeconds: 60
}, async (request) => {
  console.log('🔐 [sendPasswordResetCode] Iniciando...');

  try {
    const { email } = request.data;

    if (!email || !email.includes('@')) {
      console.error('❌ Email inválido:', email);
      throw new Error('Email inválido');
    }

    const emailLower = email.toLowerCase().trim();
    console.log('📧 Email:', emailLower);

    // Verificar se usuário existe no Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(emailLower);
      console.log('✅ Usuário encontrado:', userRecord.uid);
    } catch (error) {
      console.error('❌ Usuário não encontrado:', emailLower);
      throw new Error('Email não cadastrado');
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔢 Código gerado:', code);

    // Salvar código no Firestore com expiração de 10 minutos
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 10 * 60 * 1000 // 10 minutos
    );

    await admin.firestore().collection('password_reset_codes').doc(emailLower).set({
      code: code,
      email: emailLower,
      expiresAt: expiresAt,
      createdAt: now,
      used: false,
    });
    console.log('💾 Código salvo no Firestore');

    // Template HTML do email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background-color: #0f1419;
            color: #ffffff;
            padding: 20px;
            margin: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1a1f26;
            border-radius: 16px;
            padding: 32px;
            text-align: center;
          }
          .logo {
            color: #16a34a;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 24px;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          .title {
            font-size: 24px;
            color: #fff;
            margin-bottom: 12px;
            font-weight: bold;
          }
          .message {
            color: #9ca3af;
            line-height: 1.6;
            margin-bottom: 24px;
            font-size: 16px;
          }
          .code-box {
            background-color: #0f1419;
            border: 2px solid #16a34a;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
          }
          .code {
            font-size: 40px;
            font-weight: bold;
            letter-spacing: 10px;
            color: #16a34a;
            font-family: 'Courier New', monospace;
          }
          .expiration {
            color: #f59e0b;
            font-size: 14px;
            margin-top: 16px;
          }
          .warning {
            background-color: #1f2937;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            text-align: left;
            border-radius: 0 8px 8px 0;
          }
          .warning-text {
            color: #9ca3af;
            font-size: 14px;
            margin: 0;
          }
          .footer {
            margin-top: 32px;
            color: #6b7280;
            font-size: 12px;
            border-top: 1px solid #374151;
            padding-top: 24px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">AlanoCryptoFX</div>
          <div class="icon">🔐</div>
          <div class="title">Recuperação de Senha</div>
          <div class="message">
            Você solicitou a recuperação de senha da sua conta.<br>
            Use o código abaixo para redefinir sua senha:
          </div>

          <div class="code-box">
            <div class="code">${code}</div>
            <div class="expiration">
              ⏱️ Este código expira em 10 minutos
            </div>
          </div>

          <div class="warning">
            <p class="warning-text">
              <strong>⚠️ Atenção:</strong> Se você não solicitou esta recuperação, ignore este email.
            </p>
          </div>

          <div class="footer">
            <p>© ${new Date().getFullYear()} AlanoCryptoFX. Todos os direitos reservados.</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email via Resend
    console.log('📮 Enviando email de recuperação...');

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: emailLower,
      subject: '🔐 Código de Recuperação de Senha - AlanoCryptoFX',
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Erro ao enviar email:', error);
      throw new Error('Erro ao enviar email');
    }

    console.log(`✅ Código de recuperação enviado para: ${emailLower}`);

    return { success: true, message: 'Código enviado com sucesso' };
  } catch (error) {
    console.error('❌ Erro em sendPasswordResetCode:', error);
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECUPERAÇÃO DE SENHA - Verificar código e resetar senha
// ═══════════════════════════════════════════════════════════════════════════════
exports.verifyPasswordResetCode = onCall({
  memory: '128MiB',
  timeoutSeconds: 60
}, async (request) => {
  console.log('🔑 [verifyPasswordResetCode] Iniciando...');

  try {
    const { email, code, newPassword } = request.data;

    if (!email || !code || !newPassword) {
      console.error('❌ Dados incompletos');
      throw new Error('Dados incompletos');
    }

    // Validação de senha forte
    // Requisitos: mínimo 8 caracteres, maiúscula, minúscula, número e símbolo
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      console.error('❌ Senha não atende aos requisitos');
      throw new Error('Senha deve ter mínimo 8 caracteres com: maiúscula, minúscula, número e símbolo');
    }

    const emailLower = email.toLowerCase().trim();
    console.log('📧 Email:', emailLower);
    console.log('🔢 Código recebido:', code);

    // Buscar código no Firestore
    const codeDoc = await admin.firestore()
      .collection('password_reset_codes')
      .doc(emailLower)
      .get();

    if (!codeDoc.exists) {
      console.error('❌ Código não encontrado para:', emailLower);
      throw new Error('Código não encontrado. Solicite um novo código.');
    }

    const codeData = codeDoc.data();

    // Validar se código já foi usado
    if (codeData.used) {
      console.error('❌ Código já utilizado');
      throw new Error('Código já utilizado. Solicite um novo código.');
    }

    // Validar expiração
    const now = new Date();
    const expiresAt = codeData.expiresAt.toDate();

    if (now > expiresAt) {
      console.error('❌ Código expirado');
      throw new Error('Código expirado. Solicite um novo código.');
    }

    // Validar código
    if (codeData.code !== code) {
      console.error('❌ Código incorreto. Esperado:', codeData.code, 'Recebido:', code);
      throw new Error('Código incorreto');
    }

    console.log('✅ Código válido!');

    // Buscar usuário e atualizar senha
    const userRecord = await admin.auth().getUserByEmail(emailLower);
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword,
    });

    console.log('✅ Senha atualizada para usuário:', userRecord.uid);

    // Marcar código como usado
    await admin.firestore()
      .collection('password_reset_codes')
      .doc(emailLower)
      .update({
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Código marcado como usado');

    return { success: true, message: 'Senha alterada com sucesso' };
  } catch (error) {
    console.error('❌ Erro em verifyPasswordResetCode:', error);
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════
// FUNÇÕES DE THROTTLING PARA CHAT MESSAGES
// ═══════════════════════════════════════════════════════════

async function checkRateLimit(userId, maxPerHour = 4) {
  try {
    const now = admin.firestore.Timestamp.now();
    const oneHourAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - (60 * 60 * 1000)
    );

    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) return false;

    const userData = userDoc.data();
    const notificationCount = userData.notificationCount || {};
    const lastHourCount = notificationCount.lastHour || 0;
    const lastUpdate = notificationCount.lastUpdate;

    if (lastUpdate && lastUpdate.toMillis() < oneHourAgo.toMillis()) {
      await admin.firestore().collection('users').doc(userId).update({
        'notificationCount.lastHour': 0,
        'notificationCount.lastUpdate': now,
      });
      return true;
    }

    if (lastHourCount >= maxPerHour) {
      console.log(`⚠️ Rate limit atingido para usuário ${userId}: ${lastHourCount}/${maxPerHour}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`❌ Erro ao verificar rate limit: ${error}`);
    return false;
  }
}

async function incrementRateLimitCounter(userId) {
  try {
    const now = admin.firestore.Timestamp.now();

    await admin.firestore().collection('users').doc(userId).update({
      'notificationCount.lastHour': admin.firestore.FieldValue.increment(1),
      'notificationCount.lastUpdate': now,
      'notificationCount.today': admin.firestore.FieldValue.increment(1),
    });
  } catch (error) {
    console.error(`❌ Erro ao incrementar contador: ${error}`);
  }
}

exports.sendBatchedChatNotifications = onSchedule({
  schedule: 'every 15 minutes',
  timeZone: 'America/Sao_Paulo',
  retryCount: 2,
}, async (event) => {
  console.log('🔄 Iniciando envio de notificações de chat em lote...');

  try {
    const now = admin.firestore.Timestamp.now();
    const fifteenMinAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - (15 * 60 * 1000)
    );

    const messagesSnapshot = await admin.firestore()
      .collection('chat_messages')
      .where('timestamp', '>=', fifteenMinAgo)
      .where('notificationSent', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();

    if (messagesSnapshot.empty) {
      console.log('⚠️ Nenhuma mensagem nova para notificar');
      return null;
    }

    console.log(`📊 ${messagesSnapshot.size} mensagens novas encontradas`);

    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('approved', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('⚠️ Nenhum usuário aprovado encontrado');
      return null;
    }

    const userPrefs = {};
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const prefs = userData.notificationPreferences || {};

      if (prefs.chatMessages === true && userData.fcmToken) {
        userPrefs[doc.id] = {
          fcmToken: userData.fcmToken,
          displayName: userData.displayName,
        };
      }
    });

    const usersToNotify = Object.keys(userPrefs);
    console.log(`👥 ${usersToNotify.length} usuários com notificações de chat ativas`);

    if (usersToNotify.length === 0) {
      const batch = admin.firestore().batch();
      messagesSnapshot.forEach(doc => {
        batch.update(doc.ref, { notificationSent: true });
      });
      await batch.commit();
      return null;
    }

    const messageCount = messagesSnapshot.size;
    const notificationPromises = [];

    for (const userId of usersToNotify) {
      const userInfo = userPrefs[userId];
      const message = {
        token: userInfo.fcmToken,
        notification: {
          title: '💬 AlanoCryptoFX',
          body: messageCount === 1
            ? '1 nova mensagem no chat'
            : `${messageCount} novas mensagens no chat`,
        },
        data: {
          type: 'chat_batch',
          messageCount: messageCount.toString(),
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'chat_messages',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: messageCount,
            },
          },
        },
        webpush: {
          notification: {
            icon: '/icon-192x192.png',
            badge: '/badge.png',
          },
        },
      };

      const promise = admin.messaging().send(message)
        .then((response) => {
          console.log(`✅ Notificação enviada para ${userId}: ${response}`);
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

          return null;
        });

      notificationPromises.push(promise);
    }

    await Promise.all(notificationPromises);

    const batch = admin.firestore().batch();
    messagesSnapshot.forEach(doc => {
      batch.update(doc.ref, { notificationSent: true });
    });
    await batch.commit();

    console.log(`✅ Processamento concluído: ${notificationPromises.length} notificações enviadas`);
    console.log(`📝 ${messagesSnapshot.size} mensagens marcadas como notificadas`);

    return null;

  } catch (error) {
    console.error('❌ Erro crítico ao processar notificações em lote:', error);
    return null;
  }
});

exports.resetDailyNotificationCounters = onSchedule({
  schedule: 'every day 00:00',
  timeZone: 'America/Sao_Paulo',
}, async (event) => {
  console.log('🧹 Limpando contadores diários de notificação...');

  try {
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .get();

    const batch = admin.firestore().batch();
    let count = 0;

    usersSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        'notificationCount.today': 0,
        'notificationCount.lastUpdate': admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
    });

    await batch.commit();
    console.log(`✅ Contadores resetados para ${count} usuários`);

    return null;
  } catch (error) {
    console.error('❌ Erro ao resetar contadores:', error);
    return null;
  }
});

exports.sendChatDigestEmail = onSchedule({
  schedule: '0 9,17 * * *',
  timeZone: 'America/Sao_Paulo',
  memory: '128MiB',
  timeoutSeconds: 300
}, async (event) => {
  try {
    console.log('📧 [sendChatDigestEmail] Iniciando envio de digest...');

    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const twelveHoursAgo = new Date(now.toDate().getTime() - (12 * 60 * 60 * 1000));

    const usersSnapshot = await db.collection('users')
      .where('emailNotifications', '==', true)
      .get();

    if (usersSnapshot.empty) {
      console.log('Nenhum usuário com notificações por email');
      return null;
    }

    let emailsSent = 0;
    let errors = 0;

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const userEmail = userData.email;

        if (!userEmail) continue;

        const lastAccess = userData.lastAccess?.toDate() || new Date(0);
        if (lastAccess > twelveHoursAgo) {
          console.log(`⏭️  User ${userId} acessou recentemente, pulando`);
          continue;
        }

        const unreadMessagesSnapshot = await db.collection('chat_messages')
          .where('timestamp', '>', admin.firestore.Timestamp.fromDate(twelveHoursAgo))
          .where('userId', '!=', userId)
          .orderBy('userId')
          .orderBy('timestamp', 'desc')
          .limit(100)
          .get();

        if (unreadMessagesSnapshot.empty) {
          console.log(`📭 Nenhuma mensagem não lida para ${userId}`);
          continue;
        }

        const unreadCount = unreadMessagesSnapshot.size;
        const recentMessages = unreadMessagesSnapshot.docs.slice(0, 5);

        const messagesHtml = recentMessages.map(doc => {
          const msg = doc.data();
          return `
            <div style="padding: 12px; margin: 8px 0; background-color: #0f1419; border-left: 3px solid #00ff88; border-radius: 4px;">
              <div style="font-weight: bold; color: #00ff88; margin-bottom: 4px;">${msg.userName || 'Usuário'}</div>
              <div style="color: #ccc;">${msg.text || ''}</div>
              <div style="color: #666; font-size: 12px; margin-top: 4px;">${msg.timestamp?.toDate().toLocaleString('pt-BR') || ''}</div>
            </div>
          `;
        }).join('');

        const moreMessages = unreadCount > 5 ? `<p style="color: #888; text-align: center; margin: 16px 0;">E mais ${unreadCount - 5} mensagens...</p>` : '';

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #0f1419;
                color: #ffffff;
                padding: 20px;
                margin: 0;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #1a1f26;
                border-radius: 12px;
                padding: 24px;
              }
              .header {
                text-align: center;
                margin-bottom: 24px;
              }
              .logo {
                color: #00ff88;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 8px;
              }
              .subtitle {
                color: #888;
                font-size: 14px;
              }
              .badge {
                display: inline-block;
                background-color: #00ff88;
                color: #000;
                padding: 4px 12px;
                border-radius: 12px;
                font-weight: bold;
                font-size: 14px;
              }
              .button {
                display: inline-block;
                background-color: #00ff88;
                color: #000;
                padding: 12px 24px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: bold;
                margin-top: 16px;
              }
              .footer {
                text-align: center;
                margin-top: 24px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">AlanoCryptoFX</div>
                <div class="subtitle">💬 Resumo do Chat</div>
              </div>

              <p style="color: #fff; font-size: 16px;">
                Você tem <span class="badge">${unreadCount} ${unreadCount === 1 ? 'mensagem não lida' : 'mensagens não lidas'}</span> na comunidade!
              </p>

              <p style="color: #ccc; margin: 16px 0;">
                Últimas mensagens:
              </p>

              ${messagesHtml}
              ${moreMessages}

              <center>
                <a href="https://alanocryptofx.com.br" class="button">Abrir App</a>
              </center>

              <div class="footer">
                <p>Você recebe este resumo 2x ao dia (9h e 17h) quando há mensagens não lidas.</p>
                <p>Para desativar, acesse as configurações do seu perfil no app.</p>
                <p style="margin-top: 16px;">© 2025 AlanoCryptoFX. Todos os direitos reservados.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const { error } = await resend.emails.send({
          from: EMAIL_FROM,
          to: userEmail,
          subject: `💬 Você tem ${unreadCount} ${unreadCount === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`,
          html: htmlContent,
        });

        if (error) {
          console.error(`❌ Erro ao enviar para ${userEmail}:`, error);
          errors++;
        } else {
          console.log(`✅ Email enviado para ${userEmail}`);
          emailsSent++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (userError) {
        console.error(`❌ Erro processando usuário:`, userError);
        errors++;
      }
    }

    console.log(`📊 [sendChatDigestEmail] Resumo: ${emailsSent} emails enviados, ${errors} erros`);
    return null;

  } catch (error) {
    console.error('❌ [sendChatDigestEmail] Erro fatal:', error);
    return null;
  }
});

exports.migrateUserEmailFields = onRequest({
  cors: true,
  memory: '256MiB',
  timeoutSeconds: 540
}, async (req, res) => {
  try {
    console.log('🔄 Iniciando migração de campos de email...');

    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef.get();

    console.log(`📊 Total de usuários: ${snapshot.size}`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const batch = admin.firestore().batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;

      const updates = {};
      let needsUpdate = false;

      if (userData.emailNotifications === undefined) {
        updates.emailNotifications = true;
        needsUpdate = true;
        console.log(`✅ ${userData.displayName || userId}: adicionando emailNotifications`);
      }

      if (!userData.notificationPreferences) {
        updates.notificationPreferences = {
          posts: true,
          postsEmail: true,
          signals: true,
          signalsEmail: true,
          mentions: true,
          mentionsEmail: true,
          chatMessages: false,
          chatMessagesThrottle: {
            enabled: true,
            maxPerHour: 4,
            batchInterval: 15
          }
        };
        needsUpdate = true;
        console.log(`✅ ${userData.displayName || userId}: adicionando notificationPreferences`);
      } else {
        const prefs = userData.notificationPreferences;
        if (prefs.postsEmail === undefined) {
          updates['notificationPreferences.postsEmail'] = true;
          needsUpdate = true;
        }
        if (prefs.signalsEmail === undefined) {
          updates['notificationPreferences.signalsEmail'] = true;
          needsUpdate = true;
        }
        if (prefs.mentionsEmail === undefined) {
          updates['notificationPreferences.mentionsEmail'] = true;
          needsUpdate = true;
        }
        if (needsUpdate) {
          console.log(`✅ ${userData.displayName || userId}: adicionando campos *Email`);
        }
      }

      if (needsUpdate) {
        batch.update(doc.ref, updates);
        batchCount++;
        updated++;

        if (batchCount >= 500) {
          await batch.commit();
          console.log(`💾 Batch commit: ${batchCount} documentos`);
          batchCount = 0;
        }
      } else {
        skipped++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Batch commit final: ${batchCount} documentos`);
    }

    const result = {
      success: true,
      totalUsers: snapshot.size,
      updated: updated,
      skipped: skipped,
      errors: errors,
      message: `Migração concluída: ${updated} atualizados, ${skipped} já tinham os campos`
    };

    console.log('✅ Migração concluída:', result);
    return res.json(result);

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

exports.processTelegramSignal = onRequest({
  memory: '256MiB',
  timeoutSeconds: 60,
  cors: true
}, async (req, res) => {
  console.log('🤖 [processTelegramSignal] Recebendo sinal do Telegram...');

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Método não permitido. Use POST.'
      });
    }

    const { coin, type, entry, strategy, rsiValue, timeframe, status, confidence } = req.body;

    console.log('📊 Dados do sinal:', {
      coin,
      type,
      entry,
      strategy,
      rsiValue,
      timeframe,
      status,
      confidence
    });

    if (!coin || !type || !entry || !strategy || !rsiValue || !timeframe) {
      console.error('❌ Dados incompletos');
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos. Campos obrigatórios: coin, type, entry, strategy, rsiValue, timeframe'
      });
    }

    const signalData = {
      coin,
      type,
      entry,
      strategy,
      rsiValue,
      timeframe,
      status: status || 'Ativo',
      confidence: confidence || 'Alta',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    console.log('💾 Salvando sinal no Firestore...');
    const signalRef = await admin.firestore().collection('signals').add(signalData);
    console.log('✅ Sinal salvo com ID:', signalRef.id);

    console.log('📲 Enviando notificação FCM para todos os usuários...');
    const usersSnapshot = await admin.firestore().collection('users').get();
    const tokens = [];

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.fcmToken) {
        tokens.push(userData.fcmToken);
      }
    });

    console.log(`📱 ${tokens.length} tokens encontrados`);

    if (tokens.length > 0) {
      const typeEmoji = type === 'LONG' ? '🟢' : '🔴';
      const typeText = type === 'LONG' ? 'COMPRA' : 'VENDA';

      const message = {
        notification: {
          title: `${typeEmoji} Novo Sinal: ${coin}`,
          body: `${typeText} em ${entry} | ${strategy}`
        },
        data: {
          signalId: signalRef.id,
          coin: coin,
          type: type,
          entry: entry,
          strategy: strategy,
          rsiValue: rsiValue,
          timeframe: timeframe
        },
        tokens: tokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ Notificações enviadas: ${response.successCount} sucesso, ${response.failureCount} falhas`);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokens[idx]);
            console.error('❌ Falha ao enviar para:', tokens[idx], resp.error);
          }
        });
      }
    } else {
      console.log('⚠️ Nenhum token FCM encontrado');
    }

    return res.json({
      success: true,
      signalId: signalRef.id,
      notificationsSent: tokens.length,
      message: 'Sinal processado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao processar sinal:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════
// LIMPEZA AUTOMÁTICA DE SINAIS ANTIGOS (> 1 hora)
// ═══════════════════════════════════════════════════════════

exports.cleanupOldSignals = onSchedule({
  schedule: 'every 15 minutes',
  timeZone: 'America/Sao_Paulo',
  memory: '256MiB',
  timeoutSeconds: 120
}, async (event) => {
  try {
    console.log('🧹 Iniciando limpeza de sinais antigos...');

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const db = admin.firestore();
    const signalsRef = db.collection('signals');

    const oldSignalsSnapshot = await signalsRef
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(oneHourAgo))
      .get();

    if (oldSignalsSnapshot.empty) {
      console.log('✅ Nenhum sinal antigo para deletar');
      return null;
    }

    console.log(`🗑️ Encontrados ${oldSignalsSnapshot.size} sinais para deletar`);

    const batch = db.batch();
    let deletedCount = 0;

    oldSignalsSnapshot.forEach(doc => {
      console.log(`  ❌ Deletando sinal: ${doc.id} - ${doc.data().coin} (${doc.data().createdAt.toDate()})`);
      batch.delete(doc.ref);
      deletedCount++;
    });

    await batch.commit();

    console.log(`✅ ${deletedCount} sinais deletados com sucesso`);
    return null;

  } catch (error) {
    console.error('❌ Erro ao limpar sinais antigos:', error);
    return null;
  }
});
