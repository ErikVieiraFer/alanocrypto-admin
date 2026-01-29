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
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';
import { logAction, ACTIONS } from './auditService';

const COLLECTION_NAME = 'cupula_lives';

export const uploadThumbnail = async (file, liveId) => {
  try {
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `thumbnail_${timestamp}.${fileExtension}`;

    const storageRef = ref(storage, `cupula_lives/${liveId}/${fileName}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    console.log('✅ Upload thumbnail completo:', downloadURL);
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return { success: false, error: error.message };
  }
};

export const deleteThumbnail = async (liveId) => {
  try {
    try {
      const oldStorageRef = ref(storage, `cupula_lives/${liveId}/thumbnail.jpg`);
      await deleteObject(oldStorageRef);
    } catch (err) {
      console.log('Thumbnail antiga não encontrada (normal)');
    }
    return { success: true };
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    return { success: false, error: error.message };
  }
};

export const extractYoutubeId = (url) => {
  if (!url) return '';

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) {
    return url;
  }

  return '';
};

export const getYoutubeThumbnail = (url) => {
  const videoId = extractYoutubeId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
  return null;
};

export const createLive = async (data) => {
  try {
    const currentUser = auth.currentUser;

    const liveData = {
      title: data.title,
      description: data.description,
      youtubeUrl: data.youtubeUrl,
      thumbnailUrl: data.thumbnailUrl || null,
      isLive: data.isLive || false,
      scheduledAt: data.scheduledAt ? Timestamp.fromDate(new Date(data.scheduledAt)) : null,
      createdBy: currentUser?.uid || 'admin',
      authorName: 'Alano Crypto',
      views: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), liveData);

    await logAction(ACTIONS.CREATE_LIVE, {
      liveId: docRef.id,
      title: data.title,
      isLive: data.isLive,
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating live:', error);
    return { success: false, error: error.message };
  }
};

export const updateLive = async (id, data) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);

    const updateData = { ...data };
    if (data.scheduledAt) {
      updateData.scheduledAt = Timestamp.fromDate(new Date(data.scheduledAt));
    }

    await updateDoc(docRef, updateData);

    await logAction(ACTIONS.UPDATE_LIVE, { liveId: id });

    return { success: true };
  } catch (error) {
    console.error('Error updating live:', error);
    return { success: false, error: error.message };
  }
};

export const deleteLive = async (id) => {
  try {
    await deleteThumbnail(id);
    await deleteDoc(doc(db, COLLECTION_NAME, id));

    await logAction(ACTIONS.DELETE_LIVE, { liveId: id });

    return { success: true };
  } catch (error) {
    console.error('Error deleting live:', error);
    return { success: false, error: error.message };
  }
};

export const toggleLiveStatus = async (id, isLive) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { isLive });

    await logAction(ACTIONS.UPDATE_LIVE, {
      liveId: id,
      action: isLive ? 'started_live' : 'ended_live'
    });

    return { success: true };
  } catch (error) {
    console.error('Error toggling live status:', error);
    return { success: false, error: error.message };
  }
};

export const getLives = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const lives = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(lives);
    },
    (error) => {
      console.error('Error fetching lives:', error);
      callback([]);
    }
  );
};
