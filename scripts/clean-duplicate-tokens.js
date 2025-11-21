const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanDuplicateTokens() {
  console.log('🧹 Limpando tokens duplicados...');

  const usersSnapshot = await db.collection('users').get();

  let cleaned = 0;
  let unchanged = 0;

  for (const doc of usersSnapshot.docs) {
    const userData = doc.data();

    // Se tem array de tokens (antigo), manter só o último
    if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
      const lastToken = userData.fcmTokens[userData.fcmTokens.length - 1];

      await doc.ref.update({
        fcmToken: lastToken,
        fcmTokens: admin.firestore.FieldValue.delete()
      });

      console.log(`✅ Usuário ${doc.id}: ${userData.fcmTokens.length} tokens → 1 token`);
      cleaned++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n✅ Limpeza concluída!`);
  console.log(`   ${cleaned} usuários corrigidos`);
  console.log(`   ${unchanged} usuários já estavam corretos`);
  console.log(`   Total: ${usersSnapshot.size} usuários`);

  process.exit(0);
}

cleanDuplicateTokens().catch((error) => {
  console.error('❌ Erro ao limpar tokens:', error);
  process.exit(1);
});
