import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../components/Modal';

describe('Modal', () => {
    it('renders nothing when open is false', () => {
        render(
            <Modal open={false} title="Test Modal" onClose={() => { }}>
                <div>Modal Content</div>
            </Modal>
        );

        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
        expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
    });

    it('renders content when open is true', () => {
        render(
            <Modal open={true} title="Test Modal" onClose={() => { }}>
                <div>Modal Content</div>
            </Modal>
        );

        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal Content')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const handleClose = vi.fn();
        render(
            <Modal open={true} title="Test Modal" onClose={handleClose}>
                <div>Content</div>
            </Modal>
        );

        const closeButton = screen.getByLabelText('Close modal');
        fireEvent.click(closeButton);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders actions when provided', () => {
        render(
            <Modal
                open={true}
                title="Action Modal"
                onClose={() => { }}
                actions={<button>Confirm Action</button>}
            >
                <div>Content</div>
            </Modal>
        );

        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });
});
