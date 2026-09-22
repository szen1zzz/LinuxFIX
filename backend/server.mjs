import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { join } from 'node:path';

const port = Number(process.env.PORT ?? 8787);
const ollamaUrl = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
const model = process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
const dataDirectory = join(import.meta.dirname, 'data');
const usersFile = join(dataDirectory, 'users.json');
const sessionsFile = join(dataDirectory, 'sessions.json');
const historyFile = join(dataDirectory, 'history.json');
const sourcesFile = join(import.meta.dirname, 'sources.json');
const scrypt = promisify(scryptCallback);
const passwordKeyLength = 64;
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;
const historyRetentionMs = 7 * 24 * 60 * 60 * 1000;
const analysisWindowMs = 5 * 60 * 1000;
const analysisLimit = 12;
const authenticationWindowMs = 15 * 60 * 1000;
const loginLimit = 8;
const registrationWindowMs = 60 * 60 * 1000;
const registrationLimit = 4;
const maxConcurrentAnalyses = 2;
const maxRateLimitEntries = 10_000;
const maxRequestBytes = 100_000;
const ollamaHealthTimeoutMs = 3_500;
let dataWriteQueue = Promise.resolve();
let dataMutationQueue = Promise.resolve();
const analysisWindows = new Map();
const authenticationWindows = new Map();
let activeAnalyses = 0;
const sourceRegistry = JSON.parse(await readFile(sourcesFile, 'utf8'));

const responseHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const systemPrompt = `Jesteś LinuxFIX, ostrożnym asystentem do diagnozowania i obsługi Linuksa.
Użytkownik może wkleić błąd lub log albo zadać pytanie, jak wykonać zadanie w wybranej dystrybucji.
Najpierw rozpoznaj, czy wejście jest problemem diagnostycznym, czy pytaniem instruktażowym.
Dla błędu podaj prawdopodobną przyczynę i bezpieczne kroki diagnostyczne. Nie twórz faktów, których nie ma w logu.
Dla pytania odpowiedz bezpośrednio, a w polu cause umieść krótkie wyjaśnienie celu lub istotnego kontekstu. Nie wymyślaj awarii ani przyczyny błędu.
Jeśli pytanie nie dotyczy Linuksa, krótko wyjaśnij zakres LinuxFIX i nie zgaduj.
Jeśli nie masz pewności, napisz to.
Nie masz dostępu do internetu ani forum. Nie udawaj wyszukiwania.
Używaj wyłącznie źródeł przekazanych w kontekście dla wybranej dystrybucji. Nie wymyślaj źródeł, tytułów stron ani adresów URL. Jeśli nie podano źródeł, zwróć pustą tablicę sources.
Nie podawaj poleceń ani nazw narzędzi z innej dystrybucji. Dla Arch używaj wyłącznie poleceń Arch (np. pacman), a dla Debian używaj wyłącznie poleceń Debian (np. apt); jeśli nie wiesz, napisz to zamiast zgadywać.
Nie zmieniaj znaczenia błędu. Dla "target not found" rozważ brak pakietu lub błędną nazwę, a nie awarię aplikacji.
Nie proponuj automatycznie rm, mkfs, zmian bootloadera, chmod 777 ani innych destrukcyjnych poleceń.
Komendy wymagające sudo oznacz jako medium lub high risk.
Jeśli krok nie wymaga komendy, ustaw command na pusty ciąg znaków.
Zwróć wyłącznie poprawny JSON bez markdownu w formacie:
{
  "title": "krótka nazwa problemu albo zadania",
  "cause": "prawdopodobna przyczyna albo bezpośrednia odpowiedź na pytanie",
  "confidence": 0.0,
  "steps": [
    { "description": "co sprawdzić", "command": "komenda", "risk": "low|medium|high" }
  ],
  "sources": [
    { "title": "źródło lub informacja, czego szukać", "url": "https://..." }
  ]
}`;

