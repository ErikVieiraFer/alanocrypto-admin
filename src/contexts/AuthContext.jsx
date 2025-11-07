import { createContext, useContext, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Monitorar estado de autenticação do Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verificar se é admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (userData?.isAdmin === true) {
          setCurrentUser(user);
        } else {
          // Se não for admin, fazer logout automático
          console.warn('Usuário sem permissão de administrador');
          await firebaseSignOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    try {
      // Login REAL com Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Verificar se o usuário é admin no Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();

      if (userData?.isAdmin !== true) {
        // Se não for admin, fazer logout e retornar erro
        await firebaseSignOut(auth);
        return {
          success: false,
          error: 'Acesso negado. Apenas administradores podem acessar este painel.'
        };
      }

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Erro no login:', error);

      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        return { success: false, error: 'Email ou senha incorretos' };
      }

      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    loading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
