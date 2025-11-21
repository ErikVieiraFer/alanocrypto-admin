import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { logAction, ACTIONS } from './auditService';

const COLLECTION_NAME = 'alano_posts';

export const uploadImage = async (file, postId) => {
  try {
    // Gerar nome único baseado em timestamp para evitar cache
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `image_${timestamp}.${fileExtension}`;

    const storageRef = ref(storage, `alano_posts/${postId}/${fileName}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    console.log('✅ Upload completo:', downloadURL);
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: error.message };
  }
};

export const deleteImage = async (postId) => {
  try {
    // Tentar deletar o formato antigo (compatibilidade)
    try {
      const oldStorageRef = ref(storage, `alano_posts/${postId}/image.jpg`);
      await deleteObject(oldStorageRef);
    } catch (err) {
      // Ignorar erro se não existir
      console.log('Imagem antiga não encontrada (normal)');
    }

    // Nota: Para deletar todas as imagens, seria necessário listar o diretório
    // O Firebase Storage Web SDK não suporta listAll diretamente de forma simples
    // Por isso mantemos tentativa de deletar formato antigo
    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

export const createPost = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      likes: 0,
      views: 0,
      createdAt: serverTimestamp(),
      notificationSent: false, // Inicializar campo para Cloud Function
    });

    await logAction(ACTIONS.CREATE_POST, {
      postId: docRef.id,
      title: data.title
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating post:', error);
    return { success: false, error: error.message };
  }
};

export const updatePost = async (id, data) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);

    await logAction(ACTIONS.UPDATE_POST, { postId: id });

    return { success: true };
  } catch (error) {
    console.error('Error updating post:', error);
    return { success: false, error: error.message };
  }
};

export const deletePost = async (id) => {
  try {
    // Delete image if exists
    await deleteImage(id);
    // Delete document
    await deleteDoc(doc(db, COLLECTION_NAME, id));

    await logAction(ACTIONS.DELETE_POST, { postId: id });

    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { success: false, error: error.message };
  }
};

export const getPosts = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const posts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(posts);
    },
    (error) => {
      console.error('Error fetching posts:', error);
      callback([]);
    }
  );
};
