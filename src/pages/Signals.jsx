import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash, CheckCircle, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  getSignals,
  createSignal,
  updateSignal,
  deleteSignal,
  closeSignal,
} from '../services/signalService';

const Signals = () => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [editingSignal, setEditingSignal] = useState(null);
  const [closingSignal, setClosingSignal] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, signalId: null });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  const {
    register: registerClose,
    handleSubmit: handleCloseSubmit,
    reset: resetClose,
    formState: { errors: closeErrors },
  } = useForm();

  useEffect(() => {
    const unsubscribe = getSignals((data) => {
      setSignals(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setEditingSignal(null);
    reset({
      coin: '',
      type: 'long',
      entry: '',
      target1: '',
      target2: '',
      target3: '',
      stopLoss: '',
      confidence: 50,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (signal) => {
    setEditingSignal(signal);
    reset({
      coin: signal.coin,
      type: signal.type,
      entry: signal.entry,
      target1: signal.targets[0] || '',
      target2: signal.targets[1] || '',
      target3: signal.targets[2] || '',
      stopLoss: signal.stopLoss,
      confidence: signal.confidence,
      notes: signal.notes || '',
    });
    setIsModalOpen(true);
  };

  const openCloseModal = (signal) => {
    setClosingSignal(signal);
    resetClose({ profit: '' });
    setIsCloseModalOpen(true);
  };

  const validateSignal = (formData) => {
    const { coin, type, entry, target1, stopLoss } = formData;
    
    if (!coin || !type || !entry || !target1 || !stopLoss) {
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }
  
    const entryNum = parseFloat(entry);
    const sl = parseFloat(stopLoss);
    const t1 = parseFloat(target1);
    
    if (type === 'long') {
      if (t1 <= entryNum) {
        toast.error('LONG: Targets devem ser maiores que Entry');
        return false;
      }
      if (sl >= entryNum) {
        toast.error('LONG: Stop Loss deve ser menor que Entry');
        return false;
      }
    } else if (type === 'short') {
      if (t1 >= entryNum) {
        toast.error('SHORT: Targets devem ser menores que Entry');
        return false;
      }
      if (sl <= entryNum) {
        toast.error('SHORT: Stop Loss deve ser maior que Entry');
        return false;
      }
    }
    
    return true;
  };

  const onSubmit = async (data) => {
    if (!validateSignal(data)) {
        return;
    }
    try {
      const signalData = {
        coin: data.coin,
        type: data.type.toLowerCase(),
        entry: parseFloat(data.entry),
        targets: [
          parseFloat(data.target1),
          parseFloat(data.target2),
          parseFloat(data.target3),
        ].filter((t) => !isNaN(t)),
        stopLoss: parseFloat(data.stopLoss),
        confidence: parseInt(data.confidence),
        notes: data.notes,
      };

      let result;
      if (editingSignal) {
        result = await updateSignal(editingSignal.id, signalData);
        if (result.success) {
          toast.success('Sinal atualizado com sucesso!');
        }
      } else {
        result = await createSignal(signalData);
        if (result.success) {
          toast.success('Sinal criado com sucesso!');
        }
      }

      if (result.success) {
        setIsModalOpen(false);
      } else {
        toast.error(result.error || 'Erro ao salvar sinal');
      }
    } catch (error) {
      console.error('Error saving signal:', error);
      toast.error('Erro ao salvar sinal');
    }
  };

  const onCloseSignal = async (data) => {
    try {
      const result = await closeSignal(closingSignal.id, parseFloat(data.profit));
      if (result.success) {
        toast.success('Sinal fechado com sucesso!');
        setIsCloseModalOpen(false);
      } else {
        toast.error(result.error || 'Erro ao fechar sinal');
      }
    } catch (error) {
      console.error('Error closing signal:', error);
      toast.error('Erro ao fechar sinal');
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteSignal(id);
      if (result.success) {
        toast.success('Sinal deletado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao deletar sinal');
      }
    } catch (error) {
      console.error('Error deleting signal:', error);
      toast.error('Erro ao deletar sinal');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Gerenciar Sinais</h1>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>Criar Sinal</span>
          </button>
        </div>

        {/* Signals Table */}
        <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Moeda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Entry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Targets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Stop Loss
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {signals.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                      Nenhum sinal encontrado. Crie seu primeiro sinal!
                    </td>
                  </tr>
                ) : (
                  signals.map((signal) => (
                    <tr key={signal.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                        {signal.coin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            signal.type === 'long'
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {signal.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        ${signal.entry}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                        {signal.targets.join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        ${signal.stopLoss}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {signal.status === 'active' && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                            ATIVO
                          </span>
                        )}
                        {signal.status === 'closed' && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400">
                            FECHADO
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {signal.status === 'closed' && (
                          <span
                            className={`font-semibold ${
                              signal.profit >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                          >
                            {signal.profit > 0 ? '+' : ''}
                            {signal.profit}%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {signal.status === 'active' && (
                            <>
                              <button
                                onClick={() => openEditModal(signal)}
                                className="text-gray-400 hover:text-white transition-colors"
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => openCloseModal(signal)}
                                className="text-green-500 hover:text-green-400 transition-colors"
                                title="Fechar Sinal"
                              >
                                <CheckCircle size={18} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() =>
                              setDeleteDialog({ isOpen: true, signalId: signal.id })
                            }
                            className="text-red-500 hover:text-red-400 transition-colors"
                            title="Deletar"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSignal ? 'Editar Sinal' : 'Criar Novo Sinal'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coin */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Moeda *
              </label>
              <select
                name="coin"
                {...register('coin', { required: 'Moeda é obrigatória' })}
                className="w-full bg-primary border border-gray-700 rounded-lg px-4 py-2.5 text-white"
                required
              >
                <option value="">Selecione a moeda</option>
                <optgroup label="Principais">
                  <option value="BTC-USDT">BTC-USDT (Bitcoin)</option>
                  <option value="ETH-USDT">ETH-USDT (Ethereum)</option>
                  <option value="BNB-USDT">BNB-USDT (Binance Coin)</option>
                  <option value="SOL-USDT">SOL-USDT (Solana)</option>
                  <option value="XRP-USDT">XRP-USDT (Ripple)</option>
                </optgroup>
                <optgroup label="Altcoins Populares">
                  <option value="ADA-USDT">ADA-USDT (Cardano)</option>
                  <option value="DOGE-USDT">DOGE-USDT (Dogecoin)</option>
                  <option value="AVAX-USDT">AVAX-USDT (Avalanche)</option>
                  <option value="DOT-USDT">DOT-USDT (Polkadot)</option>
                  <option value="MATIC-USDT">MATIC-USDT (Polygon)</option>
                  <option value="LINK-USDT">LINK-USDT (Chainlink)</option>
                  <option value="UNI-USDT">UNI-USDT (Uniswap)</option>
                  <option value="ATOM-USDT">ATOM-USDT (Cosmos)</option>
                  <option value="LTC-USDT">LTC-USDT (Litecoin)</option>
                  <option value="BCH-USDT">BCH-USDT (Bitcoin Cash)</option>
                </optgroup>
                <optgroup label="Memecoins">
                  <option value="SHIB-USDT">SHIB-USDT (Shiba Inu)</option>
                  <option value="PEPE-USDT">PEPE-USDT (Pepe)</option>
                  <option value="FLOKI-USDT">FLOKI-USDT (Floki)</option>
                </optgroup>
                <optgroup label="DeFi">
                  <option value="AAVE-USDT">AAVE-USDT</option>
                  <option value="MKR-USDT">MKR-USDT (Maker)</option>
                  <option value="CRV-USDT">CRV-USDT (Curve)</option>
                </optgroup>
                <optgroup label="Layer 2">
                  <option value="ARB-USDT">ARB-USDT (Arbitrum)</option>
                  <option value="OP-USDT">OP-USDT (Optimism)</option>
                </optgroup>
              </select>
              {errors.coin && (
                <p className="mt-1 text-sm text-red-500">{errors.coin.message}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo *
              </label>
              <select
                {...register('type', { required: 'Tipo é obrigatório' })}
                className="custom-select w-full bg-primary border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                <option value="">Selecione</option>
                <option value="long">LONG</option>
                <option value="short">SHORT</option>
              </select>
            </div>

            {/* Entry */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Entry *
              </label>
              <input
                type="number"
                step="any"
                {...register('entry', {
                  required: 'Entry é obrigatório',
                  min: { value: 0, message: 'Entry deve ser maior que 0' },
                })}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="0.00"
              />
              {errors.entry && (
                <p className="mt-1 text-sm text-red-500">{errors.entry.message}</p>
              )}
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stop Loss *
              </label>
              <input
                type="number"
                step="any"
                {...register('stopLoss', {
                  required: 'Stop Loss é obrigatório',
                  min: { value: 0, message: 'Stop Loss deve ser maior que 0' },
                })}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="0.00"
              />
              {errors.stopLoss && (
                <p className="mt-1 text-sm text-red-500">{errors.stopLoss.message}</p>
              )}
            </div>

            {/* Targets */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target 1 *
              </label>
              <input
                type="number"
                step="any"
                {...register('target1', {
                  required: 'Target 1 é obrigatório',
                  min: { value: 0, message: 'Target deve ser maior que 0' },
                })}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="0.00"
              />
              {errors.target1 && (
                <p className="mt-1 text-sm text-red-500">{errors.target1.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target 2
              </label>
              <input
                type="number"
                step="any"
                {...register('target2')}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target 3
              </label>
              <input
                type="number"
                step="any"
                {...register('target3')}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
                placeholder="0.00"
              />
            </div>

            {/* Confidence */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confiança: {register('confidence').value || 50}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                {...register('confidence')}
                className="w-full"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Observações
            </label>
            <textarea
              {...register('notes')}
              rows="3"
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Observações sobre o sinal..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
              {editingSignal ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Signal Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Fechar Sinal"
        size="sm"
      >
        <form onSubmit={handleCloseSubmit(onCloseSignal)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Profit (%) *
            </label>
            <input
              type="number"
              step="any"
              {...registerClose('profit', {
                required: 'Profit é obrigatório',
              })}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Ex: 15.5 ou -5.2"
            />
            {closeErrors.profit && (
              <p className="mt-1 text-sm text-red-500">{closeErrors.profit.message}</p>
            )}
            <p className="mt-2 text-sm text-gray-400">
              Digite um valor positivo para lucro ou negativo para perda
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Confirmar
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, signalId: null })}
        onConfirm={() => handleDelete(deleteDialog.signalId)}
        title="Deletar Sinal"
        message="Tem certeza que deseja deletar este sinal? Esta ação não pode ser desfeita."
        confirmText="Deletar"
      />
    </Layout>
  );
};

export default Signals;
