import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Cloud Functions
export const sendEmailVerification = httpsCallable(functions, 'sendEmailVerification');
export const verifyEmailCode = httpsCallable(functions, 'verifyEmailCode');
export const deleteUserFunction = httpsCallable(functions, 'deleteUser');

// Helper function to send verification email
export const sendVerificationEmail = async (email) => {
  try {
    const result = await sendEmailVerification({ email });
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to verify code
export const verifyCode = async (email, code) => {
  try {
    const result = await verifyEmailCode({ email, code });
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Helper function to delete user (Authentication + Firestore)
export const deleteUser = async (userId) => {
  try {
    const result = await deleteUserFunction({ userId });
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
