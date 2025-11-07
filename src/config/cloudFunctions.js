// DESABILITADO - Fluxo direto sem verificação de email
// Mantida apenas a função deleteUser para gerenciamento de usuários

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Cloud Function para deletar usuário
export const deleteUserFunction = httpsCallable(functions, 'deleteUser');

// Helper function to delete user (Authentication + Firestore)
export const deleteUser = async (userId) => {
  try {
    const result = await deleteUserFunction({ userId });
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// // FUNÇÕES DE VERIFICAÇÃO DE EMAIL DESABILITADAS
// // export const sendEmailVerification = httpsCallable(functions, 'sendEmailVerification');
// // export const verifyEmailCode = httpsCallable(functions, 'verifyEmailCode');
//
// // export const sendVerificationEmail = async (email) => {
// //   try {
// //     const result = await sendEmailVerification({ email });
// //     return { success: true, data: result.data };
// //   } catch (error) {
// //     return { success: false, error: error.message };
// //   }
// // };
//
// // export const verifyCode = async (email, code) => {
// //   try {
// //     const result = await verifyEmailCode({ email, code });
// //     return { success: true, data: result.data };
// //   } catch (error) {
// //     return { success: false, error: error.message };
// //   }
// // };
