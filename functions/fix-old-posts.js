/**
 * Script para corrigir posts antigos que não têm os campos de proteção
 * Execute com: node fix-old-posts.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();

const db = admin.firestore();

async function fixOldPosts() {
  console.log('🔧 Iniciando correção de posts antigos...\n');

  try {
    // Buscar todos os posts
    const postsSnapshot = await db
      .collection('alano_posts')
      .get();

    console.log(`📊 Total de posts encontrados: ${postsSnapshot.size}\n`);

    let updatedCount = 0;
    let alreadyOkCount = 0;

    const batch = db.batch();

    postsSnapshot.forEach((doc) => {
      const post = doc.data();

      // Se o post não tem NENHUM dos campos de proteção, adicionar AMBOS
      if (!post.notificationsProcessed && !post.notificationSent) {
        console.log(`✅ Atualizando post: ${doc.id} - "${post.title}"`);
        batch.update(doc.ref, {
          notificationsProcessed: true,
          notificationSent: true, // Compatibilidade
          notificationsProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updatedCount++;
      } else {
        // Se tem um mas não tem o outro, adicionar o que falta
        const updates = {};

        if (!post.notificationsProcessed && post.notificationSent) {
          updates.notificationsProcessed = true;
          console.log(`🔄 Adicionando notificationsProcessed: ${doc.id}`);
        }

        if (post.notificationsProcessed && !post.notificationSent) {
          updates.notificationSent = true;
          console.log(`🔄 Adicionando notificationSent: ${doc.id}`);
        }

        if (Object.keys(updates).length > 0) {
          updates.notificationsProcessedAt = admin.firestore.FieldValue.serverTimestamp();
          batch.update(doc.ref, updates);
          updatedCount++;
        } else {
          alreadyOkCount++;
        }
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
