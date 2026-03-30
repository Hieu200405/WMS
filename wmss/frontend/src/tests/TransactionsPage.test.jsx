import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionsPage } from '../features/financials/TransactionsPage';
import { apiClient } from '../services/apiClient';

// Mocks
vi.mock('../services/apiClient', () => ({
    apiClient: vi.fn(),
}));

vi.mock('../utils/formatters', () => ({
    formatCurrency: (val) => `${val} VND`,
    formatDate: (val) => '01/01/2025',
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn() }
}));

// Mock child components to avoid deep rendering issues and isolate test
vi.mock('../components/DataTable', () => ({
    DataTable: ({ data, emptyMessage }) => (
        <div data-testid="data-table">
            {data.length === 0 ? emptyMessage : data.map(item => (
                <div key={item._id}>{item.referenceId} - {item.amount}</div>
            ))}
        </div>
    )
}));

describe('TransactionsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        // Return a promise that never resolves immediately
        apiClient.mockReturnValue(new Promise(() => { }));
        render(<TransactionsPage />);
        expect(screen.getByText('financials.title')).toBeInTheDocument();
    });

    it('fetches and displays transactions', async () => {
        const mockData = [
            {
                _id: '1',
                type: 'income',
                amount: 1000000,
                referenceId: 'REF-123',
                status: 'completed'
            }
        ];

        apiClient.mockResolvedValue({ data: mockData });

        render(<TransactionsPage />);

        await waitFor(() => {
            expect(screen.getByText('REF-123 - 1000000')).toBeInTheDocument();
        });
    });

    it('handles fetch error', async () => {
        apiClient.mockRejectedValue(new Error('Network Error'));
        render(<TransactionsPage />);

        // Ideally we should check if toast was called.
        const { default: toast } = await import('react-hot-toast');
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('Failed to load transactions');
        });
    });
});
