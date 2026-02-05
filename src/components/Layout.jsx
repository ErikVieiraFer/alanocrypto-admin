import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-primary relative">
      <Navbar />
      <main className="pt-16 lg:pt-0 lg:ml-56 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300">
        {children}
      </main>
    </div>
  );
};

export default Layout;

