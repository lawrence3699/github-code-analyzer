import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

jest.mock('child_process');
jest.mock('os');

import { spawn } from 'child_process';
import { tmpdir } from 'os';

import { callProviderCli, parseProviderJsonResponse } from './call-provider';

const MOCK_TMPDIR = '/tmp/mock-test';

function makeMockProcess(): {
  readonly stdin: { write: jest.Mock; end: jest.Mock };
  readonly stdout: EventEmitter;
  readonly stderr: EventEmitter;
  readonly processEmitter: EventEmitter;
  readonly mock: ChildProcess;
} {
  const stdin = { write: jest.fn(), end: jest.fn() };
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const processEmitter = new EventEmitter();

  const mock = {
    stdin,
    stdout,
    stderr,
    on: processEmitter.on.bind(processEmitter),
  } as unknown as ChildProcess;

  return { stdin, stdout, stderr, processEmitter, mock };
}

describe('callProviderCli', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (tmpdir as jest.Mock).mockReturnValue(MOCK_TMPDIR);
    delete process.env.AI_PROVIDER;
  });

  afterEach(() => {
    delete process.env.AI_PROVIDER;
  });

  it('defaults to claude when AI_PROVIDER is not set', async () => {
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const envelope = JSON.stringify({ type: 'result', result: '{"ok":true}', is_error: false });
    const promise = callProviderCli('test prompt');
    stdout.emit('data', Buffer.from(envelope));
    processEmitter.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p', '--output-format', 'json']),
      expect.any(Object),
    );
  });

  it('uses claude when AI_PROVIDER=claude', async () => {
    process.env.AI_PROVIDER = 'claude';
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const envelope = JSON.stringify({ type: 'result', result: '{"ok":true}', is_error: false });
    const promise = callProviderCli('prompt');
    stdout.emit('data', Buffer.from(envelope));
    processEmitter.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith('claude', expect.any(Array), expect.any(Object));
  });

  it('uses codex when AI_PROVIDER=codex', async () => {
    process.env.AI_PROVIDER = 'codex';
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    // Codex JSONL format
    const jsonl = JSON.stringify({
      type: 'item.completed',
      item: { type: 'agent_message', text: '{"ok":true}' },
    });

    const promise = callProviderCli('prompt');
    stdout.emit('data', Buffer.from(jsonl));
    processEmitter.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith(
      'codex',
      expect.arrayContaining(['exec', '--json', '--skip-git-repo-check', '-']),
      expect.any(Object),
    );
  });

  it('returns extracted text from claude envelope', async () => {
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const innerText = '{"project":"test"}';
    const envelope = JSON.stringify({ type: 'result', result: innerText, is_error: false });
    const promise = callProviderCli('prompt');
    stdout.emit('data', Buffer.from(envelope));
    processEmitter.emit('close', 0);

    const result = await promise;
    expect(result).toBe(innerText);
  });

  it('returns extracted text from codex JSONL', async () => {
    process.env.AI_PROVIDER = 'codex';
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const innerText = '{"project":"test"}';
    const jsonl = JSON.stringify({
      type: 'item.completed',
      item: { type: 'agent_message', text: innerText },
    });

    const promise = callProviderCli('prompt');
    stdout.emit('data', Buffer.from(jsonl));
    processEmitter.emit('close', 0);

    const result = await promise;
    expect(result).toBe(innerText);
  });

  it('rejects when process exits with non-zero code', async () => {
    const { stderr, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const promise = callProviderCli('prompt');
    stderr.emit('data', Buffer.from('error output'));
    processEmitter.emit('close', 1);

    await expect(promise).rejects.toThrow(/exited with code 1/);
  });

  it('deletes CLAUDECODE from env', async () => {
    process.env.CLAUDECODE = 'test';
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const envelope = JSON.stringify({ type: 'result', result: '{}', is_error: false });
    const promise = callProviderCli('prompt');
    stdout.emit('data', Buffer.from(envelope));
    processEmitter.emit('close', 0);
    await promise;

    const spawnEnv = (spawn as jest.Mock).mock.calls[0][2].env as Record<string, string>;
    expect(spawnEnv).not.toHaveProperty('CLAUDECODE');

    delete process.env.CLAUDECODE;
  });

  it('runs from tmpdir', async () => {
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const envelope = JSON.stringify({ type: 'result', result: '{}', is_error: false });
    const promise = callProviderCli('prompt');
    stdout.emit('data', Buffer.from(envelope));
    processEmitter.emit('close', 0);
    await promise;

    expect(spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ cwd: MOCK_TMPDIR }),
    );
  });
});

describe('parseProviderJsonResponse', () => {
  it('parses valid JSON', () => {
    const result = parseProviderJsonResponse<{ ok: boolean }>('{"ok":true}');
    expect(result).toEqual({ ok: true });
  });

  it('strips markdown fences', () => {
    const result = parseProviderJsonResponse<{ ok: boolean }>('```json\n{"ok":true}\n```');
    expect(result).toEqual({ ok: true });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseProviderJsonResponse('not json')).toThrow(/Failed to parse/);
  });
});
