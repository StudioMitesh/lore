import './index.css';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from '@/components/ui/sonner';

const App = () => {
  return (
    <Router>
      <AppRoutes />
      <Toaster />
    </Router>
  );
};

export default App;
