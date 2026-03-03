import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('renders dash for empty array', () => {
    render(<Sparkline values={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders spark chars for values', () => {
    render(<Sparkline values={[1, 2, 3, 4, 5]} width={5} />);
    const span = screen.getByTitle('1.0, 2.0, 3.0, 4.0, 5.0');
    expect(span).toBeInTheDocument();
    expect(span.textContent).toMatch(/^[▁▂▃▄▅▆▇█]+$/);
  });

  it('applies className', () => {
    const { container } = render(
      <Sparkline values={[1, 2]} width={2} className="custom" />
    );
    const span = container.querySelector('.custom');
    expect(span).toBeInTheDocument();
  });
});
