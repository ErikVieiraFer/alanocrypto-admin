import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, Eye, MousePointerClick, Search } from 'lucide-react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { getAllNews, deleteNews, deleteNewsImage } from '../services/newsService';

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, newsId: null });
  const navigate = useNavigate();

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    const result = await getAllNews();
    if (result.success) {
      setNews(result.data);
    } else {
      toast.error('Erro ao carregar notícias');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      const result = await deleteNews(id);
      if (result.success) {
        toast.success('Notícia deletada com sucesso!');
        loadNews(); // Recarregar lista
      } else {
        toast.error(result.error || 'Erro ao deletar notícia');
      }
    } catch (error) {
      console.error('Error deleting news:', error);
      toast.error('Erro ao deletar notícia');
    } finally {
      setDeleteDialog({ isOpen: false, newsId: null });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };

  const truncate = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Filtrar notícias
  const filteredNews = news.filter((item) => {
    // Filtro de busca
    if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filtro de status
    if (statusFilter === 'active' && !item.isActive) return false;
    if (statusFilter === 'inactive' && item.isActive) return false;

    // Filtro de tipo
    if (typeFilter === 'premium' && !item.isPremium) return false;
    if (typeFilter === 'free' && item.isPremium) return false;

    return true;
  });

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
          <h1 className="text-3xl font-bold text-white">Notícias</h1>
          <button
            onClick={() => navigate('/news/new')}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>Nova Notícia</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-lg p-4 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>

            {/* Filtro de Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todas</option>
              <option value="premium">Premium</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        {filteredNews.length === 0 ? (
          <div className="bg-card rounded-lg p-12 text-center border border-gray-700">
            <p className="text-gray-400 text-lg">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Nenhuma notícia encontrada com os filtros aplicados.'
                : 'Nenhuma notícia encontrada. Crie sua primeira notícia!'}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Imagem
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tags
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Publicado em
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Clicks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredNews.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-800 transition-colors">
                      {/* Thumbnail */}
                      <td className="px-4 py-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500 text-xs">Sem imagem</span>
                          </div>
                        )}
                      </td>

                      {/* Título */}
                      <td className="px-4 py-3">
                        <p className="text-white font-semibold">{truncate(item.title, 50)}</p>
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.tags && item.tags.length > 0 ? (
                            item.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                          {item.tags && item.tags.length > 2 && (
                            <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                              +{item.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.isActive
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {item.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.isPremium
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-600 text-white'
                          }`}
                        >
                          {item.isPremium ? 'Premium' : 'Free'}
                        </span>
                      </td>

                      {/* Publicado em */}
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {formatDate(item.publishedAt)}
                      </td>

                      {/* Views */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 text-gray-300">
                          <Eye size={16} />
                          <span>{item.views || 0}</span>
                        </div>
                      </td>

                      {/* Clicks */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 text-gray-300">
                          <MousePointerClick size={16} />
                          <span>{item.clicks || 0}</span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/news/edit/${item.id}`)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({ isOpen: true, newsId: item.id })
                            }
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Deletar"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, newsId: null })}
        onConfirm={() => handleDelete(deleteDialog.newsId)}
        title="Deletar Notícia"
        message="Tem certeza que deseja deletar esta notícia? A imagem também será removida. Esta ação não pode ser desfeita."
        confirmText="Deletar"
      />
    </Layout>
  );
};

export default News;
