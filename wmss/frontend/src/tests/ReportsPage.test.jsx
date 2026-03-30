import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsPage } from '../features/reports/ReportsPage';
import { apiClient } from '../services/apiClient';

// Mocks
vi.mock('../services/apiClient', () => ({
    apiClient: vi.fn(),
}));

vi.mock('../utils/formatters', () => ({
    formatDate: (val) => '01/01/2025',
    formatCurrency: (val) => `$${val}`,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn(), success: vi.fn() }
}));

// Mock Recharts to avoid compilation/rendering issues in test environment
vi.mock('recharts', () => ({
    BarChart: () => <div data-testid="bar-chart">BarChart</div>,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    LineChart: () => <div data-testid="line-chart">LineChart</div>,
    Line: () => null,
    PieChart: () => <div data-testid="pie-chart">PieChart</div>,
    Pie: () => null,
    Cell: () => null
}));

// Mock DataTable
vi.mock('../components/DataTable', () => ({
    DataTable: ({ columns }) => <div data-testid="data-table">DataTable Headers: {columns.map(c => c.header).join(', ')}</div>
}));

describe('ReportsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders overview report by default', async () => {
        // Mock response for overview
        const mockData = {
            counts: { products: 10, pendingReceipts: 2, pendingDeliveries: 3, openIncidents: 0 },
            totalInventoryValue: 1000,
            revenueChart: [],
            inventoryStatus: []
        };
        apiClient.mockResolvedValueOnce({ data: mockData });

        render(<ReportsPage />);

        expect(screen.getByText('reports.title')).toBeInTheDocument();

        await waitFor(() => {
            // Check stat cards
            expect(screen.getByText('Products')).toBeInTheDocument();
            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('$1000')).toBeInTheDocument(); // Formatter mock

            // Check Charts
            expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
            expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
        });
    });

    it('switches tabs and fetches new data', async () => {
        // First load (overview)
        apiClient.mockImplementation((url) => {
            if (url.includes('inventory')) return Promise.resolve({ data: [{ sku: 'INV1', totalQty: 10, status: 'ok' }] });
            return Promise.resolve({ data: {} });
        });

        render(<ReportsPage />);

        // Click Inventory Tab
        const inventoryTab = screen.getByText('Inventory Level');

        fireEvent.click(inventoryTab);

        await waitFor(() => {
            // Should verify call
            expect(apiClient).toHaveBeenCalledWith('/reports/inventory');
            // Should render DataTable
            expect(screen.getByTestId('data-table')).toBeInTheDocument();
        });
    });

    it('handles export PDF', async () => {
        apiClient.mockResolvedValueOnce({ data: {} }); // load
        render(<ReportsPage />);

        // Mock PDF response (blob)
        const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
        apiClient.mockResolvedValueOnce(mockBlob);

        // Mock URL.createObjectURL
        global.URL.createObjectURL = vi.fn(() => 'mock-url');
        global.URL.revokeObjectURL = vi.fn();

        const exportBtn = screen.getByText('Export PDF');
        fireEvent.click(exportBtn);

        await waitFor(() => {
            expect(apiClient).toHaveBeenCalledWith('/reports/overview/pdf', expect.objectContaining({ responseType: 'blob' }));
        });
    });
});
