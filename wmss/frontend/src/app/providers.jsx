import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { bootstrapI18n } from '../i18n';
import { AuthProvider } from './auth-context';
import { ThemeProvider } from './theme-context';
import { SocketProvider } from './socket-context';

const i18nInstance = bootstrapI18n();

export function AppProviders({ children }) {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            {children}
            <Toaster position="top-right" />
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
