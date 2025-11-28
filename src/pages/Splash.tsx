import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/logo.png';

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/auth');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark overflow-hidden relative">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000"></div>
      </div>

      {/* Logo and text */}
      <div className="relative z-10 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-32 h-32 mb-8 animate-pulse-glow">
          <img src={logo} alt="Youth Tunes" className="w-32 h-32 rounded-full" />
        </div>
        <h1 className="text-6xl font-bold gradient-text mb-4 animate-slide-up">
          Youth Tunes
        </h1>
        <p className="text-xl text-muted-foreground animate-fade-in">
          Your music, everywhere
        </p>
        <div className="mt-8 flex justify-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-100"></div>
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
};

export default Splash;
