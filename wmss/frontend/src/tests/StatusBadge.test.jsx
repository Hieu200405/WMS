import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '../components/StatusBadge';

describe('StatusBadge', () => {
    it('renders correct label for known status', () => {
        render(<StatusBadge status="approved" />);
        expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
        // Check style (partial check)
        const badge = screen.getByText('Đã duyệt').closest('span');
        expect(badge).toHaveClass('bg-indigo-500/10');
    });

    it('renders correct label for another known status', () => {
        render(<StatusBadge status="rejected" />);
        expect(screen.getByText('Từ chối')).toBeInTheDocument();
    });

    it('handles case insensitivity', () => {
        render(<StatusBadge status="APPROVED" />);
        expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
    });

    it('renders fallback for unknown status', () => {
        render(<StatusBadge status="unknown_status" />);
        expect(screen.getByText('unknown_status')).toBeInTheDocument();
    });

    it('renders default draft for empty/null status', () => {
        render(<StatusBadge />);
        expect(screen.getByText('Nháp')).toBeInTheDocument();
    });
});
