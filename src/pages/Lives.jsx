import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash, Eye, Image as ImageIcon, Radio, Calendar, Play, Square, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  getLives,
  createLive,
  updateLive,
  deleteLive,
  uploadThumbnail,
  toggleLiveStatus,
  getYoutubeThumbnail,
  extractYoutubeId,
} from '../services/liveService';

const Lives = () => {
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLive, setEditingLive] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, liveId: null });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [togglingLive, setTogglingLive] = useState(null);

  const { register, handleSubmit, reset, watch } = useForm();

  const watchYoutubeUrl = watch('youtubeUrl');

  useEffect(() => {
    const unsubscribe = getLives((data) => {
      setLives(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (watchYoutubeUrl && !imageFile && !editingLive?.thumbnailUrl) {
      const ytThumb = getYoutubeThumbnail(watchYoutubeUrl);
      if (ytThumb) {
        setImagePreview(ytThumb);
      }
    }
  }, [watchYoutubeUrl, imageFile, editingLive]);

  const openCreateModal = () => {
    setEditingLive(null);
    setImageFile(null);
    setImagePreview(null);
    reset({
      title: '',
      description: '',
      youtubeUrl: '',
      scheduledAt: '',
      isLive: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (live) => {
    setEditingLive(live);
    setImageFile(null);
    setImagePreview(live.thumbnailUrl || getYoutubeThumbnail(live.youtubeUrl) || null);

    let scheduledAtValue = '';
    if (live.scheduledAt) {
      const date = live.scheduledAt.toDate ? live.scheduledAt.toDate() : new Date(live.scheduledAt);
      scheduledAtValue = date.toISOString().slice(0, 16);
    }

    reset({
      title: live.title,
      description: live.description,
      youtubeUrl: live.youtubeUrl,
      scheduledAt: scheduledAtValue,
      isLive: live.isLive,
    });
    setIsModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem deve ter no máximo 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    try {
      setUploadingImage(true);

      let thumbnailUrl = editingLive?.thumbnailUrl;

      if (editingLive) {
        if (imageFile) {
          const uploadResult = await uploadThumbnail(imageFile, editingLive.id);
          if (!uploadResult.success) {
            toast.error('Erro ao fazer upload da thumbnail');
            setUploadingImage(false);
            return;
          }
          thumbnailUrl = uploadResult.url;
        }

        const liveData = {
          title: data.title || '',
          description: data.description || '',
          youtubeUrl: data.youtubeUrl || '',
          scheduledAt: data.scheduledAt || null,
          isLive: data.isLive || false,
          ...(thumbnailUrl && { thumbnailUrl }),
        };

        const result = await updateLive(editingLive.id, liveData);
        if (result.success) {
          toast.success('Live atualizada com sucesso!');
          setIsModalOpen(false);
          setImageFile(null);
          setImagePreview(null);
        } else {
          toast.error(result.error || 'Erro ao atualizar live');
        }
      } else {
        const liveData = {
          title: data.title || '',
          description: data.description || '',
          youtubeUrl: data.youtubeUrl || '',
          scheduledAt: data.scheduledAt || null,
          isLive: data.isLive || false,
        };

        const result = await createLive(liveData);
        if (!result.success) {
          toast.error(result.error || 'Erro ao criar live');
          setUploadingImage(false);
          return;
        }

        const liveId = result.id;

        if (imageFile) {
          const uploadResult = await uploadThumbnail(imageFile, liveId);
          if (uploadResult.success) {
            await updateLive(liveId, { thumbnailUrl: uploadResult.url });
            toast.success('Live criada com sucesso!');
          } else {
            toast.error('Live criada, mas houve erro no upload da thumbnail');
          }
        } else {
          toast.success('Live criada com sucesso!');
        }

        setIsModalOpen(false);
        setImageFile(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error saving live:', error);
      toast.error('Erro ao salvar live');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteLive(id);
      if (result.success) {
        toast.success('Live deletada com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao deletar live');
      }
    } catch (error) {
      console.error('Error deleting live:', error);
      toast.error('Erro ao deletar live');
    }
  };

  const handleToggleLive = async (live) => {
    try {
      setTogglingLive(live.id);
      const newStatus = !live.isLive;
      const result = await toggleLiveStatus(live.id, newStatus);
      if (result.success) {
        toast.success(newStatus ? 'Live iniciada!' : 'Live encerrada!');
      } else {
        toast.error(result.error || 'Erro ao alterar status');
      }
    } catch (error) {
      console.error('Error toggling live:', error);
      toast.error('Erro ao alterar status');
    } finally {
      setTogglingLive(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEffectiveThumbnail = (live) => {
    if (live.thumbnailUrl) return live.thumbnailUrl;
    return getYoutubeThumbnail(live.youtubeUrl);
  };

  const currentLive = lives.find((l) => l.isLive);
  const scheduledLives = lives.filter((l) => !l.isLive && l.scheduledAt);
  const pastLives = lives.filter((l) => !l.isLive && !l.scheduledAt);

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center space-x-3">
            <Radio className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-white">Lives da Cúpula</h1>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>Nova Live</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Total de Lives</p>
            <p className="text-2xl font-bold text-white">{lives.length}</p>
          </div>
          <div className={`rounded-lg p-4 border ${currentLive ? 'bg-red-900/30 border-red-500' : 'bg-card border-gray-700'}`}>
            <p className="text-gray-400 text-sm">Ao Vivo Agora</p>
            <p className={`text-2xl font-bold ${currentLive ? 'text-red-500' : 'text-white'}`}>
              {currentLive ? '1' : '0'}
            </p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Agendadas</p>
            <p className="text-2xl font-bold text-white">{scheduledLives.length}</p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Views</p>
            <p className="text-2xl font-bold text-white">
              {lives.reduce((sum, l) => sum + (l.views || 0), 0)}
            </p>
          </div>
        </div>

        {/* Current Live Banner */}
        {currentLive && (
          <div className="bg-gradient-to-r from-red-900/50 to-red-800/30 rounded-lg p-6 mb-6 border border-red-500">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Radio className="h-8 w-8 text-red-500 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <div>
                  <p className="text-red-400 text-sm font-medium">AO VIVO AGORA</p>
                  <h3 className="text-xl font-bold text-white">{currentLive.title || '(Sem título)'}</h3>
                </div>
              </div>
              <div className="flex items-center space-x-2 md:ml-auto">
                <a
                  href={currentLive.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>Assistir</span>
                </a>
                <button
                  onClick={() => handleToggleLive(currentLive)}
                  disabled={togglingLive === currentLive.id}
                  className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {togglingLive === currentLive.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Square size={16} />
                  )}
                  <span>Encerrar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lives Grid */}
        {lives.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-gray-700">
            <Radio className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              Nenhuma live encontrada. Crie sua primeira live!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lives.map((live) => (
              <div
                key={live.id}
                className={`bg-card rounded-lg shadow-lg overflow-hidden border transition-all ${
                  live.isLive
                    ? 'border-red-500 ring-2 ring-red-500/50'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gray-800">
                  {getEffectiveThumbnail(live) ? (
                    <img
                      src={getEffectiveThumbnail(live)}
                      alt={live.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-16 w-16 text-gray-600" />
                    </div>
                  )}

                  {/* Live Badge */}
                  {live.isLive && (
                    <div className="absolute top-2 left-2 flex items-center space-x-1 bg-red-600 px-2 py-1 rounded-full">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-white">AO VIVO</span>
                    </div>
                  )}

                  {/* Scheduled Badge */}
                  {!live.isLive && live.scheduledAt && (
                    <div className="absolute top-2 left-2 flex items-center space-x-1 bg-yellow-600 px-2 py-1 rounded-full">
                      <Calendar size={12} className="text-white" />
                      <span className="text-xs font-bold text-white">AGENDADA</span>
                    </div>
                  )}

                  {/* Play Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-600/80 rounded-full p-3">
                      <Play size={24} className="text-white ml-1" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                    {live.title || '(Sem título)'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {live.description || '(Sem descrição)'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Eye size={16} />
                      <span>{live.views || 0} views</span>
                    </div>
                    <span>
                      {live.scheduledAt
                        ? `Agendada: ${formatDate(live.scheduledAt)}`
                        : formatDate(live.createdAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-4 border-t border-gray-700">
                    {!live.isLive && (
                      <button
                        onClick={() => handleToggleLive(live)}
                        disabled={togglingLive === live.id || currentLive}
                        title={currentLive ? 'Encerre a live atual primeiro' : 'Iniciar Live'}
                        className="flex items-center justify-center space-x-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
                      >
                        {togglingLive === live.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                    )}
                    {live.isLive && (
                      <button
                        onClick={() => handleToggleLive(live)}
                        disabled={togglingLive === live.id}
                        className="flex items-center justify-center space-x-1 bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg transition-colors"
                      >
                        {togglingLive === live.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(live)}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() =>
                        setDeleteDialog({ isOpen: true, liveId: live.id })
                      }
                      className="flex items-center justify-center bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLive ? 'Editar Live' : 'Nova Live'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Título
            </label>
            <input
              type="text"
              {...register('title')}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Título da live"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              {...register('description')}
              rows="3"
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Descrição da live..."
            />
          </div>

          {/* YouTube URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL do YouTube
            </label>
            <input
              type="text"
              {...register('youtubeUrl')}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="https://www.youtube.com/watch?v=... ou https://youtube.com/live/..."
            />
          </div>

          {/* Scheduled At */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Agendar para (opcional)
              <span className="block text-xs text-gray-500 mt-1">
                Deixe em branco para publicar imediatamente como gravação
              </span>
            </label>
            <input
              type="datetime-local"
              {...register('scheduledAt')}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Is Live Toggle */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Radio className={`${watch('isLive') ? 'text-red-500' : 'text-gray-500'}`} size={24} />
                <div>
                  <p className="text-white font-medium">Iniciar ao vivo agora</p>
                  <p className="text-gray-400 text-sm">
                    {watch('isLive')
                      ? 'A live será marcada como ao vivo'
                      : 'A live será salva como gravação'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const current = watch('isLive');
                  reset({ ...watch(), isLive: !current });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  watch('isLive') ? 'bg-red-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    watch('isLive') ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Thumbnail (opcional)
              <span className="block text-xs text-gray-500 mt-1">
                Se não enviar, será usada a thumbnail do YouTube automaticamente
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
            />
            {imagePreview && (
              <div className="mt-4 border-2 border-red-500 rounded-lg p-2 bg-gray-900">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <p className="text-center text-red-500 text-sm mt-2">
                  {imageFile ? '✓ Thumbnail customizada' : '✓ Thumbnail do YouTube'}
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={uploadingImage}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploadingImage}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {uploadingImage ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{editingLive ? 'Atualizar' : 'Criar'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, liveId: null })}
        onConfirm={() => handleDelete(deleteDialog.liveId)}
        title="Deletar Live"
        message="Tem certeza que deseja deletar esta live? Esta ação não pode ser desfeita."
        confirmText="Deletar"
      />
    </Layout>
  );
};

export default Lives;
