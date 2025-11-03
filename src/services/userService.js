import { collection, getDocs, query, orderBy, getCountFromServer } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'users';

export const getUsers = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return { success: true, users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message, users: [] };
  }
};

export const getUsersCount = async () => {
  try {
    const coll = collection(db, COLLECTION_NAME);
    const snapshot = await getCountFromServer(coll);
    return { success: true, count: snapshot.data().count };
  } catch (error) {
    console.error('Error fetching users count:', error);
    return { success: false, error: error.message, count: 0 };
  }
};
