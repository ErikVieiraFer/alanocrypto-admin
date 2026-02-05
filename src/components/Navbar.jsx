import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, FileText, Users, LogOut, Menu, X, Newspaper, Video, GraduationCap, Link2, Crown, ChevronLeft, ChevronRight, Star, Radio } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const { signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Sinais', path: '/signals', icon: TrendingUp },
    { name: 'Posts do Alano', path: '/alano-posts', icon: FileText },
    { name: 'Notícias', path: '/news', icon: Newspaper },
    { name: 'Cursos', path: '/courses', icon: GraduationCap },
    { name: 'Links Úteis', path: '/useful-links', icon: Link2 },
    { name: 'Vídeo Intro', path: '/intro-video', icon: Video },
    { name: 'Usuários', path: '/users', icon: Users },
    { name: 'Assinantes', path: '/premium-members', icon: Crown },
    { name: 'Posts Cúpula', path: '/cupula-posts', icon: Star },
    { name: 'Lives', path: '/lives', icon: Radio },
  ];

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), where('approved', '==', false)),
      (snapshot) => {
        setPendingCount(snapshot.size);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success('Logout realizado com sucesso!');
    } else {
      toast.error('Erro ao fazer logout');
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <nav className="lg:hidden bg-[#0f0f0f] shadow-lg border-b border-gray-700 fixed top-0 left-0 right-0 z-50">
        <div className="px-4">
          <div className="flex justify-between items-center h-14">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-black rounded-lg p-1.5">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Admin</span>
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64
        bg-[#0f0f0f] border-r border-gray-700
        z-50 lg:hidden
        transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        overflow-y-auto
      `}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-700">
          <Link to="/" className="flex items-center space-x-2" onClick={() => setIsMenuOpen(false)}>
            <div className="bg-black rounded-lg p-1.5">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Admin</span>
          </Link>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="text-gray-300 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isUsersPage = item.path === '/users';
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-white text-black'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
                {isUsersPage && pendingCount > 0 && (
                  <span className="ml-auto bg-yellow-500 text-black px-2 py-0.5 rounded-full text-xs font-bold">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={() => {
              handleSignOut();
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-[#0f0f0f] border-r border-gray-700 transition-all duration-300 z-50 ${
        isSidebarCollapsed ? 'w-16' : 'w-56'
      }`}>
        <div className={`flex items-center h-16 border-b border-gray-700 ${isSidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}>
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-black rounded-lg p-2 flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-lg font-bold text-white whitespace-nowrap">Admin</span>
            )}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isUsersPage = item.path === '/users';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-lg transition-colors ${
                    isSidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-3 py-2.5'
                  } ${
                    isActive(item.path)
                      ? 'bg-white text-black'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!isSidebarCollapsed && (
                    <>
                      <span className="truncate">{item.name}</span>
                      {isUsersPage && pendingCount > 0 && (
                        <span className="ml-auto bg-yellow-500 text-black px-2 py-0.5 rounded-full text-xs font-bold">
                          {pendingCount}
                        </span>
                      )}
                    </>
                  )}
                  {isSidebarCollapsed && isUsersPage && pendingCount > 0 && (
                    <span className="absolute top-0 right-0 bg-yellow-500 text-black w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-700 p-2">
          <button
            onClick={handleSignOut}
            title={isSidebarCollapsed ? 'Sair' : undefined}
            className={`w-full flex items-center rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors ${
              isSidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-3 py-2.5'
            }`}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!isSidebarCollapsed && <span>Sair</span>}
          </button>
        </div>

        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-1 shadow-lg border border-gray-600"
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>
    </>
  );
};

export default Navbar;
