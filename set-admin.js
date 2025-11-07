// Script para definir usuário como administrador
// Execute UMA VEZ com: node set-admin.js

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD25JZdaoYY2TUIKr3Ey3ylS9r-xrQ0d8U",
  authDomain: "alanocryptofx-v2.firebaseapp.com",
  projectId: "alanocryptofx-v2",
  storageBucket: "alanocryptofx-v2.firebasestorage.app",
  messagingSenderId: "508290889017",
  appId: "1:508290889017:web:4e7b52875cfee66008e4e8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'alanocryptoapp@gmail.com';
const ADMIN_PASSWORD = 'App123456@';

async function setAdmin() {
  try {
    console.log('🔧 Fazendo login como admin...');

    const userCredential = await signInWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );

    const user = userCredential.user;
    console.log('✅ Login bem-sucedido! UID:', user.uid);

    // Atualizar documento no Firestore
    const userRef = doc(db, 'users', user.uid);

    await setDoc(userRef, {
      isAdmin: true,
      email: ADMIN_EMAIL,
      displayName: 'Admin AlanoCrypto',
      updatedAt: new Date(),
    }, { merge: true });

    console.log('✅ Campo isAdmin: true adicionado ao Firestore!');
    console.log('\n📋 Usuário configurado como administrador:');
    console.log('Email:', ADMIN_EMAIL);
    console.log('UID:', user.uid);
    console.log('\n✅ Agora você pode fazer login no painel admin!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

setAdmin();
