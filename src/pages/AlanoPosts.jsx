import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash, Heart, Eye, Image as ImageIcon, Video } from 'lucide-react';
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
} from '../services/alanoPostService';

const AlanoPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, postId: null });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

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
      content: '',
      videoUrl: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setImageFile(null);
    setImagePreview(post.imageUrl || null);
    reset({
      title: post.title,
      content: post.content,
      videoUrl: post.videoUrl || '',
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

  const getYouTubeThumbnail = (url) => {
    if (!url) return null;
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (videoId && videoId[1]) {
      return `https://img.youtube.com/vi/${videoId[1]}/mqdefault.jpg`;
    }
    return null;
  };

  const onSubmit = async (data) => {
    try {
      setUploadingImage(true);

      // Validate YouTube URL if provided
      if (data.videoUrl && !data.videoUrl.match(/(?:youtube\.com|youtu\.be)/)) {
        toast.error('URL inválida. Use apenas URLs do YouTube');
        setUploadingImage(false);
        return;
      }

      const postData = {
        title: data.title,
        content: data.content,
        videoUrl: data.videoUrl || '',
        imageUrl: editingPost?.imageUrl || '',
      };

      let result;
      let postId;

      if (editingPost) {
        // Update existing post
        result = await updatePost(editingPost.id, postData);
        postId = editingPost.id;
        if (result.success) {
          toast.success('Post atualizado com sucesso!');
        }
      } else {
        // Create new post
        result = await createPost(postData);
        postId = result.id;
        if (result.success) {
          toast.success('Post criado com sucesso!');
        }
      }

      // Upload image if provided
      if (result.success && imageFile) {
        const uploadResult = await uploadImage(imageFile, postId);
        if (uploadResult.success) {
          await updatePost(postId, { imageUrl: uploadResult.url });
        } else {
          toast.error('Erro ao fazer upload da imagem');
        }
      }

      if (result.success) {
        setIsModalOpen(false);
        setImageFile(null);
        setImagePreview(null);
      } else {
        toast.error(result.error || 'Erro ao salvar post');
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
          <h1 className="text-3xl font-bold text-white">Posts do Alano</h1>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>Criar Post</span>
          </button>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">
              Nenhum post encontrado. Crie seu primeiro post!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-card rounded-lg shadow-lg overflow-hidden border border-gray-700 hover:shadow-xl transition-shadow"
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gray-800">
                  {post.videoUrl ? (
                    <img
                      src={getYouTubeThumbnail(post.videoUrl)}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : post.imageUrl ? (
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-16 w-16 text-gray-600" />
                    </div>
                  )}
                  {post.videoUrl && (
                    <div className="absolute top-2 right-2 bg-red-600 rounded-full p-2">
                      <Video size={16} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {post.content}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Heart size={16} />
                      <span>{post.likes || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye size={16} />
                      <span>{post.views || 0}</span>
                    </div>
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
        title={editingPost ? 'Editar Post' : 'Criar Novo Post'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              {...register('title', { required: 'Título é obrigatório' })}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Título do post"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conteúdo *
            </label>
            <textarea
              {...register('content', { required: 'Conteúdo é obrigatório' })}
              rows="6"
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Conteúdo do post..."
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-500">{errors.content.message}</p>
            )}
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL do Vídeo (YouTube)
            </label>
            <input
              type="url"
              {...register('videoUrl')}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Imagem (max 5MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
            />
            {imagePreview && (
              <div className="mt-4">
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
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
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

export default AlanoPosts;
