import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen bg-cyber-dark">
      <Header />
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}
