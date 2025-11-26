import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, Play, ExternalLink, Image } from 'lucide-react';
import Layout from '../components/Layout';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadCourseThumbnail,
  extractYouTubeId,
} from '../services/courseService';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    order: 0,
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [editingCourse, setEditingCourse] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    courseId: null,
    thumbnailUrl: null,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    const result = await getAllCourses();
    if (result.success) {
      setCourses(result.data);
    } else {
      toast.error('Erro ao carregar cursos');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      videoUrl: '',
      order: courses.length,
    });
    setThumbnailFile(null);
    setThumbnailPreview('');
    setEditingCourse(null);
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title || '',
      description: course.description || '',
      videoUrl: course.videoUrl || '',
      order: course.order || 0,
    });
    setThumbnailPreview(course.thumbnailUrl || '');
    setThumbnailFile(null);

    // Scroll para o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let thumbnailUrl = editingCourse?.thumbnailUrl || '';

      // Upload da thumbnail se houver novo arquivo
      if (thumbnailFile) {
        setUploadingThumbnail(true);
        const uploadResult = await uploadCourseThumbnail(thumbnailFile);
        setUploadingThumbnail(false);

        if (!uploadResult.success) {
          toast.error(uploadResult.error);
          setSaving(false);
          return;
        }
        thumbnailUrl = uploadResult.data.url;
      }

      // thumbnailUrl é opcional - se não houver, salva como null
      // O Flutter detecta null e usa a thumbnail padrão do YouTube
      const courseData = {
        ...formData,
        thumbnailUrl: thumbnailUrl || null,
      };

      let result;
      if (editingCourse) {
        result = await updateCourse(editingCourse.id, courseData);
      } else {
        result = await createCourse(courseData);
      }

      if (result.success) {
        toast.success(editingCourse ? 'Curso atualizado!' : 'Curso criado!');
        resetForm();
        loadCourses();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao salvar curso');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const { courseId, thumbnailUrl } = deleteDialog;
    const result = await deleteCourse(courseId, thumbnailUrl);

    if (result.success) {
      toast.success('Curso excluído!');
      loadCourses();
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }

    setDeleteDialog({ isOpen: false, courseId: null, thumbnailUrl: null });
  };

  const filteredCourses = courses.filter((course) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        course.title?.toLowerCase().includes(search) ||
        course.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getYouTubeThumbnail = (url) => {
    const videoId = extractYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Gerenciar Cursos</h1>

        {/* Formulário */}
        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingCourse ? 'Editar Curso' : 'Novo Curso'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Nome do curso"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Descrição do curso"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                URL do YouTube *
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://youtube.com/watch?v=..."
                required
              />
              {formData.videoUrl && extractYouTubeId(formData.videoUrl) && (
                <p className="text-xs text-green-500 mt-1">
                  ✓ ID do vídeo: {extractYouTubeId(formData.videoUrl)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Ordem
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="w-32 px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                min={0}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Thumbnail (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-green-600 file:text-white hover:file:bg-green-700"
              />
              <p className="text-xs text-gray-400 mt-1">
                Deixe vazio para usar thumbnail padrão do YouTube
              </p>
              {thumbnailPreview && (
                <div className="mt-2">
                  <img
                    src={thumbnailPreview}
                    alt="Preview"
                    className="h-32 w-auto rounded-lg object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || uploadingThumbnail}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving || uploadingThumbnail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {uploadingThumbnail ? 'Enviando imagem...' : 'Salvando...'}
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {editingCourse ? 'Atualizar' : 'Criar Curso'}
                  </>
                )}
              </button>

              {editingCourse && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-lg p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Lista de Cursos */}
        <div className="bg-card rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-2">Carregando...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-8 text-center">
              <Image className="w-12 h-12 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">Nenhum curso encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Thumbnail
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Título
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Vídeo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Ordem
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className="hover:bg-primary/50">
                      <td className="px-4 py-3">
                        <img
                          src={course.thumbnailUrl || getYouTubeThumbnail(course.videoUrl)}
                          alt={course.title}
                          className="w-20 h-12 object-cover rounded"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80x48?text=No+Image';
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{course.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm line-clamp-2">
                          {course.description?.substring(0, 80)}
                          {course.description?.length > 80 ? '...' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={course.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-500 hover:text-green-400 text-sm"
                        >
                          <Play size={14} />
                          Assistir
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400">{course.order || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(course)}
                            className="p-2 text-blue-500 hover:bg-blue-500/20 rounded"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                courseId: course.id,
                                thumbnailUrl: course.thumbnailUrl,
                              })
                            }
                            className="p-2 text-red-500 hover:bg-red-500/20 rounded"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Diálogo de confirmação */}
        <ConfirmDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog({ isOpen: false, courseId: null, thumbnailUrl: null })}
          onConfirm={handleDelete}
          title="Excluir Curso"
          message="Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita."
        />
      </div>
    </Layout>
  );
}
