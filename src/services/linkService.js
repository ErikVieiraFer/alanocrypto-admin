import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'useful_links';

// Buscar todos os links
export const getAllLinks = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const links = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: links };
  } catch (error) {
    console.error('Erro ao buscar links:', error);
    return { success: false, error: error.message };
  }
};

// Criar novo link
export const createLink = async (linkData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...linkData,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Erro ao criar link:', error);
    return { success: false, error: error.message };
  }
};

// Atualizar link existente
export const updateLink = async (id, linkData) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...linkData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar link:', error);
    return { success: false, error: error.message };
  }
};

// Excluir link
export const deleteLink = async (id) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir link:', error);
    return { success: false, error: error.message };
  }
};

// Lista de ícones disponíveis
export const availableIcons = [
  { value: 'briefcase', label: 'Briefcase (Negócios)' },
  { value: 'trending_up', label: 'Trending Up (Gráfico)' },
  { value: 'currency_bitcoin', label: 'Bitcoin' },
  { value: 'video_library', label: 'Vídeo' },
  { value: 'camera_alt', label: 'Câmera' },
  { value: 'link', label: 'Link (Padrão)' },
  { value: 'school', label: 'Escola' },
  { value: 'chat', label: 'Chat' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
];
