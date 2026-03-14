import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

// Mock child_process and os before importing the module under test
jest.mock('child_process');
jest.mock('os');

import { spawn } from 'child_process';
import { tmpdir } from 'os';

import { callClaudeCli, parseClaudeJsonResponse } from './claude-cli';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_TMPDIR = '/tmp/mock-test-dir';

/**
 * Creates a minimal mock ChildProcess-like object with writable stdin and
 * readable stdout/stderr EventEmitters, plus an `on` handler for process
 * lifecycle events ('close', 'error').
 */
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

// ---------------------------------------------------------------------------
// parseClaudeJsonResponse
// ---------------------------------------------------------------------------

describe('parseClaudeJsonResponse', () => {
  it('parses a valid JSON string', () => {
    const input = '{"key": "value", "count": 42}';
    const result = parseClaudeJsonResponse<{ key: string; count: number }>(input);
    expect(result).toEqual({ key: 'value', count: 42 });
  });

  it('strips ```json ... ``` markdown fences before parsing', () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = parseClaudeJsonResponse<{ key: string }>(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('strips plain ``` ... ``` markdown fences before parsing', () => {
    const input = '```\n{"key": "value"}\n```';
    const result = parseClaudeJsonResponse<{ key: string }>(input);
    expect(result).toEqual({ key: 'value' });
  });

  it('throws a descriptive error on invalid JSON', () => {
    expect(() => parseClaudeJsonResponse('not valid json')).toThrow(
      /Failed to parse Claude CLI JSON response/,
    );
  });

  it('throws a descriptive error on empty string', () => {
    expect(() => parseClaudeJsonResponse('')).toThrow(
      /Failed to parse Claude CLI JSON response/,
    );
  });

  it('preserves deeply nested objects', () => {
    const data = { a: { b: { c: [1, 2, 3] } } };
    const result = parseClaudeJsonResponse<typeof data>(JSON.stringify(data));
    expect(result).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// callClaudeCli
// ---------------------------------------------------------------------------

describe('callClaudeCli', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (tmpdir as jest.Mock).mockReturnValue(MOCK_TMPDIR);
  });

  it('spawns claude with the correct arguments and options', async () => {
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const cliEnvelope = JSON.stringify({ type: 'result', result: '{"ok":true}', is_error: false });

    const promise = callClaudeCli('test prompt');

    // Emit data then close
    stdout.emit('data', Buffer.from(cliEnvelope));
    processEmitter.emit('close', 0);

    await promise;

    expect(spawn).toHaveBeenCalledWith(
      'claude',
      ['-p', '--model', 'claude-haiku-4-5-20251001', '--output-format', 'json'],
      expect.objectContaining({
        timeout: 120_000,
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: MOCK_TMPDIR,
      }),
    );
  });

  it('deletes CLAUDECODE from the spawned environment', async () => {
    const originalEnv = process.env.CLAUDECODE;
    process.env.CLAUDECODE = 'some-value';

    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const cliEnvelope = JSON.stringify({ type: 'result', result: '{"ok":true}', is_error: false });
    const promise = callClaudeCli('prompt');
    stdout.emit('data', Buffer.from(cliEnvelope));
    processEmitter.emit('close', 0);
    await promise;

    const spawnCallEnv = (spawn as jest.Mock).mock.calls[0][2].env as Record<string, string>;
    expect(spawnCallEnv).not.toHaveProperty('CLAUDECODE');

    // Restore
    if (originalEnv === undefined) {
      delete process.env.CLAUDECODE;
    } else {
      process.env.CLAUDECODE = originalEnv;
    }
  });

  it('writes the prompt to stdin and ends the stream', async () => {
    const { stdin, stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const cliEnvelope = JSON.stringify({ type: 'result', result: '{"ok":true}', is_error: false });
    const promise = callClaudeCli('hello world prompt');
    stdout.emit('data', Buffer.from(cliEnvelope));
    processEmitter.emit('close', 0);
    await promise;

    expect(stdin.write).toHaveBeenCalledWith('hello world prompt');
    expect(stdin.end).toHaveBeenCalled();
  });

  it('resolves with the extracted .result string on success', async () => {
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const innerText = '{"project_name":"test"}';
    const cliEnvelope = JSON.stringify({ type: 'result', result: innerText, is_error: false });

    const promise = callClaudeCli('prompt');
    stdout.emit('data', Buffer.from(cliEnvelope));
    processEmitter.emit('close', 0);

    const result = await promise;
    expect(result).toBe(innerText);
  });

  it('strips markdown fences from the .result string', async () => {
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const innerText = '```json\n{"project_name":"test"}\n```';
    const cliEnvelope = JSON.stringify({ type: 'result', result: innerText, is_error: false });

    const promise = callClaudeCli('prompt');
    stdout.emit('data', Buffer.from(cliEnvelope));
    processEmitter.emit('close', 0);

    const result = await promise;
    expect(result).toBe('{"project_name":"test"}');
  });

  it('rejects when the process exits with a non-zero exit code', async () => {
    const { stderr, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const promise = callClaudeCli('prompt');
    stderr.emit('data', Buffer.from('some error output'));
    processEmitter.emit('close', 1);

    await expect(promise).rejects.toThrow(/Claude CLI exited with code 1/);
  });

  it('rejects when is_error is true in the CLI envelope', async () => {
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const cliEnvelope = JSON.stringify({
      type: 'result',
      result: 'Something went wrong',
      is_error: true,
    });

    const promise = callClaudeCli('prompt');
    stdout.emit('data', Buffer.from(cliEnvelope));
    processEmitter.emit('close', 0);

    await expect(promise).rejects.toThrow(/Claude CLI returned an error/);
  });

  it('rejects when the process emits an error event', async () => {
    const { processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const promise = callClaudeCli('prompt');
    processEmitter.emit('error', new Error('ENOENT: claude not found'));

    await expect(promise).rejects.toThrow(/Failed to start Claude CLI/);
  });

  it('falls through to raw text when stdout is not a CLI envelope JSON', async () => {
    // If stdout is plain text (not a JSON envelope), the function should return
    // the trimmed raw text rather than throwing.
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const plainText = '{"direct":"json"}';

    const promise = callClaudeCli('prompt');
    stdout.emit('data', Buffer.from(plainText));
    processEmitter.emit('close', 0);

    const result = await promise;
    expect(result).toBe(plainText);
  });

  it('accumulates multiple data chunks from stdout', async () => {
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const innerText = '{"streamed":true}';
    const fullEnvelope = JSON.stringify({ type: 'result', result: innerText, is_error: false });
    // Split the envelope across two chunks to simulate streaming
    const half = Math.floor(fullEnvelope.length / 2);
    const chunk1 = fullEnvelope.slice(0, half);
    const chunk2 = fullEnvelope.slice(half);

    const promise = callClaudeCli('prompt');
    stdout.emit('data', Buffer.from(chunk1));
    stdout.emit('data', Buffer.from(chunk2));
    processEmitter.emit('close', 0);

    const result = await promise;
    expect(result).toBe(innerText);
  });

  it('includes stdout in the error message when stderr is empty', async () => {
    // Covers the `stderr || stdout || 'Unknown error'` branch where stderr is empty
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const promise = callClaudeCli('prompt');
    stdout.emit('data', Buffer.from('some stdout text'));
    processEmitter.emit('close', 2);

    await expect(promise).rejects.toThrow('some stdout text');
  });

  it('uses "Unknown error" fallback when both stdout and stderr are empty', async () => {
    const { processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const promise = callClaudeCli('prompt');
    processEmitter.emit('close', 127);

    await expect(promise).rejects.toThrow('Unknown error');
  });

  it('handles a CLI envelope where type is not "result" (falls through to raw text)', async () => {
    // Covers the branch where envelope.type !== 'result' inside extractResultFromCliOutput
    const { stdout, processEmitter, mock } = makeMockProcess();
    (spawn as jest.Mock).mockReturnValue(mock);

    const nonResultEnvelope = JSON.stringify({ type: 'progress', message: 'working...' });

    const promise = callClaudeCli('prompt');
    stdout.emit('data', Buffer.from(nonResultEnvelope));
    processEmitter.emit('close', 0);

    // Falls through: returns the raw trimmed stdout
    const result = await promise;
    expect(result).toBe(nonResultEnvelope);
  });
});
