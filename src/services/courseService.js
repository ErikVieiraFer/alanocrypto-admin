import { db, storage } from '../config/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const COLLECTION_NAME = 'courses';

// Validação de URL do YouTube
const isValidYouTubeUrl = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return youtubeRegex.test(url);
};

// Extrair ID do vídeo do YouTube
export const extractYouTubeId = (url) => {
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

// Validação dos dados do curso
const validateCourseData = (courseData, isNew = true) => {
  const errors = [];

  if (!courseData.title || courseData.title.trim() === '') {
    errors.push('Título é obrigatório');
  }

  // description é opcional

  if (!courseData.videoUrl || courseData.videoUrl.trim() === '') {
    errors.push('URL do YouTube é obrigatória');
  } else if (!isValidYouTubeUrl(courseData.videoUrl)) {
    errors.push('URL do YouTube inválida');
  }

  // thumbnailUrl é opcional - Flutter usa thumbnail do YouTube quando null

  return errors;
};

// Buscar todos os cursos
export const getAllCourses = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    const courses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, data: courses };
  } catch (error) {
    console.error('Erro ao buscar cursos:', error);
    return { success: false, error: error.message };
  }
};

// Criar novo curso
export const createCourse = async (courseData) => {
  try {
    const errors = validateCourseData(courseData, true);
    if (errors.length > 0) {
      return { success: false, error: errors.join(', ') };
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      title: courseData.title.trim(),
      description: courseData.description?.trim() || '', // opcional
      videoUrl: courseData.videoUrl.trim(),
      thumbnailUrl: courseData.thumbnailUrl || null, // null = usa thumbnail do YouTube
      order: courseData.order || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, data: { id: docRef.id } };
  } catch (error) {
    console.error('Erro ao criar curso:', error);
    return { success: false, error: error.message };
  }
};

// Atualizar curso existente
export const updateCourse = async (id, courseData) => {
  try {
    const errors = validateCourseData(courseData, false);
    if (errors.length > 0) {
      return { success: false, error: errors.join(', ') };
    }

    const updateData = {
      title: courseData.title.trim(),
      description: courseData.description?.trim() || '', // opcional
      videoUrl: courseData.videoUrl.trim(),
      order: courseData.order || 0,
      updatedAt: serverTimestamp(),
    };

    // Só atualiza thumbnail se uma nova foi enviada
    if (courseData.thumbnailUrl) {
      updateData.thumbnailUrl = courseData.thumbnailUrl;
    }

    await updateDoc(doc(db, COLLECTION_NAME, id), updateData);

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar curso:', error);
    return { success: false, error: error.message };
  }
};

// Deletar curso
export const deleteCourse = async (id, thumbnailUrl) => {
  try {
    // Deletar documento
    await deleteDoc(doc(db, COLLECTION_NAME, id));

    // Tentar deletar thumbnail do storage (se existir)
    if (thumbnailUrl && thumbnailUrl.includes('firebase')) {
      try {
        const thumbnailRef = ref(storage, thumbnailUrl);
        await deleteObject(thumbnailRef);
      } catch (storageError) {
        console.warn('Erro ao deletar thumbnail:', storageError);
        // Não falha a operação se não conseguir deletar a imagem
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar curso:', error);
    return { success: false, error: error.message };
  }
};

// Upload de thumbnail
export const uploadCourseThumbnail = async (file) => {
  try {
    if (!file) {
      return { success: false, error: 'Nenhum arquivo selecionado' };
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF.' };
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'Arquivo muito grande. Máximo 5MB.' };
    }

    // Criar nome único
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const filePath = `courses/thumbnails/${fileName}`;

    // Upload
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);

    // Obter URL
    const downloadUrl = await getDownloadURL(storageRef);

    return { success: true, data: { url: downloadUrl, path: filePath } };
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return { success: false, error: error.message };
  }
};
