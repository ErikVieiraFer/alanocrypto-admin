import { useState, useEffect } from 'react';
import { Users as UsersIcon, Trash2, Ban, Mail, Calendar } from 'lucide-react';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ConfirmDialog from '../components/ConfirmDialog';
import { logAction, ACTIONS } from '../services/auditService';

const UserAvatar = ({ user }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [user.photoURL]);

  if (user.photoURL && !imgError) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName || 'Avatar'}
        className="w-10 h-10 rounded-full object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  if (imgError) {
    return null; // Don't show anything if image fails to load
  }

  // Fallback to initials if no photoURL is provided
  return (
    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
      <span className="text-white font-bold">
        {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '-'}
      </span>
    </div>
  );
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null, action: null });
  const [accessDialog, setAccessDialog] = useState({
    isOpen: false,
    user: null,
    date: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);

      await logAction(ACTIONS.DELETE_USER, { userId, userEmail });

      setUsers(users.filter(u => u.id !== userId));
      toast.success(`Usuário ${userEmail} excluído com sucesso`);
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleBlockUser = async (userId, userEmail, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      const newStatus = !currentStatus;

      await updateDoc(userRef, {
        blocked: newStatus,
        blockedAt: newStatus ? new Date() : null
      });

      await logAction(ACTIONS.BLOCK_USER, { userId, userEmail, blocked: newStatus });

      setUsers(users.map(u =>
        u.id === userId ? { ...u, blocked: newStatus } : u
      ));

      toast.success(`Usuário ${newStatus ? 'bloqueado' : 'desbloqueado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao bloquear:', error);
      toast.error('Erro ao bloquear usuário');
    }
  };

  const openConfirmDialog = (user, action) => {
    setConfirmDialog({ open: true, user, action });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, user: null, action: null });
  };

  const confirmAction = () => {
    const { user, action } = confirmDialog;
    if (action === 'delete') {
      handleDeleteUser(user.id, user.email);
    } else if (action === 'block') {
      handleBlockUser(user.id, user.email, user.blocked);
    }
    closeConfirmDialog();
  };

  const openAccessDialog = (user) => {
    const currentDate = user.accessUntil
      ? new Date(user.accessUntil.toDate()).toISOString().split('T')[0]
      : '';
    setAccessDialog({ isOpen: true, user, date: currentDate });
  };

  const closeAccessDialog = () => {
    setAccessDialog({ isOpen: false, user: null, date: '' });
  };

  const handleSetAccessExpiration = async () => {
    try {
      const { user, date } = accessDialog;
      const userRef = doc(db, 'users', user.id);

      if (date) {
        // Definir data de expiração (23:59:59 do dia selecionado)
        const expirationDate = new Date(date);
        expirationDate.setHours(23, 59, 59, 999);

        await updateDoc(userRef, {
          accessUntil: Timestamp.fromDate(expirationDate),
        });

        await logAction(ACTIONS.UPDATE_USER, {
          userId: user.id,
          userEmail: user.email,
          action: 'set_expiration',
          expirationDate: expirationDate.toISOString()
        });

        setUsers(users.map(u =>
          u.id === user.id ? { ...u, accessUntil: Timestamp.fromDate(expirationDate) } : u
        ));

        toast.success(`Acesso válido até ${new Date(date).toLocaleDateString('pt-BR')}`);
      } else {
        // Remover data de expiração (acesso vitalício)
        await updateDoc(userRef, {
          accessUntil: null,
        });

        await logAction(ACTIONS.UPDATE_USER, {
          userId: user.id,
          userEmail: user.email,
          action: 'set_lifetime_access'
        });

        setUsers(users.map(u =>
          u.id === user.id ? { ...u, accessUntil: null } : u
        ));

        toast.success('Acesso vitalício definido');
      }

      closeAccessDialog();
    } catch (error) {
      console.error('Erro ao definir expiração:', error);
      toast.error('Erro ao definir expiração');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UsersIcon size={32} className="text-white" />
            <h1 className="text-2xl font-bold text-white">Gerenciar Usuários</h1>
          </div>
          <div className="text-gray-400">
            Total: {users.length} usuários
          </div>
        </div>

        <div className="bg-card rounded-lg overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800 text-gray-400 text-sm">
                  <th className="px-6 py-3 text-left">Usuário</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Cadastro</th>
                  <th className="px-6 py-3 text-left">Acesso Até</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div>
                          <p className="text-white font-medium">{user.displayName || 'Sem nome'}</p>
                          <p className="text-gray-400 text-sm">{user.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Mail size={16} />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {user.createdAt?.toDate?.().toLocaleDateString('pt-BR') || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {user.accessUntil ? (
                        <>
                          {new Date(user.accessUntil.toDate()).toLocaleDateString('pt-BR')}
                          {new Date(user.accessUntil.toDate()) < new Date() && (
                            <span className="ml-2 text-red-400 text-xs">(Expirado)</span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-500">Vitalício</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.blocked ? (
                        <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                          Bloqueado
                        </span>
                      ) : (
                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                          Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openAccessDialog(user)}
                          className="p-2 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors"
                          title="Definir data de expiração"
                        >
                          <Calendar size={18} />
                        </button>
                        <button
                          onClick={() => openConfirmDialog(user, 'block')}
                          className={`p-2 rounded-lg transition-colors ${
                            user.blocked
                              ? 'hover:bg-green-500/20 text-green-400'
                              : 'hover:bg-yellow-500/20 text-yellow-400'
                          }`}
                          title={user.blocked ? 'Desbloquear' : 'Bloquear'}
                        >
                          <Ban size={18} />
                        </button>
                        <button
                          onClick={() => openConfirmDialog(user, 'delete')}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Excluir usuário"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Nenhum usuário cadastrado
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={confirmDialog.open}
          onClose={closeConfirmDialog}
          onConfirm={confirmAction}
          title={
            confirmDialog.action === 'delete'
              ? 'Excluir Usuário'
              : confirmDialog.user?.blocked
                ? 'Desbloquear Usuário'
                : 'Bloquear Usuário'
          }
          message={
            confirmDialog.action === 'delete'
              ? `Tem certeza que deseja excluir o usuário ${confirmDialog.user?.email}? Esta ação não pode ser desfeita.`
              : confirmDialog.user?.blocked
                ? `Desbloquear ${confirmDialog.user?.email}? O usuário poderá acessar novamente.`
                : `Bloquear ${confirmDialog.user?.email}? O usuário não poderá mais acessar o aplicativo.`
          }
        />

        {/* Modal de Data de Expiração */}
        {accessDialog.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#1e293b] rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">
                Definir Data de Expiração
              </h3>
              <p className="text-gray-400 mb-4">
                Usuário: {accessDialog.user?.email}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Acesso válido até:
                </label>
                <input
                  type="date"
                  value={accessDialog.date}
                  onChange={(e) => setAccessDialog({ ...accessDialog, date: e.target.value })}
                  className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Define até quando o usuário pode acessar o app
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeAccessDialog}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                {accessDialog.user?.accessUntil && (
                  <button
                    onClick={async () => {
                      try {
                        const userRef = doc(db, 'users', accessDialog.user.id);
                        await updateDoc(userRef, {
                          accessUntil: null,
                        });

                        await logAction(ACTIONS.UPDATE_USER, {
                          userId: accessDialog.user.id,
                          userEmail: accessDialog.user.email,
                          action: 'remove_expiration'
                        });

                        setUsers(users.map(u =>
                          u.id === accessDialog.user.id ? { ...u, accessUntil: null } : u
                        ));

                        toast.success('Data de expiração removida. Acesso vitalício definido.');
                        closeAccessDialog();
                      } catch (error) {
                        console.error('Erro ao remover expiração:', error);
                        toast.error('Erro ao remover expiração');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                  >
                    Remover Data
                  </button>
                )}
                <button
                  onClick={handleSetAccessExpiration}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
