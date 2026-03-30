import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple component to test
function HelloWorld() {
    return <h1>Hello World</h1>;
}

describe('Frontend Setup', () => {
    it('should pass smoke test', () => {
        expect(true).toBe(true);
    });

    it('should render component correctly', () => {
        render(<HelloWorld />);
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
});
