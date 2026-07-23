import { afterEach, describe, expect, it, vi } from 'vitest';
import { POMODORO_API_BASE, startFocus } from './api';

describe('Pomodoro API', () => {
  afterEach(() => vi.restoreAllMocks());

  it('usa el servidor local y no el origen de Vite/Tauri', async () => {
    const response = {
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'focus' }),
    } as unknown as Response;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);

    await startFocus();

    expect(POMODORO_API_BASE).toBe('http://localhost:3001/api/pomodoro');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3001/api/pomodoro/start',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
