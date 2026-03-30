import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StocktakingPage } from '../features/stocktaking/StocktakingPage';
import { apiClient } from '../services/apiClient';

// Mocks
vi.mock('../services/apiClient', () => ({
    apiClient: vi.fn(),
}));

vi.mock('../utils/formatters', () => ({
    formatDate: (val) => '01/01/2025',
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

vi.mock('react-hot-toast', () => ({
    default: { error: vi.fn(), success: vi.fn() }
}));

// Mock child components
vi.mock('../components/DataTable', () => ({
    DataTable: ({ data }) => (
        <div data-testid="data-table">
            {data.map(item => <div key={item.id}>{item.code} - {item.status}</div>)}
        </div>
    )
}));

vi.mock('../components/Modal', () => ({
    Modal: ({ open, title, children, actions }) => open ? (
        <div role="dialog">
            <h2>{title}</h2>
            {children}
            {actions}
        </div>
    ) : null
}));

// Mock simple form components
vi.mock('../components/forms/Input', () => ({
    Input: (props) => <input data-testid={props.label} {...props} onChange={props.onChange} value={props.value} />
}));
vi.mock('../components/forms/DatePicker', () => ({
    DatePicker: (props) => <input type="date" data-testid={props.label} {...props} />
}));
vi.mock('../components/forms/Select', () => ({
    Select: (props) => <select data-testid={props.label} {...props}><option value="1">Option 1</option></select>
}));
vi.mock('../components/forms/NumberInput', () => ({
    NumberInput: (props) => <input type="number" data-testid={props.label} {...props} />
}));

describe('StocktakingPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default API mocks
        apiClient.mockImplementation((url) => {
            if (url === '/stocktakes') return Promise.resolve({ data: [] });
            if (url === '/products') return Promise.resolve({ data: [{ id: 'p1', sku: 'SKU1', name: 'Prod1' }] });
            if (url === '/warehouse') return Promise.resolve({ data: [{ id: 'loc1', code: 'LOC1' }] });
            if (url === '/inventory') return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });
    });

    it('renders page title and fetch data', async () => {
        apiClient.mockResolvedValueOnce({ data: [{ id: 'st1', code: 'ST-001', status: 'open' }] }); // for /stocktakes

        render(<StocktakingPage />);

        expect(screen.getByText('stocktaking.title')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('ST-001 - open')).toBeInTheDocument();
        });
    });

    it('opens create modal on button click', async () => {
        render(<StocktakingPage />);

        // Button should be the one visible initially
        const createBtns = screen.getAllByText('stocktaking.create');
        // Likely only one initially (the button). Modal is closed (null).
        const createBtn = createBtns[0];

        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
    });
});

