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
import { db } from '../config/firebase';

const COLLECTION_NAME = 'signals';

export const createSignal = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      status: 'active',
      createdAt: serverTimestamp(),
      closedAt: null,
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating signal:', error);
    return { success: false, error: error.message };
  }
};

export const updateSignal = async (id, data) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
    return { success: true };
  } catch (error) {
    console.error('Error updating signal:', error);
    return { success: false, error: error.message };
  }
};

export const deleteSignal = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting signal:', error);
    return { success: false, error: error.message };
  }
};

export const closeSignal = async (id, profit) => {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      status: 'closed',
      profit: profit,
      closedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error closing signal:', error);
    return { success: false, error: error.message };
  }
};

export const getSignals = (callback) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const signals = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(signals);
    },
    (error) => {
      console.error('Error fetching signals:', error);
      callback([]);
    }
  );
};
