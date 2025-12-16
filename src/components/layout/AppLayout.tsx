import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import MiniPlayer from '../player/MiniPlayer';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto">
        <Outlet />
      </main>
      <MiniPlayer />
      <BottomNav />
    </div>
  );
};

export default AppLayout;
