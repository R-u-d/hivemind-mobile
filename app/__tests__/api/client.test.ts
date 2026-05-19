import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { client, extractDrfError } from '@/api/client';
import { tokenStorage } from '@/api/tokenStorage';

jest.mock('@/api/tokenStorage', () => ({
  tokenStorage: {
    getAccess: jest.fn(),
    getRefresh: jest.fn(),
    setTokens: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

const mock = new MockAdapter(client);
const axiosMock = new MockAdapter(axios);

const { router } = jest.requireMock('expo-router') as { router: { replace: jest.Mock } };
const ts = tokenStorage as jest.Mocked<typeof tokenStorage>;

afterAll(() => {
  axiosMock.restore();
});

beforeEach(() => {
  mock.reset();
  axiosMock.reset();
  jest.clearAllMocks();
});

// ── Successful request ────────────────────────────────────────────────────────

it('attaches access token to request', async () => {
  ts.getAccess.mockResolvedValue('access-abc');
  mock.onGet('/ping').reply(200, { ok: true });

  const response = await client.get('/ping');

  expect(response.status).toBe(200);
  expect(mock.history.get[0].headers?.Authorization).toBe('Bearer access-abc');
});

it('sends request without Authorization header when no token stored', async () => {
  ts.getAccess.mockResolvedValue(null);
  mock.onGet('/ping').reply(200, {});

  await client.get('/ping');

  expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
});

// ── 401 → refresh → retry ────────────────────────────────────────────────────

it('retries request with new token after successful refresh', async () => {
  ts.getAccess.mockResolvedValue('expired-access');
  ts.getRefresh.mockResolvedValue('valid-refresh');
  ts.setTokens.mockResolvedValue([undefined, undefined]);

  mock.onGet('/protected').replyOnce(401).onGet('/protected').reply(200, { data: 'ok' });
  axiosMock
    .onPost('http://localhost:8000/api/auth/token/refresh/')
    .reply(200, { access: 'new-access' });

  const response = await client.get('/protected');

  expect(response.status).toBe(200);
  expect(ts.setTokens).toHaveBeenCalledWith('new-access', 'valid-refresh');
  expect(mock.history.get[1].headers?.Authorization).toBe('Bearer new-access');
});

it('saves rotated refresh token when server returns a new one', async () => {
  ts.getAccess.mockResolvedValue('expired-access');
  ts.getRefresh.mockResolvedValue('old-refresh');
  ts.setTokens.mockResolvedValue([undefined, undefined]);

  mock.onGet('/protected').replyOnce(401).onGet('/protected').reply(200, {});
  axiosMock
    .onPost('http://localhost:8000/api/auth/token/refresh/')
    .reply(200, { access: 'new-access', refresh: 'rotated-refresh' });

  await client.get('/protected');

  expect(ts.setTokens).toHaveBeenCalledWith('new-access', 'rotated-refresh');
});

it('clears tokens and redirects to login when no refresh token stored', async () => {
  ts.getAccess.mockResolvedValue('expired-access');
  ts.getRefresh.mockResolvedValue(null);
  ts.clear.mockResolvedValue([undefined, undefined]);

  mock.onGet('/protected').reply(401);

  await expect(client.get('/protected')).rejects.toThrow();

  expect(ts.clear).toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
});

// ── Refresh failure → logout ──────────────────────────────────────────────────

it('clears tokens and redirects to login when refresh fails', async () => {
  ts.getAccess.mockResolvedValue('expired-access');
  ts.getRefresh.mockResolvedValue('expired-refresh');
  ts.clear.mockResolvedValue([undefined, undefined]);

  mock.onGet('/protected').reply(401);
  axiosMock.onPost('http://localhost:8000/api/auth/token/refresh/').reply(401);

  await expect(client.get('/protected')).rejects.toThrow();

  expect(ts.clear).toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
});

it('does not retry a second time if the retried request returns 401', async () => {
  ts.getAccess.mockResolvedValue('expired-access');
  ts.getRefresh.mockResolvedValue('valid-refresh');
  ts.setTokens.mockResolvedValue([undefined, undefined]);
  ts.clear.mockResolvedValue([undefined, undefined]);

  mock.onGet('/protected').reply(401);
  axiosMock
    .onPost('http://localhost:8000/api/auth/token/refresh/')
    .reply(200, { access: 'new-access' });

  await expect(client.get('/protected')).rejects.toThrow();

  expect(mock.history.get.length).toBe(2);
  expect(ts.clear).not.toHaveBeenCalled();
});

it('only calls refresh once for concurrent 401 requests', async () => {
  ts.getAccess.mockResolvedValue('expired-access');
  ts.getRefresh.mockResolvedValue('valid-refresh');
  ts.setTokens.mockResolvedValue([undefined, undefined]);

  mock.onGet('/a').replyOnce(401).onGet('/a').reply(200, {});
  mock.onGet('/b').replyOnce(401).onGet('/b').reply(200, {});
  mock.onGet('/c').replyOnce(401).onGet('/c').reply(200, {});
  axiosMock
    .onPost('http://localhost:8000/api/auth/token/refresh/')
    .reply(200, { access: 'new-access' });

  await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')]);

  expect(axiosMock.history.post.length).toBe(1);
  expect(ts.setTokens).toHaveBeenCalledTimes(1);
});

// ── extractDrfError ───────────────────────────────────────────────────────────

it('extracts detail string from DRF error', () => {
  const error = new axios.AxiosError('', '', undefined, undefined, {
    status: 401,
    data: { detail: 'Authentication credentials were not provided.' },
  } as never);

  expect(extractDrfError(error)).toBe('Authentication credentials were not provided.');
});

it('extracts first field error from DRF error', () => {
  const error = new axios.AxiosError('', '', undefined, undefined, {
    status: 400,
    data: { email: ['This field is required.'] },
  } as never);

  expect(extractDrfError(error)).toBe('This field is required.');
});

it('extracts non_field_errors from DRF error', () => {
  const error = new axios.AxiosError('', '', undefined, undefined, {
    status: 400,
    data: { non_field_errors: ['Unable to log in with provided credentials.'] },
  } as never);

  expect(extractDrfError(error)).toBe('Unable to log in with provided credentials.');
});

it('extracts nested field error from DRF error', () => {
  const error = new axios.AxiosError('', '', undefined, undefined, {
    status: 400,
    data: { profile: { bio: ['Ensure this field has no more than 500 characters.'] } },
  } as never);

  expect(extractDrfError(error)).toBe('Ensure this field has no more than 500 characters.');
});

it('returns fallback message for non-axios errors', () => {
  expect(extractDrfError(new Error('network error'))).toBe(
    'Something went wrong. Please try again.',
  );
});
