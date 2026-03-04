import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProcessTable } from './ProcessTable';

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}));

const { api } = await import('@/lib/api');

const mockProcs = [
  {
    ts: '2025-03-03T12:00:00.000Z',
    pid: 100,
    name: 'node',
    cmd: 'node server.js',
    cpu_pct: 5.2,
    rss_mb: 50,
    io_read_bps: 1000,
    io_write_bps: 500,
    state: 'R',
  },
  {
    ts: '2025-03-03T12:00:00.000Z',
    pid: 200,
    name: 'bash',
    cmd: null,
    cpu_pct: 0.1,
    rss_mb: 2,
    io_read_bps: null,
    io_write_bps: null,
    state: 'S',
  },
];

function renderWithProvider(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe('ProcessTable', () => {
  beforeEach(() => {
    vi.mocked(api).mockResolvedValue(mockProcs);
  });

  it('renders processes with mock data', async () => {
    renderWithProvider(<ProcessTable hostId="host-1" />);
    await screen.findByText('node');
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('node')).toBeInTheDocument();
    expect(screen.getByText('node server.js')).toBeInTheDocument();
    expect(screen.getByText('5.2')).toBeInTheDocument();
    expect(screen.getByText('50.0')).toBeInTheDocument();
    expect(screen.getByText('1.0K')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(screen.getByText('bash')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('shows empty state when no processes', async () => {
    vi.mocked(api).mockResolvedValue([]);
    renderWithProvider(<ProcessTable hostId="host-1" />);
    await screen.findByText(/No process data/);
    expect(screen.getByText(/Agent sends processes every/)).toBeInTheDocument();
  });

  it('filters by name when filter input is used', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProcessTable hostId="host-1" />);
    await screen.findByText('node');
    const filterInput = screen.getByPlaceholderText('Filter by PID or name...');
    await user.type(filterInput, 'node');
    expect(screen.getByText('node')).toBeInTheDocument();
    expect(screen.queryByText('bash')).not.toBeInTheDocument();
  });

  it('filters by PID', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ProcessTable hostId="host-1" />);
    await screen.findByText('node');
    const filterInput = screen.getByPlaceholderText('Filter by PID or name...');
    await user.type(filterInput, '100');
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.queryByText('200')).not.toBeInTheDocument();
  });

  it('displays — for null IO values', async () => {
    renderWithProvider(<ProcessTable hostId="host-1" />);
    await screen.findByText('bash');
    const rows = screen.getAllByRole('row');
    const bashRow = rows.find((r) => within(r).queryByText('bash'));
    expect(bashRow).toBeDefined();
    expect(within(bashRow!).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });
});