function sendJson(response, status, body, extraHeaders = {}) {
  response.writeHead(status, { ...responseHeaders, ...extraHeaders });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bodyBytes = 0;
    request.on('data', (chunk) => {
      bodyBytes += Buffer.byteLength(chunk);
      if (bodyBytes > maxRequestBytes) {
        reject(new Error('Log jest za długi (maksymalnie 100 KB).'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

async function readJsonBody(request) {
  const body = await readBody(request);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Żądanie musi zawierać poprawny JSON.');
  }
}

async function readData(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

function writeData(file, value) {
  dataWriteQueue = dataWriteQueue.then(async () => {
    const temporaryFile = `${file}.${process.pid}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await rename(temporaryFile, file);
  });
  return dataWriteQueue;
}

async function initializeData() {
  await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  for (const [file, fallback] of [[usersFile, []], [sessionsFile, []], [historyFile, {}]]) {
    try {
      await readFile(file);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await writeData(file, fallback);
    }
  }

  // Sessions created before 0.2.2 contained raw bearer tokens. Revoke them on
  // startup so a copied data file cannot be used to impersonate a user.
  const sessions = await readData(sessionsFile, []);
  const safeSessions = Array.isArray(sessions)
    ? sessions.filter((session) => (
      session && typeof session === 'object'
      && typeof session.tokenHash === 'string' && /^[a-f0-9]{64}$/.test(session.tokenHash)
      && typeof session.userId === 'string'
      && typeof session.createdAt === 'string' && Number.isFinite(Date.parse(session.createdAt))
    ))
    : [];
  if (!Array.isArray(sessions) || safeSessions.length !== sessions.length) {
    await writeData(sessionsFile, safeSessions);
  }
}

function withDataLock(task) {
  const job = dataMutationQueue.then(task);
  dataMutationQueue = job.catch(() => undefined);
  return job;
}

function validateCredentials(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Żądanie musi zawierać obiekt JSON.');
  }
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Podaj poprawny adres e-mail.');
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error('Hasło musi mieć od 8 do 128 znaków.');
  }
  return { email, password };
}

async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const derivedKey = await scrypt(password, salt, passwordKeyLength);
  return { salt, hash: Buffer.from(derivedKey).toString('hex') };
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function hashesEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length
    || !/^[a-f0-9]+$/.test(left) || !/^[a-f0-9]+$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function bearerToken(request) {
  const header = request.headers.authorization;
  return typeof header === 'string' && /^Bearer [A-Za-z0-9_-]{40,}$/.test(header)
    ? header.slice(7)
    : null;
}

async function authenticate(request) {
  const token = bearerToken(request);
  if (!token) return null;
  const sessions = await readData(sessionsFile, []);
  const session = Array.isArray(sessions)
    ? sessions.find((item) => hashesEqual(item?.tokenHash, tokenHash(token)))
    : null;
  if (!session || !Number.isFinite(Date.parse(session.createdAt)) || Date.now() - Date.parse(session.createdAt) > sessionTtlMs) return null;
  const users = await readData(usersFile, []);
  return users.find((user) => user.id === session.userId) ?? null;
}

async function revokeSession(request) {
  const token = bearerToken(request);
  if (!token) return false;
  const requestedTokenHash = tokenHash(token);
  return withDataLock(async () => {
    const sessions = await readData(sessionsFile, []);
    if (!Array.isArray(sessions)) return false;
    const remaining = sessions.filter((session) => !hashesEqual(session?.tokenHash, requestedTokenHash));
    if (remaining.length === sessions.length) return false;
    await writeData(sessionsFile, remaining);
    return true;
  });
}

function validHistory(messages) {
  if (!Array.isArray(messages) || messages.length > 500) return false;
  return messages.every((message) => (
    message && typeof message === 'object' && !Array.isArray(message)
    && (message.role === 'user' || message.role === 'assistant')
    && typeof message.content === 'string' && message.content.length <= 20_000
    && (message.createdAt === undefined || (typeof message.createdAt === 'string' && Number.isFinite(Date.parse(message.createdAt))))
  ));
}

function normalizeHistory(messages, fallbackTimestamp = null) {
  const now = new Date().toISOString();
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    createdAt: typeof message.createdAt === 'string' && Number.isFinite(Date.parse(message.createdAt))
      ? message.createdAt
      : (fallbackTimestamp ?? now),
  }));
}

function retainedHistory(saved) {
  const messages = Array.isArray(saved) ? saved : (saved?.messages ?? []);
  const fallbackTimestamp = !Array.isArray(saved) && typeof saved?.updatedAt === 'string' && Number.isFinite(Date.parse(saved.updatedAt))
    ? saved.updatedAt
    : null;
  if (!Array.isArray(messages)) return [];
  const cutoff = Date.now() - historyRetentionMs;
  return normalizeHistory(messages, fallbackTimestamp).filter((message) => Date.parse(message.createdAt) >= cutoff);
}

async function pruneExpiredHistories() {
  return withDataLock(async () => {
    const histories = await readData(historyFile, {});
    const retained = {};
    for (const [userId, saved] of Object.entries(histories)) {
      const messages = retainedHistory(saved);
      if (messages.length > 0) {
        retained[userId] = { messages, updatedAt: new Date().toISOString() };
      }
    }
    await writeData(historyFile, retained);
  });
}

async function deleteAccountData(request) {
  const user = await authenticate(request);
  if (!user) return false;
  await withDataLock(async () => {
    const users = await readData(usersFile, []);
    const sessions = await readData(sessionsFile, []);
    const histories = await readData(historyFile, {});
    const safeUsers = Array.isArray(users) ? users : [];
    const safeHistories = histories && typeof histories === 'object' && !Array.isArray(histories) ? histories : {};
    const { [user.id]: removedHistory, ...remainingHistories } = safeHistories;
    void removedHistory;
    await writeData(usersFile, safeUsers.filter((candidate) => candidate.id !== user.id));
    await writeData(sessionsFile, (Array.isArray(sessions) ? sessions : []).filter((session) => session.userId !== user.id));
    await writeData(historyFile, remainingHistories);
  });
  return true;
}

function parseModelJson(text) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Model nie zwrócił poprawnego JSON.');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validateAnalysis(result, language = 'pl') {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Model zwrócił nieprawidłową strukturę odpowiedzi.');
  }
  if (typeof result.title !== 'string' || !result.title.trim() || result.title.length > 200) {
    throw new Error('Model zwrócił nieprawidłowy tytuł.');
  }
  const explanation = [result.cause, result.answer, result.explanation, result.summary]
    .find((value) => typeof value === 'string' && value.trim());
  if (typeof explanation === 'string' && explanation.length > 4000) {
    throw new Error('Model zwrócił zbyt długi opis.');
  }
  if (typeof result.confidence !== 'number' || !Number.isFinite(result.confidence)) {
    throw new Error('Model zwrócił nieprawidłowy poziom pewności.');
  }
  if (!Array.isArray(result.steps) || result.steps.length > 12) {
    throw new Error('Model zwrócił nieprawidłową listę kroków.');
  }
  const steps = result.steps.map((step) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)
      || typeof step.description !== 'string' || step.description.length > 2000
      || typeof step.command !== 'string' || step.command.length > 2000
      || !['low', 'medium', 'high'].includes(step.risk)) {
      throw new Error('Model zwrócił nieprawidłowy krok diagnostyczny.');
    }
    return { description: step.description.trim(), command: step.command.trim(), risk: step.risk };
  });
  return {
    title: result.title.trim(),
    cause: typeof explanation === 'string'
      ? explanation.trim()
      : (language === 'en' ? 'Follow the recommended steps below.' : 'Wykonaj poniższe zalecane kroki.'),
    confidence: Math.max(0, Math.min(1, result.confidence)),
    steps,
    sources: Array.isArray(result.sources) ? result.sources : [],
  };
}

async function register(payload) {
  const { email, password } = validateCredentials(payload);
  const user = await withDataLock(async () => {
    const users = await readData(usersFile, []);
    if (users.some((candidate) => candidate.email === email)) return null;
    const { salt, hash } = await hashPassword(password);
    const createdUser = { id: randomBytes(16).toString('hex'), email, passwordSalt: salt, passwordHash: hash, createdAt: new Date().toISOString() };
    await writeData(usersFile, [...users, createdUser]);
    return createdUser;
  });
  if (!user) {
    return { status: 409, body: { error: 'Konto z tym adresem już istnieje.' } };
  }
  return createSession(user);
}

async function login(payload) {
  const { email, password } = validateCredentials(payload);
  const users = await readData(usersFile, []);
  const user = users.find((candidate) => candidate.email === email);
  if (!user) return { status: 401, body: { error: 'Nieprawidłowy e-mail lub hasło.' } };
  const { hash } = await hashPassword(password, user.passwordSalt);
  const matches = hashesEqual(hash, user.passwordHash);
  if (!matches) return { status: 401, body: { error: 'Nieprawidłowy e-mail lub hasło.' } };
  return createSession(user);
}

async function createSession(user) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  await withDataLock(async () => {
    const sessions = await readData(sessionsFile, []);
    const activeSessions = (Array.isArray(sessions) ? sessions : [])
      .filter((session) => Number.isFinite(Date.parse(session.createdAt)) && now.getTime() - Date.parse(session.createdAt) <= sessionTtlMs)
      .filter((session) => session.userId !== user.id)
      .slice(-999);
    await writeData(sessionsFile, [...activeSessions, { tokenHash: tokenHash(token), userId: user.id, createdAt: now.toISOString() }]);
  });
  return { status: 200, body: { token, expiresAt: new Date(now.getTime() + sessionTtlMs).toISOString(), user: { id: user.id, email: user.email } } };
}

function publicError(error, fallback = 'Nie udało się przetworzyć żądania.') {
  const message = error instanceof Error ? error.message : '';
  const safeMessages = new Set([
    'Żądanie musi zawierać obiekt JSON.',
    'Podaj poprawny adres e-mail.',
    'Hasło musi mieć od 8 do 128 znaków.',
    'Żądanie musi zawierać poprawny JSON.',
    'Log jest za długi (maksymalnie 100 KB).',
  ]);
  return safeMessages.has(message) ? message : fallback;
}

function sourcesForDistro(distro) {
  const key = typeof distro === 'string' ? distro.trim().toLowerCase() : '';
  return { key, sources: Array.isArray(sourceRegistry[key]) ? sourceRegistry[key] : [] };
}

function clientKey(request) {
  const forwarded = request.headers['cf-connecting-ip'] ?? request.headers['x-forwarded-for'];
  return Array.isArray(forwarded) ? forwarded[0] : String(forwarded ?? request.socket.remoteAddress ?? 'unknown').split(',')[0].trim();
}

function pruneRateLimitBucket(bucket, now, windowMs) {
  for (const [key, value] of bucket) {
    if (now - value.startedAt >= windowMs) bucket.delete(key);
  }
}

function allowRequest(bucket, key, windowMs, limit) {
  const now = Date.now();
  if (bucket.size >= maxRateLimitEntries && !bucket.has(key)) {
    pruneRateLimitBucket(bucket, now, windowMs);
    if (bucket.size >= maxRateLimitEntries) bucket.delete(bucket.keys().next().value);
  }
  const current = bucket.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    bucket.set(key, { count: 1, startedAt: now });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function allowAnalysis(request) {
  return allowRequest(analysisWindows, clientKey(request), analysisWindowMs, analysisLimit);
}

function allowAuthentication(request, operation) {
  const isRegistration = operation === 'register';
  return allowRequest(
    authenticationWindows,
    `${operation}:${clientKey(request)}`,
    isRegistration ? registrationWindowMs : authenticationWindowMs,
    isRegistration ? registrationLimit : loginLimit,
  );
}

async function ollamaReady() {
  try {
    const response = await fetch(`${ollamaUrl.replace(/\/+$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(ollamaHealthTimeoutMs),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return Array.isArray(payload?.models) && payload.models.some((item) => item?.name === model || item?.model === model);
  } catch {
    return false;
  }
}

function restrictSources(result, sources) {
  const allowed = new Map(sources.map((source) => [source.url, source]));
  const modelSources = Array.isArray(result?.sources) ? result.sources : [];
  return {
    ...result,
    sources: modelSources
      .filter((source) => source && allowed.has(source.url))
      .map((source) => {
        const curated = allowed.get(source.url);
        return { title: curated.title, url: curated.url };
      }),
  };
}

async function analyze(log, distro, language) {
  const { key, sources } = sourcesForDistro(distro);
  const responseLanguage = language === 'en' ? 'English' : 'Polish';
  const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model,
      prompt: `${systemPrompt}\n\nJęzyk odpowiedzi: ${responseLanguage}. Wszystkie pola tekstowe odpowiedzi, poza komendami i adresami URL, muszą być napisane wyłącznie w tym języku.\n\nDystrybucja: ${key || 'nieznana'}\n\nDozwolony kontekst źródeł dla tej dystrybucji (używaj tylko tych źródeł):\n${JSON.stringify(sources)}\n\nTreść użytkownika:\n${log}`,
      stream: false,
      format: 'json',
      keep_alive: '30m',
      options: { temperature: 0.1, num_ctx: 4096, num_predict: 800 },
    }),
  });

  if (!ollamaResponse.ok) {
    throw new Error(`Ollama zwróciła HTTP ${ollamaResponse.status}.`);
  }

  const data = await ollamaResponse.json();
  return restrictSources(validateAnalysis(parseModelJson(data.response ?? ''), language), sources);
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, responseHeaders);
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    const modelReady = await ollamaReady();
    sendJson(response, modelReady ? 200 : 503, {
      ok: modelReady,
      model,
      error: modelReady ? undefined : 'Model AI jest obecnie niedostępny.',
    });
    return;
  }

  if (request.method === 'GET' && request.url === '/') {
    sendJson(response, 200, {
      name: 'LinuxFIX backend',
      ok: true,
      endpoints: {
        health: 'GET /health',
        analyze: 'POST /analyze',
        register: 'POST /auth/register',
        login: 'POST /auth/login',
        logout: 'POST /auth/logout',
        history: 'GET/POST /history',
        deleteAccount: 'DELETE /account',
      },
      message: 'Backend działa. Użyj /health albo wyślij JSON do /analyze.',
    });
    return;
  }

  if (request.method === 'POST' && (request.url === '/auth/register' || request.url === '/auth/login')) {
    const operation = request.url.endsWith('/register') ? 'register' : 'login';
    if (!allowAuthentication(request, operation)) {
      sendJson(
        response,
        429,
        { error: 'Za dużo prób. Spróbuj ponownie później.' },
        { 'Retry-After': String(operation === 'register' ? 3600 : 900) },
      );
      return;
    }
    try {
      const result = operation === 'register'
        ? await register(await readJsonBody(request))
        : await login(await readJsonBody(request));
      sendJson(response, result.status, result.body);
    } catch (error) {
      sendJson(response, 400, { error: publicError(error, 'Nie udało się przetworzyć logowania.') });
    }
    return;
  }

  if (request.method === 'POST' && request.url === '/auth/logout') {
    const revoked = await revokeSession(request);
    sendJson(response, revoked ? 200 : 401, { ok: revoked });
    return;
  }

  if (request.method === 'DELETE' && request.url === '/account') {
    try {
      const deleted = await deleteAccountData(request);
      sendJson(response, deleted ? 200 : 401, deleted ? { ok: true } : { error: 'Wymagany jest poprawny token Bearer.' });
    } catch (error) {
      sendJson(response, 500, { error: publicError(error, 'Nie udało się usunąć konta.') });
    }
    return;
  }

  if (request.url === '/history' && (request.method === 'GET' || request.method === 'POST')) {
    const user = await authenticate(request);
    if (!user) {
      sendJson(response, 401, { error: 'Wymagany jest poprawny token Bearer.' });
      return;
    }
    try {
      if (request.method === 'GET') {
        const messages = await withDataLock(async () => {
          const histories = await readData(historyFile, {});
          const safeHistories = histories && typeof histories === 'object' && !Array.isArray(histories) ? histories : {};
          const saved = safeHistories[user.id];
          const retainedMessages = retainedHistory(saved);
          if (saved && retainedMessages.length === 0) {
            const { [user.id]: expiredHistory, ...remainingHistories } = safeHistories;
            void expiredHistory;
            await writeData(historyFile, remainingHistories);
          } else if (saved) {
            await writeData(historyFile, { ...safeHistories, [user.id]: { messages: retainedMessages, updatedAt: new Date().toISOString() } });
          }
          return retainedMessages;
        });
        sendJson(response, 200, {
          history: messages,
          messages,
          retentionDays: 7,
        });
        return;
      }
      const payload = await readJsonBody(request);
      const messages = payload?.messages ?? payload?.history;
      if (!validHistory(messages)) {
        sendJson(response, 400, { error: 'Pole messages musi być tablicą poprawnych wiadomości (maksymalnie 500).' });
        return;
      }
      const updatedAt = new Date().toISOString();
      const normalizedMessages = normalizeHistory(messages).filter((message) => Date.parse(message.createdAt) >= Date.now() - historyRetentionMs);
      await withDataLock(async () => {
        const histories = await readData(historyFile, {});
        const safeHistories = histories && typeof histories === 'object' && !Array.isArray(histories) ? histories : {};
        await writeData(historyFile, { ...safeHistories, [user.id]: { messages: normalizedMessages, updatedAt } });
      });
      sendJson(response, 200, { history: normalizedMessages, updatedAt, retentionDays: 7 });
    } catch (error) {
      sendJson(response, 400, { error: publicError(error, 'Nie udało się zapisać historii.') });
    }
    return;
  }

  if (request.method !== 'POST' || request.url !== '/analyze') {
    sendJson(response, 404, { error: 'Nie znaleziono endpointu.' });
    return;
  }

  try {
    if (!allowAnalysis(request)) {
      sendJson(response, 429, { error: 'Za dużo analiz. Spróbuj ponownie za kilka minut.' }, { 'Retry-After': '300' });
      return;
    }
    const payload = await readJsonBody(request);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      sendJson(response, 400, { error: 'Żądanie musi zawierać obiekt JSON.' });
      return;
    }
    const log = typeof payload.log === 'string' ? payload.log.trim() : '';
    const distro = typeof payload.distro === 'string' ? payload.distro : 'arch';
    const language = payload.language === 'en' ? 'en' : 'pl';

    if (!log) {
      sendJson(response, 400, { error: 'Pole log jest wymagane.' });
      return;
    }

    if (distro !== 'arch' && distro !== 'debian') {
      sendJson(response, 400, { error: 'Obsługiwane dystrybucje to arch i debian.' });
      return;
    }

    if (activeAnalyses >= maxConcurrentAnalyses) {
      sendJson(response, 503, { error: 'AI obsługuje już inne zapytania. Spróbuj ponownie za chwilę.' }, { 'Retry-After': '10' });
      return;
    }

    activeAnalyses += 1;
    try {
      sendJson(response, 200, await analyze(log, distro, language));
    } finally {
      activeAnalyses -= 1;
    }
  } catch (error) {
    sendJson(response, 502, { error: 'Nie udało się uzyskać odpowiedzi AI. Spróbuj ponownie później.' });
  }
});

await initializeData();
await pruneExpiredHistories();
const historyCleanupTimer = setInterval(() => {
  void pruneExpiredHistories().catch((error) => console.error('Nie udało się usunąć wygasłej historii:', error));
  pruneRateLimitBucket(analysisWindows, Date.now(), analysisWindowMs);
  pruneRateLimitBucket(authenticationWindows, Date.now(), registrationWindowMs);
}, 60 * 60 * 1000);
historyCleanupTimer.unref();
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
  console.log(`LinuxFIX backend działa na http://${host}:${port}`);
  console.log(`Model Ollama: ${model}`);
});
