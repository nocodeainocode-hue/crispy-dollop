import { createRoot } from 'react-dom/client';
import './styles.css';
import { Admin } from './Admin';

// Web yalnızca yönetim paneli. Kullanıcı ve vasiler mobil uygulamayı kullanır.
createRoot(document.getElementById('root')!).render(<Admin />);
