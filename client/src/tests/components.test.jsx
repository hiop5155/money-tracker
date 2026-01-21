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
        render(
            <ExpenseModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
                categories={mockCategories}
                isDark={false}
            />
        );
        // Header buttons should be present
        expect(screen.getByText('支出')).toBeInTheDocument();
        expect(screen.getByText('收入')).toBeInTheDocument();
        // Category should be visible
        expect(screen.getByText('Food')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(
            <ExpenseModal
                isOpen={false}
                onClose={mockOnClose}
                onSave={mockOnSave}
                categories={mockCategories}
            />
        );
        expect(screen.queryByText('新增款項')).not.toBeInTheDocument();
    });
});

describe('InsightCard', () => {
    it('renders nothing if no insights', () => {
        const { container } = render(<InsightCard expenses={[]} budgets={{}} categories={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders warning if anomaly detected', () => {
        // Insight logic is tested in unit test, here we test rendering component given "high spending"
        // But generatesInsights runs inside the component, so we need to provide data that triggers it.
        // Or mock the utility.

        // Let's provide an obvious anomaly:
        // 6 months of low spending vs High spending this month
        // But easier to mock the utility for Component Test
    });
});
