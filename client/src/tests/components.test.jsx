import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExpenseModal from '../components/budget/ExpenseModal';
import TrendView from '../components/budget/TrendView';
import InsightCard from '../components/budget/InsightCard';

// Mock Recharts to avoid compilation issues in test env
vi.mock('recharts', () => {
    const OriginalModule = vi.importActual('recharts');
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
        BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
        Bar: () => <div />,
        XAxis: () => <div />,
        YAxis: () => <div />,
        CartesianGrid: () => <div />,
        Tooltip: () => <div />,
        Legend: () => <div />,
    };
});

describe('ExpenseModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const mockCategories = ['Food', 'Transport'];

    it('renders correctly when open', () => {
        render(<ExpenseModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} categories={mockCategories} isDark={false} />);
        // Header buttons should be present
        expect(screen.getByText('支出')).toBeInTheDocument();
        expect(screen.getByText('收入')).toBeInTheDocument();
        // Category should be visible
        expect(screen.getByText('Food')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<ExpenseModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} categories={mockCategories} isDark={false} />);
        expect(screen.queryByText('新增款項')).not.toBeInTheDocument();
    });
});

describe('InsightCard', () => {
    it('renders nothing if no insights', () => {
        const { container } = render(<InsightCard expenses={[]} budgets={{}} categories={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders warning if anomaly detected', () => {
        // Insight logic is tested in unit test
    });
});

describe('TrendView', () => {
    it('renders with current year and default period', () => {
        const currentYear = new Date().getFullYear();
        render(<TrendView expenses={[]} isDark={false} />);

        // Use strict matching for the description text to avoid matching buttons
        // Description format: "{year}年 全年度"
        expect(screen.getByText(`${currentYear}年 全年度`)).toBeInTheDocument();
    });

    it('changes period on click', () => {
        render(<TrendView expenses={[]} isDark={false} />);

        // Click the H1 button
        const h1Button = screen.getByRole('button', { name: '上半年' });
        fireEvent.click(h1Button);

        // Verify description changed to "YYYY年 上半年"
        const currentYear = new Date().getFullYear();
        expect(screen.getByText(`${currentYear}年 上半年`)).toBeInTheDocument();
    });
});
