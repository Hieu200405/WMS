import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RoleGuard } from '../components/RoleGuard';
import * as AuthContext from '../app/auth-context';

// Mock the entire auth module
vi.mock('../app/auth-context', () => ({
    useAuth: vi.fn(),
}));

describe('RoleGuard', () => {
    it('renders children when user has required role', () => {
        AuthContext.useAuth.mockReturnValue({
            user: { role: 'Admin' },
        });

        render(
            <RoleGuard roles={['Admin']}>
                <div>Accessible Content</div>
            </RoleGuard>
        );

        expect(screen.getByText('Accessible Content')).toBeInTheDocument();
    });

    it('renders fallback when user does not have required role', () => {
        AuthContext.useAuth.mockReturnValue({
            user: { role: 'Staff' },
        });

        render(
            <RoleGuard roles={['Admin']} fallback={<div>Access Denied</div>}>
                <div>Accessible Content</div>
            </RoleGuard>
        );

        expect(screen.queryByText('Accessible Content')).not.toBeInTheDocument();
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('renders children when user has one of multiple allowed roles', () => {
        AuthContext.useAuth.mockReturnValue({
            user: { role: 'Manager' },
        });

        render(
            <RoleGuard roles={['Admin', 'Manager']}>
                <div>Accessible Content</div>
            </RoleGuard>
        );

        expect(screen.getByText('Accessible Content')).toBeInTheDocument();
    });

    it('renders nothing (null) by default when access denied and no fallback provided', () => {
        AuthContext.useAuth.mockReturnValue({
            user: { role: 'Staff' },
        });

        const { container } = render(
            <RoleGuard roles={['Admin']}>
                <div>Secret</div>
            </RoleGuard>
        );

        expect(container).toBeEmptyDOMElement();
    });

    it('renders children if roles prop is empty/undefined (public access logic)', () => {
        // Assuming logic: if !roles, return children.
        AuthContext.useAuth.mockReturnValue({ user: { role: 'Guest' } });

        render(
            <RoleGuard>
                <div>Public Content</div>
            </RoleGuard>
        );
        expect(screen.getByText('Public Content')).toBeInTheDocument();
    });
});
