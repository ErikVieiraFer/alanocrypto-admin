import { useState, useEffect } from 'react';
import { Users as UsersIcon, Trash2, Ban, Mail, CheckCircle, XCircle } from 'lucide-react';
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

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
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'

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

      // Ordenar: pendentes primeiro, depois aprovados
      usersData.sort((a, b) => {
        if (a.approved === false && b.approved === true) return -1;
        if (a.approved === true && b.approved === false) return 1;
        return 0;
      });

      setUsers(usersData);

      // Notificação de pendentes
      const pendingCount = usersData.filter(u => !u.approved).length;
      if (pendingCount > 0) {
        toast.info(`${pendingCount} usuário(s) aguardando aprovação`, {
          duration: 5000,
          icon: '⏳',
        });
      }
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

      setUsers(users.map(u =>
        u.id === userId ? { ...u, blocked: newStatus } : u
      ));

      toast.success(`Usuário ${newStatus ? 'bloqueado' : 'desbloqueado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao bloquear:', error);
      toast.error('Erro ao bloquear usuário');
    }
  };

  const handleApproveUser = async (userId, userEmail, currentStatus) => {
    try {
      const userRef = doc(db, 'users', userId);
      const newStatus = !currentStatus;

      await updateDoc(userRef, {
        approved: newStatus,
        approvedAt: newStatus ? new Date() : null,
        approvedBy: newStatus ? 'admin' : null
      });

      setUsers(users.map(u =>
        u.id === userId ? { ...u, approved: newStatus } : u
      ));

      toast.success(
        newStatus
          ? `✅ ${userEmail} aprovado com sucesso!`
          : `❌ Aprovação de ${userEmail} removida`
      );
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      toast.error('Erro ao aprovar usuário');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Filtro de usuários
  const filteredUsers = users.filter(user => {
    if (filter === 'pending') return !user.approved;
    if (filter === 'approved') return user.approved;
    return true; // 'all'
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UsersIcon size={32} className="text-white" />
          <h1 className="text-2xl font-bold text-white">Gerenciar Usuários</h1>
          {users.filter(u => !u.approved).length > 0 && (
            <span className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-bold">
              {users.filter(u => !u.approved).length} pendente(s)
            </span>
          )}
        </div>
        <div className="text-gray-400">
          Total: {users.length} usuários
        </div>
      </div>

      {/* Botões de filtro */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-white text-black'
              : 'bg-[#1e293b] text-white hover:bg-[#334155]'
          }`}
        >
          Todos ({users.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'pending'
              ? 'bg-yellow-500 text-black'
              : 'bg-[#1e293b] text-white hover:bg-[#334155]'
          }`}
        >
          Pendentes ({users.filter(u => !u.approved).length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'approved'
              ? 'bg-green-500 text-black'
              : 'bg-[#1e293b] text-white hover:bg-[#334155]'
          }`}
        >
          Aprovados ({users.filter(u => u.approved).length})
        </button>
      </div>

      <div className="bg-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-gray-400 text-sm">
                <th className="px-6 py-3 text-left">Usuário</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Cadastro</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-800 hover:bg-[#334155] transition-colors">
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
                  <td className="px-6 py-4">
                    {user.approved === true ? (
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                        <CheckCircle size={16} />
                        Aprovado
                      </span>
                    ) : user.approved === false ? (
                      <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                        <XCircle size={16} />
                        Pendente
                      </span>
                    ) : (
                      <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-sm font-medium w-fit">
                        Sem status
                      </span>
                    )}
                    {user.blocked && (
                      <span className="ml-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                        Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* BOTÃO DE APROVAR/DESAPROVAR */}
                      <button
                        onClick={() => handleApproveUser(user.id, user.email, user.approved)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.approved
                            ? 'hover:bg-red-500/20 text-red-400'
                            : 'hover:bg-green-500/20 text-green-400'
                        }`}
                        title={user.approved ? 'Remover aprovação' : 'Aprovar usuário'}
                      >
                        {user.approved ? <XCircle size={18} /> : <CheckCircle size={18} />}
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            {filter === 'pending' && 'Nenhum usuário pendente'}
            {filter === 'approved' && 'Nenhum usuário aprovado'}
            {filter === 'all' && 'Nenhum usuário cadastrado'}
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
    </div>
  );
}
