import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getBlogDates } from '../src/utils/git-dates.ts';

test('keeps explicit publication dates when files share a Git commit date', (context) => {
  const originalCwd = process.cwd();
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-date-test-'));

  context.after(() => {
    process.chdir(originalCwd);
    fs.rmSync(repository, { recursive: true, force: true });
  });

  for (const slug of ['older', 'newer']) {
    const directory = path.join(repository, 'src/content/blog', slug);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'index.md'), `# ${slug}\n`);
  }

  execFileSync('git', ['init', '-q'], { cwd: repository });
  execFileSync('git', ['config', 'user.name', 'Date Test'], { cwd: repository });
  execFileSync('git', ['config', 'user.email', 'date-test@example.com'], {
    cwd: repository,
  });
  execFileSync('git', ['add', '.'], { cwd: repository });
  execFileSync('git', ['commit', '-q', '-m', 'snapshot'], {
    cwd: repository,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: '2026-07-11T12:00:00+08:00',
      GIT_COMMITTER_DATE: '2026-07-11T12:00:00+08:00',
    },
  });

  process.chdir(repository);

  const olderDate = new Date('2025-01-01T09:00:00+08:00');
  const newerDate = new Date('2025-02-01T09:00:00+08:00');

  assert.equal(
    getBlogDates('older', olderDate).date.toISOString(),
    olderDate.toISOString()
  );
  assert.equal(
    getBlogDates('newer', newerDate).date.toISOString(),
    newerDate.toISOString()
  );
});
