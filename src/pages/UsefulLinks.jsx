import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Search, ExternalLink, Link as LinkIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import Layout from '../components/Layout';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  getAllLinks,
  createLink,
  updateLink,
  deleteLink,
  availableIcons
} from '../services/linkService';

export default function UsefulLinks() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    icon: 'link',
    order: 0,
    isActive: true
  });
  const [editingLink, setEditingLink] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    linkId: null,
  });

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    const result = await getAllLinks();
    if (result.success) {
      setLinks(result.data);
    } else {
      toast.error('Erro ao carregar links');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      url: '',
      icon: 'link',
      order: links.length,
      isActive: true
    });
    setEditingLink(null);
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    setFormData({
      title: link.title || '',
      description: link.description || '',
      url: link.url || '',
      icon: link.icon || 'link',
      order: link.order || 0,
      isActive: link.isActive !== false
    });

    // Scroll para o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validar URL
      if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
        toast.error('URL deve começar com http:// ou https://');
        setSaving(false);
        return;
      }

      let result;
      if (editingLink) {
        result = await updateLink(editingLink.id, formData);
      } else {
        result = await createLink(formData);
      }

      if (result.success) {
        toast.success(editingLink ? 'Link atualizado!' : 'Link criado!');
        resetForm();
        loadLinks();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Erro ao salvar link');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const { linkId } = deleteDialog;
    const result = await deleteLink(linkId);

    if (result.success) {
      toast.success('Link excluído!');
      loadLinks();
    } else {
      toast.error(result.error || 'Erro ao excluir');
    }

    setDeleteDialog({ isOpen: false, linkId: null });
  };

  const handleToggleActive = async (link) => {
    const result = await updateLink(link.id, { isActive: !link.isActive });
    if (result.success) {
      toast.success(link.isActive ? 'Link desativado' : 'Link ativado');
      loadLinks();
    } else {
      toast.error('Erro ao alterar status');
    }
  };

  const filteredLinks = links.filter((link) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        link.title?.toLowerCase().includes(search) ||
        link.description?.toLowerCase().includes(search) ||
        link.url?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Gerenciar Links Úteis</h1>

        {/* Formulário */}
        <div className="bg-card rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingLink ? 'Editar Link' : 'Novo Link'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex: Canal do Telegram"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Ícone
                </label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {availableIcons.map((icon) => (
                    <option key={icon.value} value={icon.value}>
                      {icon.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Descrição *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Descrição do link"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="https://..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-600'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${formData.isActive ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-300">
                    {formData.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {editingLink ? 'Atualizar' : 'Criar Link'}
                  </>
                )}
              </button>

              {editingLink && (
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
              placeholder="Buscar links..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-primary border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Lista de Links */}
        <div className="bg-card rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 mt-2">Carregando...</p>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="p-8 text-center">
              <LinkIcon className="w-12 h-12 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">Nenhum link encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Título
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Ordem
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-primary/50">
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{link.title}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm line-clamp-2">
                          {link.description?.substring(0, 50)}
                          {link.description?.length > 50 ? '...' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-green-500 hover:text-green-400 text-sm"
                        >
                          <ExternalLink size={14} />
                          Abrir
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400">{link.order || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(link)}
                          className={`flex items-center gap-1 text-sm ${link.isActive ? 'text-green-500' : 'text-gray-500'}`}
                        >
                          {link.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          {link.isActive ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(link)}
                            className="p-2 text-blue-500 hover:bg-blue-500/20 rounded"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteDialog({
                                isOpen: true,
                                linkId: link.id,
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
          onClose={() => setDeleteDialog({ isOpen: false, linkId: null })}
          onConfirm={handleDelete}
          title="Excluir Link"
          message="Tem certeza que deseja excluir este link? Esta ação não pode ser desfeita."
        />
      </div>
    </Layout>
  );
}
