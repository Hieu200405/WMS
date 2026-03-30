import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginPage } from '../features/auth/LoginPage';

// Mocks
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

vi.mock('../app/auth-context', () => ({
    useAuth: () => ({
        login: mockLogin,
    }),
}));

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form correctly', () => {
        render(<LoginPage />);
        expect(screen.getByText('login.title')).toBeInTheDocument();
        expect(screen.getByLabelText('login.username')).toBeInTheDocument();
        expect(screen.getByLabelText('login.password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'login.submit' })).toBeInTheDocument();
    });

    it('handles input changes', () => {
        render(<LoginPage />);
        const usernameInput = screen.getByLabelText('login.username');
        const passwordInput = screen.getByLabelText('login.password');

        fireEvent.change(usernameInput, { target: { value: 'test@user.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(usernameInput).toHaveValue('test@user.com');
        expect(passwordInput).toHaveValue('password123');
    });

    it('submits form with correct credentials', async () => {
        mockLogin.mockResolvedValueOnce({}); // Simulate success
        render(<LoginPage />);

        const usernameInput = screen.getByLabelText('login.username');
        const passwordInput = screen.getByLabelText('login.password');
        const submitButton = screen.getByRole('button', { name: 'login.submit' });

        fireEvent.change(usernameInput, { target: { value: 'test@user.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith({ username: 'test@user.com', password: 'password123' });
        });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        });
    });

    it('displays error message on login failure', async () => {
        mockLogin.mockRejectedValueOnce(new Error('Invalid credentials')); // Simulate error
        render(<LoginPage />);

        const submitButton = screen.getByRole('button', { name: 'login.submit' });
        fireEvent.click(submitButton); // Use default values since they are pre-filled

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });
});
