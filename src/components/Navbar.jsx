import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, FileText, Users, LogOut, Menu, X, Newspaper, Video, GraduationCap, Link2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
    { name: 'Vídeo Introdução', path: '/intro-video', icon: Video },
    { name: 'Usuários', path: '/users', icon: Users },
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
    <nav className="bg-card shadow-lg border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-black rounded-lg p-2">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                AlanoCryptoFX <span className="text-white">Admin</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isUsersPage = item.path === '/users';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
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
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isUsersPage = item.path === '/users';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
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
              className="w-full flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
