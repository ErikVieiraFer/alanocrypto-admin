import { useState, useEffect } from 'react';
import { Save, Video, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  getIntroVideo,
  updateIntroVideo,
  getYouTubeVideoId,
} from '../services/appConfigService';

const IntroVideo = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    isActive: true,
  });
  const [errors, setErrors] = useState({});
  const [videoId, setVideoId] = useState(null);

  useEffect(() => {
    loadIntroVideo();
  }, []);

  const loadIntroVideo = async () => {
    setLoading(true);
    const result = await getIntroVideo();
    if (result.success && result.data) {
      setFormData({
        title: result.data.title || '',
        description: result.data.description || '',
        videoUrl: result.data.videoUrl || '',
        isActive: result.data.isActive !== undefined ? result.data.isActive : true,
      });
      if (result.data.videoId) {
        setVideoId(result.data.videoId);
      }
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpar erro do campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }

    // Validar URL do YouTube em tempo real
    if (name === 'videoUrl') {
      const extractedId = getYouTubeVideoId(value);
      setVideoId(extractedId);
      if (value && !extractedId) {
        setErrors((prev) => ({
          ...prev,
          videoUrl: 'URL do YouTube inválida',
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (formData.description.length > 150) {
      newErrors.description = 'Descrição deve ter no máximo 150 caracteres';
    }

    if (!formData.videoUrl.trim()) {
      newErrors.videoUrl = 'URL do YouTube é obrigatória';
    } else {
      const extractedId = getYouTubeVideoId(formData.videoUrl);
      if (!extractedId) {
        newErrors.videoUrl =
          'URL do YouTube inválida. Use formatos: youtube.com/watch?v=... ou youtu.be/...';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setSaving(true);

    try {
      const result = await updateIntroVideo(formData);
      if (result.success) {
        toast.success('Vídeo de introdução atualizado com sucesso!');
        if (result.data.videoId) {
          setVideoId(result.data.videoId);
        }
      } else {
        toast.error(result.error || 'Erro ao atualizar vídeo de introdução');
      }
    } catch (error) {
      console.error('Error saving intro video:', error);
      toast.error('Erro ao salvar vídeo de introdução');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    loadIntroVideo();
    setErrors({});
    toast.success('Formulário restaurado');
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Vídeo de Introdução</h1>
          <p className="text-gray-400">
            Configure o vídeo que aparece na home do aplicativo
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campos - 2 colunas */}
            <div className="lg:col-span-2 space-y-6">
              {/* Título */}
              <div className="bg-card rounded-lg p-6 border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Título do Vídeo *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Bem-vindo ao AlanoCryptoFX"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Descrição */}
              <div className="bg-card rounded-lg p-6 border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrição *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  maxLength="150"
                  className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Breve descrição do vídeo..."
                />
                <div className="mt-1 flex justify-between">
                  <div>
                    {errors.description && (
                      <p className="text-sm text-red-500">{errors.description}</p>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {formData.description.length}/150
                  </p>
                </div>
              </div>

              {/* URL do YouTube */}
              <div className="bg-card rounded-lg p-6 border border-gray-700">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL do YouTube *
                </label>
                <input
                  type="url"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                {errors.videoUrl && (
                  <p className="mt-1 text-sm text-red-500">{errors.videoUrl}</p>
                )}
                {videoId && !errors.videoUrl && (
                  <div className="mt-2 flex items-center space-x-2 text-green-500 text-sm">
                    <Video size={16} />
                    <span>Vídeo ID: {videoId}</span>
                  </div>
                )}
                <div className="mt-3 p-3 bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle size={16} className="text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      <p className="font-semibold mb-1">Formatos aceitos:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
                        <li>https://youtu.be/VIDEO_ID</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ativo/Inativo */}
              <div className="bg-card rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-gray-300 font-medium">
                      Vídeo Ativo
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Exibir vídeo na home do aplicativo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.isActive ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end space-x-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview - 1 coluna */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg p-6 border border-gray-700 sticky top-8">
                <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>

                {videoId && !errors.videoUrl ? (
                  <div className="space-y-4">
                    {/* YouTube Embed */}
                    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <h4 className="text-white font-semibold">
                        {formData.title || 'Título do vídeo'}
                      </h4>
                      {formData.description && (
                        <p className="text-gray-400 text-sm">
                          {formData.description}
                        </p>
                      )}
                      {!formData.isActive && (
                        <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs rounded-full">
                          Desativado
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-900 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                    <Video size={48} className="text-gray-600 mb-4" />
                    <p className="text-gray-500 text-sm">
                      {formData.videoUrl
                        ? 'URL do YouTube inválida'
                        : 'Insira uma URL do YouTube para ver o preview'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default IntroVideo;
