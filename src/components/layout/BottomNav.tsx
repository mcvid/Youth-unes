import { Home, Search, LibraryMusic, Person } from '@mui/icons-material';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const BottomNav = () => {
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: LibraryMusic, label: 'Library', path: '/library' },
    { icon: Person, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 gap-1 transition-all',
                'hover:text-primary',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
