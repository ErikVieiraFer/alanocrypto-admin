import { doc, getDoc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'app_config';
const INTRO_VIDEO_DOC = 'intro_video';

/**
 * Extrai o ID do vídeo do YouTube de uma URL
 * @param {string} url - URL do YouTube
 * @returns {string|null} - ID do vídeo ou null se inválido
 */
const extractYouTubeVideoId = (url) => {
  if (!url) return null;

  // Padrões aceitos:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // http://www.youtube.com/watch?v=VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Valida URL do YouTube
 * @param {string} url - URL do YouTube
 * @returns {object} - { valid: boolean, videoId: string|null, error: string|null }
 */
const validateYouTubeUrl = (url) => {
  if (!url || url.trim() === '') {
    return { valid: false, videoId: null, error: 'URL do YouTube é obrigatória' };
  }

  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return {
      valid: false,
      videoId: null,
      error: 'URL do YouTube inválida. Use formatos: youtube.com/watch?v=... ou youtu.be/...',
    };
  }

  return { valid: true, videoId, error: null };
};

/**
 * Valida os dados do vídeo de introdução
 */
const validateVideoData = (videoData) => {
  const errors = [];

  // Título obrigatório
  if (!videoData.title || videoData.title.trim() === '') {
    errors.push('Título é obrigatório');
  }

  // Descrição obrigatória
  if (!videoData.description || videoData.description.trim() === '') {
    errors.push('Descrição é obrigatória');
  }

  // Validar URL do YouTube
  const urlValidation = validateYouTubeUrl(videoData.videoUrl);
  if (!urlValidation.valid) {
    errors.push(urlValidation.error);
  }

  return { errors, videoId: urlValidation.videoId };
};

/**
 * Busca os dados do vídeo de introdução
 */
export const getIntroVideo = async () => {
  try {
    console.log('[appConfigService] Fetching intro video...');
    const docRef = doc(db, COLLECTION_NAME, INTRO_VIDEO_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const videoData = docSnap.data();

      // Extrair videoId se não estiver presente
      if (!videoData.videoId && videoData.videoUrl) {
        videoData.videoId = extractYouTubeVideoId(videoData.videoUrl);
      }

      console.log('[appConfigService] Intro video found:', videoData);
      return { success: true, data: videoData };
    } else {
      console.log('[appConfigService] Intro video not configured yet');
      return {
        success: true,
        data: {
          title: '',
          description: '',
          videoUrl: '',
          videoId: null,
          isActive: true,
        },
      };
    }
  } catch (error) {
    console.error('[appConfigService] Error fetching intro video:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Atualiza os dados do vídeo de introdução
 */
export const updateIntroVideo = async (videoData) => {
  try {
    console.log('[appConfigService] Updating intro video:', videoData);

    // Validar dados
    const validation = validateVideoData(videoData);
    if (validation.errors.length > 0) {
      console.error('[appConfigService] Validation errors:', validation.errors);
      return { success: false, error: validation.errors.join(', ') };
    }

    // Preparar dados para salvar
    const dataToSave = {
      title: videoData.title.trim(),
      description: videoData.description.trim(),
      videoUrl: videoData.videoUrl.trim(),
      videoId: validation.videoId,
      isActive: videoData.isActive !== undefined ? videoData.isActive : true,
      updatedAt: serverTimestamp(),
    };

    const docRef = doc(db, COLLECTION_NAME, INTRO_VIDEO_DOC);
    await setDoc(docRef, dataToSave, { merge: true });
    console.log('[appConfigService] Intro video updated successfully');

    return { success: true, data: { ...dataToSave, videoId: validation.videoId } };
  } catch (error) {
    console.error('[appConfigService] Error updating intro video:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Função auxiliar para extrair ID (exportada para uso externo)
 */
export const getYouTubeVideoId = extractYouTubeVideoId;
