import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import * as client from './api/client';

vi.mock('./api/client', () => ({
  checkHealth: vi.fn().mockResolvedValue(true),
  fetchModels: vi.fn().mockResolvedValue([{ id: 'glm-5.2' }]),
  streamChatCompletion: vi.fn(),
}));

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders chat page by default', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: 'GLM 5.2 Chat' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message the model...')).toBeInTheDocument();
  });

  it('navigates to settings', async () => {
    const user = userEvent.setup();
    renderApp();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });

    await user.click(within(nav).getByRole('link', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Generation')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(empty = use dev proxy)')).toBeInTheDocument();
  });

  it('shows server online status', async () => {
    renderApp();
    expect(await screen.findByText('Online', { selector: '.status--online' })).toBeInTheDocument();
    expect(client.checkHealth).toHaveBeenCalled();
  });
});
