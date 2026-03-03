import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatPanel } from './StatPanel';

describe('StatPanel', () => {
  it('renders title and value with unit', () => {
    render(<StatPanel title="CPU" value={25.5} unit="%" />);
    expect(screen.getByText('CPU')).toBeInTheDocument();
    expect(screen.getByText('25.5%')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<StatPanel title="Status" value="ok" />);
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders sparkline when values provided', () => {
    render(
      <StatPanel title="Load" value={1.2} values={[1, 2, 3, 4, 5]} />
    );
    expect(screen.getByTitle('1.0, 2.0, 3.0, 4.0, 5.0')).toBeInTheDocument();
  });

  it('applies threshold warning class when value >= thresholdWarning', () => {
    const { container } = render(
      <StatPanel title="CPU" value={85} thresholdWarning={80} thresholdCritical={95} />
    );
    const valueEl = container.querySelector('.text-yellow-600');
    expect(valueEl).toBeInTheDocument();
  });

  it('applies threshold critical class when value >= thresholdCritical', () => {
    const { container } = render(
      <StatPanel title="CPU" value={96} thresholdWarning={80} thresholdCritical={95} />
    );
    const valueEl = container.querySelector('.text-destructive');
    expect(valueEl).toBeInTheDocument();
  });
});
