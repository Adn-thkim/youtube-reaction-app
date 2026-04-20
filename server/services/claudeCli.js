import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function resolveClaudeCommand() {
  const candidates = [
    process.env.CLAUDE_CLI_COMMAND,
    `${process.env.HOME || ''}/.local/bin/claude`,
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || 'claude';
}

function normalizeJsonText(rawText) {
  const trimmed = rawText.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Claude CLI 응답에서 JSON을 찾지 못했습니다.');
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

export async function runClaudeJsonPrompt(prompt) {
  const command = resolveClaudeCommand();
  const timeout = Number(process.env.CLAUDE_CLI_TIMEOUT_MS || 180000);

  try {
    const { stdout, stderr } = await execFileAsync(command, ['-p', prompt], {
      timeout,
      maxBuffer: 1024 * 1024 * 8,
      env: process.env,
    });

    if (stderr?.trim()) {
      console.warn(`[claude-cli] stderr: ${stderr.trim()}`);
    }

    return JSON.parse(normalizeJsonText(stdout));
  } catch (error) {
    const stderrText = error.stderr?.toString?.() || '';
    const stdoutText = error.stdout?.toString?.() || '';
    const combinedText = `${stdoutText}\n${stderrText}`;

    if (error.code === 'ENOENT') {
      const cliError = new Error(
        '로컬에서 Claude CLI를 찾을 수 없습니다. Claude Code CLI를 설치하고 로그인한 뒤 다시 시도해 주세요.'
      );
      cliError.statusCode = 503;
      cliError.code = 'CLAUDE_CLI_NOT_FOUND';
      throw cliError;
    }

    if (error.killed || error.signal === 'SIGTERM') {
      const timeoutError = new Error('Claude CLI 응답 시간이 초과되었습니다.');
      timeoutError.statusCode = 504;
      timeoutError.code = 'CLAUDE_CLI_TIMEOUT';
      throw timeoutError;
    }

    if (/Not logged in|Please run \/login/i.test(combinedText)) {
      const loginError = new Error(
        'Claude CLI는 설치되어 있지만 로그인되어 있지 않습니다. 터미널에서 `claude /login` 또는 `claude login`을 먼저 실행해 주세요.'
      );
      loginError.statusCode = 503;
      loginError.code = 'CLAUDE_CLI_NOT_LOGGED_IN';
      throw loginError;
    }

    const execError = new Error(error.message || 'Claude CLI 실행 중 오류가 발생했습니다.');
    execError.statusCode = 502;
    execError.code = 'CLAUDE_CLI_EXEC_ERROR';
    throw execError;
  }
}
