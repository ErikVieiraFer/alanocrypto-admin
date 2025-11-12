import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Crown } from 'lucide-react';
import Layout from '../components/Layout';
import ImageUpload from '../components/ImageUpload';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  getNewsById,
  createNews,
  updateNews,
  uploadNewsImage,
} from '../services/newsService';

const NewsForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    url: '',
    tags: [],
    imageUrl: '',
    isPremium: false,
    isActive: true,
    publishedAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode) {
      loadNews();
    }
  }, [id]);

  const loadNews = async () => {
    setLoading(true);
    const result = await getNewsById(id);
    if (result.success) {
      const newsData = result.data;
      setFormData({
        title: newsData.title || '',
        content: newsData.content || '',
        url: newsData.url || '',
        tags: newsData.tags || [],
        imageUrl: newsData.imageUrl || '',
        isPremium: newsData.isPremium || false,
        isActive: newsData.isActive !== undefined ? newsData.isActive : true,
        publishedAt: newsData.publishedAt
          ? new Date(newsData.publishedAt.toDate()).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      });
    } else {
      toast.error('Erro ao carregar notícia');
      navigate('/news');
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Limpar erro do campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageSelect = (file) => {
    setImageFile(file);
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim();
      if (tag && !formData.tags.includes(tag)) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, tag],
        }));
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL externa é obrigatória';
    } else {
      try {
        new URL(formData.url);
      } catch (error) {
        newErrors.url = 'URL inválida';
      }
    }

    if (formData.content && formData.content.length > 200) {
      newErrors.content = 'Conteúdo deve ter no máximo 200 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isActive) => {
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }

    setSaving(true);

    try {
      let imageUrl = formData.imageUrl;

      // Se for edição e tiver nova imagem, fazer upload
      if (isEditMode && imageFile) {
        const uploadResult = await uploadNewsImage(imageFile, id);
        if (uploadResult.success) {
          imageUrl = uploadResult.url;
        } else {
          toast.error('Erro ao fazer upload da imagem');
          setSaving(false);
          return;
        }
      }

      // Se for criação, criar primeiro para obter ID
      if (!isEditMode) {
        const newsData = {
          ...formData,
          isActive,
          publishedAt: new Date(formData.publishedAt),
        };

        const result = await createNews(newsData);
        if (!result.success) {
          toast.error(result.error || 'Erro ao criar notícia');
          setSaving(false);
          return;
        }

        const newsId = result.id;

        // Se tiver imagem, fazer upload e atualizar
        if (imageFile) {
          const uploadResult = await uploadNewsImage(imageFile, newsId);
          if (uploadResult.success) {
            await updateNews(newsId, { imageUrl: uploadResult.url });
          } else {
            toast.error('Notícia criada, mas erro ao fazer upload da imagem');
          }
        }

        toast.success('Notícia criada com sucesso!');
        navigate('/news');
      } else {
        // Edição
        const newsData = {
          ...formData,
          isActive,
          imageUrl,
          publishedAt: new Date(formData.publishedAt),
        };

        const result = await updateNews(id, newsData);
        if (result.success) {
          toast.success('Notícia atualizada com sucesso!');
          navigate('/news');
        } else {
          toast.error(result.error || 'Erro ao atualizar notícia');
        }
      }
    } catch (error) {
      console.error('Error saving news:', error);
      toast.error('Erro ao salvar notícia');
    } finally {
      setSaving(false);
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
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/news')}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-white">
            {isEditMode ? 'Editar Notícia' : 'Nova Notícia'}
          </h1>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campos - 2 colunas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Título */}
            <div className="bg-card rounded-lg p-6 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Título *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Título da notícia"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Conteúdo/Resumo */}
            <div className="bg-card rounded-lg p-6 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Conteúdo/Resumo (máx. 200 caracteres)
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows="4"
                maxLength="200"
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Breve resumo da notícia..."
              />
              <div className="mt-1 flex justify-between">
                <div>
                  {errors.content && (
                    <p className="text-sm text-red-500">{errors.content}</p>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {formData.content.length}/200
                </p>
              </div>
            </div>

            {/* URL Externa */}
            <div className="bg-card rounded-lg p-6 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL Externa *
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://..."
              />
              {errors.url && (
                <p className="mt-1 text-sm text-red-500">{errors.url}</p>
              )}
            </div>

            {/* Tags */}
            <div className="bg-card rounded-lg p-6 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Digite uma tag e pressione Enter ou vírgula"
              />
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm flex items-center space-x-2"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-white hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Imagem */}
            <div className="bg-card rounded-lg p-6 border border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Imagem
              </label>
              <ImageUpload
                currentImage={formData.imageUrl}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
              />
            </div>

            {/* Configurações */}
            <div className="bg-card rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Configurações
              </h3>
              <div className="space-y-4">
                {/* Premium */}
                <div className="flex items-center justify-between">
                  <label className="text-gray-300">Premium</label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, isPremium: !prev.isPremium }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.isPremium ? 'bg-yellow-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isPremium ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Ativo */}
                <div className="flex items-center justify-between">
                  <label className="text-gray-300">Ativo</label>
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

                {/* Data de Publicação */}
                <div>
                  <label className="block text-gray-300 mb-2">
                    Data de Publicação
                  </label>
                  <input
                    type="date"
                    name="publishedAt"
                    value={formData.publishedAt}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={() => navigate('/news')}
                disabled={saving}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <FileText size={20} />
                    <span>Salvar Rascunho</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save size={20} />
                    <span>Publicar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview - 1 coluna */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg p-6 border border-gray-700 sticky top-8">
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                {/* Thumbnail */}
                <div className="relative h-48 bg-gray-900">
                  {(imageFile || formData.imageUrl) ? (
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-600">Sem imagem</span>
                    </div>
                  )}
                  {formData.isPremium && (
                    <div className="absolute top-2 right-2 bg-yellow-600 rounded-full p-2">
                      <Crown size={16} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h4 className="text-white font-semibold mb-2 line-clamp-2">
                    {formData.title || 'Título da notícia'}
                  </h4>
                  {formData.content && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-3">
                      {formData.content}
                    </p>
                  )}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {new Date(formData.publishedAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        formData.isActive
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {formData.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NewsForm;
