import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../config/firebase';

const COLLECTION_NAME = 'news';

/**
 * Valida os dados da notícia
 */
const validateNewsData = (newsData) => {
  const errors = [];

  // Título obrigatório
  if (!newsData.title || newsData.title.trim() === '') {
    errors.push('Título é obrigatório');
  }

  // URL válida (se fornecida)
  if (newsData.url) {
    try {
      new URL(newsData.url);
    } catch (error) {
      errors.push('URL externa inválida');
    }
  }

  // Tags não vazias
  if (newsData.tags && Array.isArray(newsData.tags)) {
    const filteredTags = newsData.tags.filter(tag => tag.trim() !== '');
    if (filteredTags.length !== newsData.tags.length) {
      errors.push('Tags não podem estar vazias');
    }
  }

  return errors;
};

/**
 * Busca todas as notícias ordenadas por publishedAt DESC
 */
export const getAllNews = async () => {
  try {
    console.log('[newsService] Fetching all news...');
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('publishedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const news = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log(`[newsService] Fetched ${news.length} news items`);
    return { success: true, data: news };
  } catch (error) {
    console.error('[newsService] Error fetching news:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Busca uma notícia específica por ID
 */
export const getNewsById = async (id) => {
  try {
    console.log(`[newsService] Fetching news with ID: ${id}`);
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const newsData = { id: docSnap.id, ...docSnap.data() };
      console.log('[newsService] News found:', newsData);
      return { success: true, data: newsData };
    } else {
      console.log('[newsService] News not found');
      return { success: false, error: 'Notícia não encontrada' };
    }
  } catch (error) {
    console.error('[newsService] Error fetching news by ID:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cria uma nova notícia
 */
export const createNews = async (newsData) => {
  try {
    console.log('[newsService] Creating news:', newsData);

    // Validar dados
    const errors = validateNewsData(newsData);
    if (errors.length > 0) {
      console.error('[newsService] Validation errors:', errors);
      return { success: false, error: errors.join(', ') };
    }

    // Preparar dados com defaults
    const dataToSave = {
      title: newsData.title.trim(),
      content: newsData.content?.trim() || '',
      imageUrl: newsData.imageUrl || '',
      tags: newsData.tags || [],
      url: newsData.url || '',
      isPremium: newsData.isPremium || false,
      isActive: newsData.isActive !== undefined ? newsData.isActive : true,
      publishedAt: newsData.publishedAt || serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
      clicks: 0,
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), dataToSave);
    console.log('[newsService] News created with ID:', docRef.id);

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[newsService] Error creating news:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Atualiza uma notícia existente
 */
export const updateNews = async (id, newsData) => {
  try {
    console.log(`[newsService] Updating news ${id}:`, newsData);

    // Validar dados
    const errors = validateNewsData(newsData);
    if (errors.length > 0) {
      console.error('[newsService] Validation errors:', errors);
      return { success: false, error: errors.join(', ') };
    }

    // Preparar dados para atualização
    const dataToUpdate = {
      ...newsData,
      updatedAt: serverTimestamp(),
    };

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, dataToUpdate);
    console.log('[newsService] News updated successfully');

    return { success: true };
  } catch (error) {
    console.error('[newsService] Error updating news:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Deleta uma notícia e sua imagem
 */
export const deleteNews = async (id) => {
  try {
    console.log(`[newsService] Deleting news: ${id}`);

    // Buscar notícia para obter URL da imagem
    const newsResult = await getNewsById(id);
    if (newsResult.success && newsResult.data.imageUrl) {
      // Deletar imagem se existir
      await deleteNewsImage(newsResult.data.imageUrl);
    }

    // Deletar documento
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    console.log('[newsService] News deleted successfully');

    return { success: true };
  } catch (error) {
    console.error('[newsService] Error deleting news:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Faz upload de imagem para o Storage
 * @param {File} file - Arquivo de imagem
 * @param {string} newsId - ID da notícia
 */
export const uploadNewsImage = async (file, newsId) => {
  try {
    console.log(`[newsService] Uploading image for news: ${newsId}`);

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Arquivo deve ser uma imagem' };
    }

    // Validar tamanho (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Imagem deve ter no máximo 5MB' };
    }

    // Gerar nome do arquivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${newsId}_${timestamp}.${extension}`;
    const storagePath = `news-images/${fileName}`;

    // Upload para Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);

    // Obter URL pública
    const downloadUrl = await getDownloadURL(storageRef);
    console.log('[newsService] Image uploaded successfully:', downloadUrl);

    return { success: true, url: downloadUrl };
  } catch (error) {
    console.error('[newsService] Error uploading image:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Deleta uma imagem do Storage
 * @param {string} imageUrl - URL da imagem
 */
export const deleteNewsImage = async (imageUrl) => {
  try {
    if (!imageUrl) return { success: true };

    console.log('[newsService] Deleting image:', imageUrl);

    // Extrair path do Storage da URL
    const baseUrl = 'https://firebasestorage.googleapis.com';
    if (!imageUrl.startsWith(baseUrl)) {
      console.log('[newsService] Not a Firebase Storage URL, skipping delete');
      return { success: true };
    }

    // Extrair path após /o/
    const pathMatch = imageUrl.match(/\/o\/(.+?)\?/);
    if (!pathMatch) {
      console.log('[newsService] Could not extract path from URL');
      return { success: true };
    }

    const filePath = decodeURIComponent(pathMatch[1]);
    const storageRef = ref(storage, filePath);

    await deleteObject(storageRef);
    console.log('[newsService] Image deleted successfully');

    return { success: true };
  } catch (error) {
    // Se o arquivo não existir, considerar como sucesso
    if (error.code === 'storage/object-not-found') {
      console.log('[newsService] Image already deleted or does not exist');
      return { success: true };
    }

    console.error('[newsService] Error deleting image:', error);
    return { success: false, error: error.message };
  }
};
