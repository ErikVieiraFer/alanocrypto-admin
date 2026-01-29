import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

const COLLECTION_NAME = 'audit_logs';

export const logAction = async (action, details = {}) => {
  try {
    await addDoc(collection(db, COLLECTION_NAME), {
      action,
      user: auth.currentUser?.email || 'unknown',
      userId: auth.currentUser?.uid || 'unknown',
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
};

export const ACTIONS = {
  CREATE_SIGNAL: 'CREATE_SIGNAL',
  UPDATE_SIGNAL: 'UPDATE_SIGNAL',
  DELETE_SIGNAL: 'DELETE_SIGNAL',
  CLOSE_SIGNAL: 'CLOSE_SIGNAL',
  CREATE_POST: 'CREATE_POST',
  UPDATE_POST: 'UPDATE_POST',
  DELETE_POST: 'DELETE_POST',
  APPROVE_USER: 'APPROVE_USER',
  BLOCK_USER: 'BLOCK_USER',
  DELETE_USER: 'DELETE_USER',
  UPDATE_USER: 'UPDATE_USER',
  CREATE_CUPULA_POST: 'CREATE_CUPULA_POST',
  UPDATE_CUPULA_POST: 'UPDATE_CUPULA_POST',
  DELETE_CUPULA_POST: 'DELETE_CUPULA_POST',
  CREATE_LIVE: 'CREATE_LIVE',
  UPDATE_LIVE: 'UPDATE_LIVE',
  DELETE_LIVE: 'DELETE_LIVE',
};
