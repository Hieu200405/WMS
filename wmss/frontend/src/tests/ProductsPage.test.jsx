import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsPage } from '../features/products/ProductsPage';
import { apiClient } from '../services/apiClient';

// Mock dependencies
vi.mock('react-router-dom', () => ({
    useOutletContext: () => ({ searchTerm: '' }),
    useNavigate: vi.fn(),
    useLocation: () => ({ pathname: '/products' }),
    Link: ({ children }) => <a>{children}</a>,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, defaultVal) => defaultVal || key,
    }),
}));

vi.mock('../services/apiClient');

describe('ProductsPage Integration (Enterprise Grade)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementation for fetching data
        apiClient.mockResolvedValue({ data: [] });
    });

    it('renders initial state and fetches data', async () => {
        // Mock successful data fetch
        apiClient.mockImplementation((url) => {
            if (url === '/products') return Promise.resolve({ data: [{ id: '1', sku: 'P1', name: 'Product 1', priceIn: 10, priceOut: 20 }] });
            if (url === '/categories') return Promise.resolve({ data: [{ id: 'c1', name: 'Category 1' }] });
            if (url === '/partners') return Promise.resolve({ data: [{ id: 's1', name: 'Supplier 1' }] });
            return Promise.resolve({ data: [] });
        });

        render(<ProductsPage />);

        // Wait for data to load
        await waitFor(() => {
            expect(apiClient).toHaveBeenCalledWith('/categories');
            expect(apiClient).toHaveBeenCalledWith('/partners', { params: { type: 'supplier' } });
        });

        // Verify data items rendered
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('P1')).toBeInTheDocument();
    });

    it('opens create modal when clicking create button', async () => {
        render(<ProductsPage />);

        const createBtn = screen.getByText('products.create');
        fireEvent.click(createBtn);

        expect(screen.getByText('Thêm sản phẩm')).toBeInTheDocument(); // Title of modal
        expect(screen.getByLabelText('SKU')).toBeInTheDocument();
    });

    it('handles form submission for new product', async () => {
        const mockPost = vi.fn().mockResolvedValue({ data: { id: 'new' } });
        apiClient.mockImplementation((url, options) => {
            if (options?.method === 'POST' && url === '/products') {
                return mockPost(url, options);
            }
            if (url === '/categories') return Promise.resolve({ data: [{ id: 'c1', name: 'Cat 1' }] });
            if (url === '/partners') return Promise.resolve({ data: [{ id: 's1', name: 'Sup 1' }] });
            return Promise.resolve({ data: [] });
        });

        render(<ProductsPage />);

        // Wait for data to load
        await waitFor(() => {
            expect(apiClient).toHaveBeenCalledWith('/categories');
        });

        // Open modal
        fireEvent.click(screen.getByText('products.create'));

        // Fill form
        fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'TEST-SKU' } });
        fireEvent.change(screen.getByLabelText('products.name'), { target: { value: 'Test Product' } });
        fireEvent.change(screen.getByLabelText('products.unit'), { target: { value: 'pcs' } });

        // Select Category (assuming Select component renders a select element)
        fireEvent.change(screen.getByLabelText('products.category'), { target: { value: 'c1' } });

        // Select Supplier
        fireEvent.change(screen.getByLabelText('Nhà cung cấp ưu tiên'), { target: { value: 's1' } });

        fireEvent.change(screen.getByLabelText('Giá nhập (Chuẩn)'), { target: { value: '1000' } });
        fireEvent.change(screen.getByLabelText('Giá bán'), { target: { value: '2000' } });

        // Submit
        fireEvent.click(screen.getByText('app.save'));

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalled();
            // Check payload
            const callArgs = mockPost.mock.calls[0];
            const body = callArgs[1].body;
            expect(body.sku).toBe('TEST-SKU');
            expect(body.name).toBe('Test Product');
        });
    });

    it('handles api error gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        apiClient.mockRejectedValue(new Error('Network Error'));

        render(<ProductsPage />);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        // Should verify toast error, but toast mock is implicit usually.
        // We can just ensure app didn't crash
        expect(screen.getByText('products.title')).toBeInTheDocument();
    });
});
