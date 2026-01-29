import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash, Eye, Image as ImageIcon, Crown } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  uploadImage,
} from '../services/cupulaPostService';

const CupulaPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, postId: null });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const unsubscribe = getPosts((data) => {
      setPosts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setEditingPost(null);
    setImageFile(null);
    setImagePreview(null);
    reset({
      title: '',
      excerpt: '',
      content: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setImageFile(null);
    setImagePreview(post.imageUrl || null);
    reset({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
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

      let imageUrl = editingPost?.imageUrl;

      if (editingPost) {
        if (imageFile) {
          const uploadResult = await uploadImage(imageFile, editingPost.id);
          if (!uploadResult.success) {
            toast.error('Erro ao fazer upload da imagem');
            setUploadingImage(false);
            return;
          }
          imageUrl = uploadResult.url;
        }

        const postData = {
          title: data.title || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          ...(imageUrl && { imageUrl }),
        };

        const result = await updatePost(editingPost.id, postData);
        if (result.success) {
          toast.success('Post atualizado com sucesso!');
          setIsModalOpen(false);
          setImageFile(null);
          setImagePreview(null);
        } else {
          toast.error(result.error || 'Erro ao atualizar post');
        }
      } else {
        const postData = {
          title: data.title || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
        };

        const result = await createPost(postData);
        if (!result.success) {
          toast.error(result.error || 'Erro ao criar post');
          setUploadingImage(false);
          return;
        }

        const postId = result.id;

        if (imageFile) {
          const uploadResult = await uploadImage(imageFile, postId);
          if (uploadResult.success) {
            const updateResult = await updatePost(postId, { imageUrl: uploadResult.url });
            if (updateResult.success) {
              toast.success('Post criado com sucesso!');
            } else {
              toast.error('Post criado, mas erro ao salvar URL da imagem');
            }
          } else {
            toast.error('Post criado, mas houve erro no upload da imagem');
          }
        } else {
          toast.success('Post criado com sucesso!');
        }

        setIsModalOpen(false);
        setImageFile(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Erro ao salvar post');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const result = await deletePost(id);
      if (result.success) {
        toast.success('Post deletado com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao deletar post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erro ao deletar post');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center space-x-3">
            <Crown className="h-8 w-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-white">Posts da Cúpula</h1>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>Criar Post</span>
          </button>
        </div>

        {/* Stats */}
        <div className="bg-card rounded-lg p-4 mb-6 border border-gray-700">
          <p className="text-gray-400 text-sm">Total de Posts</p>
          <p className="text-2xl font-bold text-white">{posts.length}</p>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-gray-700">
            <Crown className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">
              Nenhum post encontrado. Crie seu primeiro post!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-card rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:border-yellow-500/50 transition-all"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gray-800">
                  {post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.title || 'Post'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-900/20 to-gray-800">
                      <ImageIcon className="h-16 w-16 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-yellow-600 rounded-full p-2">
                    <Crown size={16} className="text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                    {post.title || '(Sem título)'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {post.excerpt || post.content || '(Sem conteúdo)'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Eye size={16} />
                      <span>{post.views || 0} views</span>
                    </div>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => openEditModal(post)}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() =>
                        setDeleteDialog({ isOpen: true, postId: post.id })
                      }
                      className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Trash size={16} />
                      <span>Deletar</span>
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
        title={editingPost ? 'Editar Post' : 'Novo Post'}
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
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Título do post"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Resumo
            </label>
            <textarea
              {...register('excerpt')}
              rows="2"
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Resumo do post..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conteúdo
            </label>
            <textarea
              {...register('content')}
              rows="8"
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Conteúdo do post..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Imagem
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-600 file:text-white hover:file:bg-yellow-700"
            />
            {imagePreview && (
              <div className="mt-4 border-2 border-yellow-500 rounded-lg p-2 bg-gray-900">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
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
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {uploadingImage ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{editingPost ? 'Atualizar' : 'Criar'}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, postId: null })}
        onConfirm={() => handleDelete(deleteDialog.postId)}
        title="Deletar Post"
        message="Tem certeza que deseja deletar este post? Esta ação não pode ser desfeita."
        confirmText="Deletar"
      />
    </Layout>
  );
};

export default CupulaPosts;
