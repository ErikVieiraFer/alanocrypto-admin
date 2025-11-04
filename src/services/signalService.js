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
import { logAction, ACTIONS } from './auditService';

const COLLECTION_NAME = 'signals';

export const createSignal = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      status: 'active',
      createdAt: serverTimestamp(),
      closedAt: null,
    });

    await logAction(ACTIONS.CREATE_SIGNAL, {
      signalId: docRef.id,
      coin: data.coin,
      type: data.type
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

    await logAction(ACTIONS.UPDATE_SIGNAL, { signalId: id });

    return { success: true };
  } catch (error) {
    console.error('Error updating signal:', error);
    return { success: false, error: error.message };
  }
};

export const deleteSignal = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));

    await logAction(ACTIONS.DELETE_SIGNAL, { signalId: id });

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

    await logAction(ACTIONS.CLOSE_SIGNAL, { signalId: id, profit });

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
