import { useState, useEffect } from 'react';
import { Users, TrendingUp, FileText, Activity, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getUsersCount } from '../services/userService';
import { getSignals } from '../services/signalService';
import { getPosts } from '../services/alanoPostService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    signals: 0,
    posts: 0,
    activeSignals: 0,
  });
  const [pendingUsers, setPendingUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get users count
        const usersResult = await getUsersCount();
        const usersCount = usersResult.success ? usersResult.count : 0;

        // Get signals
        const unsubscribeSignals = getSignals((signals) => {
          const activeSignals = signals.filter((s) => s.status === 'active').length;
          setStats((prev) => ({
            ...prev,
            signals: signals.length,
            activeSignals,
          }));
        });

        // Get posts
        const unsubscribePosts = getPosts((posts) => {
          setStats((prev) => ({
            ...prev,
            posts: posts.length,
          }));
          setLoading(false);
        });

        // Get pending users
        const unsubscribePending = onSnapshot(
          query(collection(db, 'users'), where('approved', '==', false)),
          (snapshot) => {
            setPendingUsers(snapshot.size);
          }
        );

        setStats((prev) => ({
          ...prev,
          users: usersCount,
        }));

        return () => {
          unsubscribeSignals();
          unsubscribePosts();
          unsubscribePending();
        };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cards = [
    {
      title: 'Total de Usuários',
      value: stats.users,
      icon: Users,
      color: 'text-gray-300',
      bgColor: 'bg-gray-500/10',
    },
    {
      title: 'Aguardando Aprovação',
      value: pendingUsers,
      icon: UserCheck,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      showLink: pendingUsers > 0,
    },
    {
      title: 'Sinais Criados',
      value: stats.signals,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Sinais Ativos',
      value: stats.activeSignals,
      icon: Activity,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Posts do Alano',
      value: stats.posts,
      icon: FileText,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

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
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow border border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${card.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
                <h3 className="text-gray-400 text-sm font-medium mb-1">
                  {card.title}
                </h3>
                <p className="text-3xl font-bold text-white">{card.value}</p>
                {card.showLink && (
                  <Link
                    to="/users?filter=pending"
                    className="text-yellow-400 text-sm hover:underline mt-2 inline-block"
                  >
                    Ver pendentes →
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Welcome Message */}
        <div className="mt-8 bg-card rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-2">
            Bem-vindo ao Painel Administrativo!
          </h2>
          <p className="text-gray-400">
            Use o menu acima para gerenciar sinais de trading e posts exclusivos do Alano.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
