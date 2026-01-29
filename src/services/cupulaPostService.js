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
import { db, storage, auth } from '../config/firebase';
import { logAction, ACTIONS } from './auditService';

const COLLECTION_NAME = 'cupula_posts';

export const uploadImage = async (file, postId) => {
  try {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `image_${timestamp}.${fileExtension}`;

    const storageRef = ref(storage, `cupula_posts/${postId}/${fileName}`);
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
    try {
      const oldStorageRef = ref(storage, `cupula_posts/${postId}/image.jpg`);
      await deleteObject(oldStorageRef);
    } catch (err) {
      console.log('Imagem antiga não encontrada (normal)');
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

export const createPost = async (data) => {
  try {
    const currentUser = auth.currentUser;
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      title: data.title || '',
      excerpt: data.excerpt || '',
      content: data.content || '',
      imageUrl: data.imageUrl || null,
      authorId: currentUser?.uid || 'admin',
      authorName: 'Alano',
      views: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await logAction(ACTIONS.CREATE_CUPULA_POST, {
        postId: docRef.id,
        title: data.title,
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating cupula post:', error);
    return { success: false, error: error.message };
  }
};

export const updatePost = async (id, data) => {
  try {
    console.log('📝 Atualizando post:', id, 'com dados:', data);
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Post atualizado com sucesso');

    try {
      await logAction(ACTIONS.UPDATE_CUPULA_POST, { postId: id });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error updating cupula post:', error);
    return { success: false, error: error.message };
  }
};

export const deletePost = async (id) => {
  try {
    await deleteImage(id);
    await deleteDoc(doc(db, COLLECTION_NAME, id));

    try {
      await logAction(ACTIONS.DELETE_CUPULA_POST, { postId: id });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting cupula post:', error);
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
      console.error('Error fetching cupula posts:', error);
      callback([]);
    }
  );
};
