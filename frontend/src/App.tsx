import { BrowserRouter } from 'react-router-dom';
import AppFooter from './components/AppFooter';
import NavBar from './components/NavBar';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          {/* Lets keyboard and screen-reader users skip the navigation. */}
          <a
            href="#main-content"
            className="sr-only z-50 rounded-md bg-white px-4 py-2 font-medium text-brand-800 shadow focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
          >
            Skip to main content
          </a>
          <NavBar />
          <main id="main-content" className="flex-1">
            <AppRoutes />
          </main>
          <AppFooter />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
