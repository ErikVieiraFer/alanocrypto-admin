import { useState, useEffect, useMemo } from 'react';
import { Crown, Search, CheckCircle, XCircle, Clock, Plus, Mail, Calendar, DollarSign, Users as UsersIcon, TrendingUp, Copy, UserPlus } from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { logAction, ACTIONS } from '../services/auditService';

const UserAvatar = ({ user, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === 'lg' ? 'w-12 h-12' : 'w-10 h-10';

  useEffect(() => {
    setImgError(false);
  }, [user.photoURL]);

  if (user.photoURL && !imgError) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName || 'Avatar'}
        className={`${sizeClasses} rounded-full object-cover`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClasses} rounded-full bg-gray-700 flex items-center justify-center`}>
      <span className="text-white font-bold">
        {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '-'}
      </span>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, subValue }) => (
  <div className="bg-card rounded-lg p-4 border border-gray-700">
    <div className="flex items-center gap-3">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold">{value}</p>
        {subValue && <p className="text-gray-500 text-xs">{subValue}</p>}
      </div>
    </div>
  </div>
);

const PERIOD_OPTIONS = [
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
  { value: 365, label: '1 ano' },
];

export default function PremiumMembers() {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null, action: null });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [processingUserId, setProcessingUserId] = useState(null);

  const PRICE = 149.90;

  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            email: data.email || '',
            displayName: data.displayName || 'Sem nome',
            photoURL: data.photoURL || '',
            isPremium: data.isPremium === true || data.isPremium === 'true',
            premiumUntil: data.premiumUntil || null,
            lastPaymentStatus: data.lastPaymentStatus || null,
            lastPaymentId: data.lastPaymentId || null,
            manuallyActivated: data.manuallyActivated || false,
            createdAt: data.createdAt || null,
          };
        });
        setAllUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error('Erro no snapshot:', error);
        toast.error('Erro ao carregar usuários');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const isPremiumActive = (user) => {
    if (!user.isPremium) return false;
    if (!user.premiumUntil) return true;
    const now = new Date();
    const premiumDate = user.premiumUntil.toDate ? user.premiumUntil.toDate() : new Date(user.premiumUntil);
    return premiumDate > now;
  };

  const isPremiumExpired = (user) => {
    if (!user.isPremium) return false;
    if (!user.premiumUntil) return false;
    const now = new Date();
    const premiumDate = user.premiumUntil.toDate ? user.premiumUntil.toDate() : new Date(user.premiumUntil);
    return premiumDate <= now;
  };

  const getUserStatus = (user) => {
    if (isPremiumActive(user)) return 'active';
    if (isPremiumExpired(user)) return 'expired';
    return 'none';
  };

  const getPremiumDateText = (user) => {
    if (!user.premiumUntil) return null;
    const date = user.premiumUntil.toDate ? user.premiumUntil.toDate() : new Date(user.premiumUntil);
    return date.toLocaleDateString('pt-BR');
  };

  const handleActivatePremium = async (userId, userEmail, days = 30) => {
    try {
      setProcessingUserId(userId);
      const premiumUntil = new Date();
      premiumUntil.setDate(premiumUntil.getDate() + days);

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isPremium: true,
        premiumUntil: Timestamp.fromDate(premiumUntil),
        manuallyActivated: true,
        manuallyActivatedAt: serverTimestamp(),
      });

      await logAction(ACTIONS.UPDATE_USER, {
        userId,
        userEmail,
        action: 'activate_premium',
        days,
        premiumUntil: premiumUntil.toISOString()
      });

      toast.success(`Premium ativado para ${userEmail} por ${days} dias`);
    } catch (error) {
      console.error('Erro ao ativar premium:', error);
      toast.error('Erro ao ativar premium');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeactivatePremium = async (userId, userEmail) => {
    try {
      setProcessingUserId(userId);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isPremium: false,
        manuallyDeactivated: true,
        manuallyDeactivatedAt: serverTimestamp(),
      });

      await logAction(ACTIONS.UPDATE_USER, {
        userId,
        userEmail,
        action: 'deactivate_premium'
      });

      toast.success(`Premium desativado para ${userEmail}`);
    } catch (error) {
      console.error('Erro ao desativar premium:', error);
      toast.error('Erro ao desativar premium');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleExtendPremium = async (userId, userEmail, currentPremiumUntil, days = 30) => {
    try {
      setProcessingUserId(userId);
      let newDate;
      if (currentPremiumUntil) {
        newDate = currentPremiumUntil.toDate ? currentPremiumUntil.toDate() : new Date(currentPremiumUntil);
      } else {
        newDate = new Date();
      }
      newDate.setDate(newDate.getDate() + days);

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        premiumUntil: Timestamp.fromDate(newDate),
        lastExtendedAt: serverTimestamp(),
      });

      await logAction(ACTIONS.UPDATE_USER, {
        userId,
        userEmail,
        action: 'extend_premium',
        days,
        newPremiumUntil: newDate.toISOString()
      });

      toast.success(`Premium estendido para ${userEmail} até ${newDate.toLocaleDateString('pt-BR')}`);
    } catch (error) {
      console.error('Erro ao estender premium:', error);
      toast.error('Erro ao estender premium');
    } finally {
      setProcessingUserId(null);
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
    if (action === 'activate') {
      handleActivatePremium(user.id, user.email, selectedPeriod);
    } else if (action === 'deactivate') {
      handleDeactivatePremium(user.id, user.email);
    } else if (action === 'extend') {
      handleExtendPremium(user.id, user.email, user.premiumUntil, selectedPeriod);
    }
    closeConfirmDialog();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('UID copiado!');
  };

  const filteredUsers = useMemo(() => {
    return allUsers
      .filter(user => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          user.displayName.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.id.toLowerCase().includes(term);

        if (!matchesSearch) return false;

        if (filter === 'active') return isPremiumActive(user);
        if (filter === 'expired') return isPremiumExpired(user);
        if (filter === 'non-premium') return !user.isPremium;
        return true;
      })
      .sort((a, b) => {
        const aActive = isPremiumActive(a);
        const bActive = isPremiumActive(b);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;

        if (a.premiumUntil && b.premiumUntil) {
          const aDate = a.premiumUntil.toDate ? a.premiumUntil.toDate() : new Date(a.premiumUntil);
          const bDate = b.premiumUntil.toDate ? b.premiumUntil.toDate() : new Date(b.premiumUntil);
          return bDate - aDate;
        }
        return 0;
      });
  }, [allUsers, searchTerm, filter]);

  const addModalSearchResults = useMemo(() => {
    if (!addSearchTerm || addSearchTerm.length < 2) return [];

    const term = addSearchTerm.toLowerCase();
    return allUsers
      .filter(user =>
        user.displayName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [allUsers, addSearchTerm]);

  const stats = useMemo(() => ({
    total: allUsers.length,
    active: allUsers.filter(isPremiumActive).length,
    expired: allUsers.filter(isPremiumExpired).length,
    nonPremium: allUsers.filter(u => !u.isPremium).length,
  }), [allUsers]);

  const estimatedRevenue = stats.active * PRICE;

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
            <Crown size={32} className="text-yellow-500" />
            <h1 className="text-2xl font-bold text-white">Membros Premium</h1>
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-lg transition-colors"
          >
            <UserPlus size={20} />
            Adicionar Membro Premium
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={UsersIcon}
            label="Total de Usuários"
            value={stats.total}
            color="bg-blue-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Premium Ativos"
            value={stats.active}
            color="bg-green-600"
          />
          <StatCard
            icon={Clock}
            label="Premium Expirados"
            value={stats.expired}
            color="bg-red-600"
          />
          <StatCard
            icon={DollarSign}
            label="Receita Estimada"
            value={`R$ ${estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            color="bg-yellow-600"
            subValue={`${stats.active} × R$ ${PRICE.toFixed(2)}`}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-[#1e293b] text-white hover:bg-[#334155]'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'active'
                  ? 'bg-green-500 text-black font-semibold'
                  : 'bg-[#1e293b] text-white hover:bg-[#334155]'
              }`}
            >
              Ativos ({stats.active})
            </button>
            <button
              onClick={() => setFilter('expired')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'expired'
                  ? 'bg-red-500 text-black font-semibold'
                  : 'bg-[#1e293b] text-white hover:bg-[#334155]'
              }`}
            >
              Expirados ({stats.expired})
            </button>
            <button
              onClick={() => setFilter('non-premium')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'non-premium'
                  ? 'bg-gray-500 text-white font-semibold'
                  : 'bg-[#1e293b] text-white hover:bg-[#334155]'
              }`}
            >
              Não Premium ({stats.nonPremium})
            </button>
          </div>

          <div className="relative flex-grow">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por nome, email ou UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1e293b] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>

        <div className="bg-card rounded-lg overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800 text-gray-400 text-sm">
                  <th className="px-6 py-3 text-left">Usuário</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">UID</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Expira em</th>
                  <th className="px-6 py-3 text-left">Último Pagamento</th>
                  <th className="px-6 py-3 text-center whitespace-nowrap" style={{ minWidth: '180px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isActive = isPremiumActive(user);
                  const isExpired = isPremiumExpired(user);
                  const premiumDate = user.premiumUntil?.toDate ? user.premiumUntil.toDate() : null;

                  return (
                    <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div>
                            <p className="text-white font-medium">{user.displayName}</p>
                            {user.manuallyActivated && (
                              <span className="text-xs text-yellow-500">Ativado manualmente</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Mail size={16} />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                            {user.id.substring(0, 8)}...
                          </code>
                          <button
                            onClick={() => copyToClipboard(user.id)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            <Copy size={14} className="text-gray-400" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                            <CheckCircle size={16} />
                            Ativo
                          </span>
                        ) : isExpired ? (
                          <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                            <XCircle size={16} />
                            Expirado
                          </span>
                        ) : (
                          <span className="bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                            <XCircle size={16} />
                            Não Premium
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {premiumDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            {premiumDate.toLocaleDateString('pt-BR')}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.lastPaymentStatus ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.lastPaymentStatus === 'approved'
                              ? 'bg-green-500/20 text-green-400'
                              : user.lastPaymentStatus === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {user.lastPaymentStatus}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4" style={{ minWidth: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {isActive ? (
                            <>
                              <button
                                onClick={() => openConfirmDialog(user, 'extend')}
                                disabled={processingUserId === user.id}
                                style={{ backgroundColor: '#2563eb', color: 'white', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Plus size={14} />
                                Estender
                              </button>
                              <button
                                onClick={() => openConfirmDialog(user, 'deactivate')}
                                disabled={processingUserId === user.id}
                                style={{ backgroundColor: '#dc2626', color: 'white', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <XCircle size={14} />
                                Desativar
                              </button>
                            </>
                          ) : isExpired ? (
                            <button
                              onClick={() => openConfirmDialog(user, 'activate')}
                              disabled={processingUserId === user.id}
                              style={{ backgroundColor: '#ca8a04', color: 'white', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <TrendingUp size={14} />
                              Reativar
                            </button>
                          ) : (
                            <button
                              onClick={() => openConfirmDialog(user, 'activate')}
                              disabled={processingUserId === user.id}
                              style={{ backgroundColor: '#16a34a', color: 'white', padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <CheckCircle size={14} />
                              Ativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              {searchTerm
                ? `Nenhum usuário encontrado para "${searchTerm}"`
                : filter === 'active'
                ? 'Nenhum membro premium ativo'
                : filter === 'expired'
                ? 'Nenhum membro premium expirado'
                : filter === 'non-premium'
                ? 'Todos os usuários são premium'
                : 'Nenhum usuário cadastrado'}
            </div>
          )}
        </div>

        <Modal
          isOpen={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setAddSearchTerm('');
          }}
          title="Adicionar Membro Premium"
          size="lg"
        >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome, email ou UID..."
                value={addSearchTerm}
                onChange={(e) => setAddSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Período:</span>
              <div className="flex gap-2 flex-wrap">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedPeriod(opt.value)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      selectedPeriod === opt.value
                        ? 'bg-yellow-500 text-black font-semibold'
                        : 'bg-gray-700 text-white hover:bg-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {addSearchTerm.length < 2 && (
              <p className="text-gray-500 text-center py-4">
                Digite pelo menos 2 caracteres para buscar
              </p>
            )}

            {addSearchTerm.length >= 2 && addModalSearchResults.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                Nenhum usuário encontrado para "{addSearchTerm}"
              </p>
            )}

            {addModalSearchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {addModalSearchResults.map(user => {
                  const status = getUserStatus(user);
                  const dateText = getPremiumDateText(user);
                  const isProcessing = processingUserId === user.id;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} size="lg" />
                        <div>
                          <p className="text-white font-medium">{user.displayName}</p>
                          <p className="text-gray-400 text-sm">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs text-gray-500 bg-gray-900 px-2 py-0.5 rounded">
                              {user.id.substring(0, 12)}...
                            </code>
                            <button
                              onClick={() => copyToClipboard(user.id)}
                              className="p-0.5 hover:bg-gray-700 rounded"
                            >
                              <Copy size={12} className="text-gray-500" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {status === 'active' && (
                            <span className="text-green-400 text-sm flex items-center gap-1">
                              <CheckCircle size={14} />
                              Premium até {dateText}
                            </span>
                          )}
                          {status === 'expired' && (
                            <span className="text-red-400 text-sm flex items-center gap-1">
                              <XCircle size={14} />
                              Expirado em {dateText}
                            </span>
                          )}
                          {status === 'none' && (
                            <span className="text-gray-400 text-sm flex items-center gap-1">
                              <XCircle size={14} />
                              Não Premium
                            </span>
                          )}
                        </div>

                        {status === 'active' ? (
                          <button
                            onClick={() => handleExtendPremium(user.id, user.email, user.premiumUntil, selectedPeriod)}
                            disabled={isProcessing}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            {isProcessing ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Plus size={16} />
                                Estender +{selectedPeriod}d
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivatePremium(user.id, user.email, selectedPeriod)}
                            disabled={isProcessing}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                          >
                            {isProcessing ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Crown size={16} />
                                {status === 'expired' ? 'Reativar' : 'Ativar'} {selectedPeriod}d
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>

        <ConfirmDialog
          isOpen={confirmDialog.open}
          onClose={closeConfirmDialog}
          onConfirm={confirmAction}
          title={
            confirmDialog.action === 'activate'
              ? 'Ativar Premium'
              : confirmDialog.action === 'deactivate'
              ? 'Desativar Premium'
              : 'Estender Premium'
          }
          message={
            confirmDialog.action === 'activate'
              ? `Ativar premium para ${confirmDialog.user?.email} por ${selectedPeriod} dias?`
              : confirmDialog.action === 'deactivate'
              ? `Desativar premium de ${confirmDialog.user?.email}? O usuário perderá acesso ao conteúdo exclusivo.`
              : `Estender premium de ${confirmDialog.user?.email} por mais ${selectedPeriod} dias?`
          }
        />
      </div>
    </Layout>
  );
}
