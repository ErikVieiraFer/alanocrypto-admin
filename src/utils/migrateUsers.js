import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function migrateExistingUsers() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    let updated = 0;

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();

      // Se não tem o campo 'approved', adicionar como true
      if (userData.approved === undefined) {
        await updateDoc(doc(db, 'users', userDoc.id), {
          approved: true,
          approvedAt: new Date(),
          approvedBy: 'migration'
        });
        updated++;
      }
    }

    console.log(`✅ ${updated} usuários migrados com sucesso!`);
    alert(`✅ ${updated} usuários migrados com sucesso!`);
    return updated;
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    alert(`❌ Erro na migração: ${error.message}`);
    throw error;
  }
}
