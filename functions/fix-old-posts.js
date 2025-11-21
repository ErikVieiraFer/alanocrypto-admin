/**
 * Script para corrigir posts antigos que não têm o campo notificationSent
 * Execute com: node fix-old-posts.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();

const db = admin.firestore();

async function fixOldPosts() {
  console.log('🔧 Iniciando correção de posts antigos...\n');

  try {
    // Buscar todos os posts que não têm o campo notificationSent
    const postsSnapshot = await db
      .collection('alano_posts')
      .get();

    console.log(`📊 Total de posts encontrados: ${postsSnapshot.size}\n`);

    let updatedCount = 0;
    let alreadyOkCount = 0;

    const batch = db.batch();

    postsSnapshot.forEach((doc) => {
      const post = doc.data();

      // Se o post não tem o campo notificationSent, adicionar como true
      // (assumindo que posts antigos já enviaram notificação)
      if (post.notificationSent === undefined || post.notificationSent === null) {
        console.log(`✅ Atualizando post: ${doc.id} - "${post.title}"`);
        batch.update(doc.ref, {
          notificationSent: true,
          notificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updatedCount++;
      } else {
        alreadyOkCount++;
      }
    });

    // Commit do batch
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`\n✅ ${updatedCount} posts atualizados com sucesso!`);
    } else {
      console.log('\n✅ Nenhum post precisou ser atualizado!');
    }

    console.log(`✅ ${alreadyOkCount} posts já estavam OK\n`);
    console.log('🎉 Correção concluída!\n');

  } catch (error) {
    console.error('❌ Erro ao corrigir posts:', error);
  } finally {
    process.exit(0);
  }
}

// Executar
fixOldPosts();
