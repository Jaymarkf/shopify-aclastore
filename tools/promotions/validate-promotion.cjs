const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const validator = path.join(process.env.USERPROFILE, '.agents/skills/shopify/scripts/validate.mjs');
for (const file of fs.readdirSync(__dirname).filter(name => name.endsWith('.graphql'))) {
  const result = spawnSync(process.execPath, [validator, '--api', 'admin', '--version', '2026-10', '--code', fs.readFileSync(path.join(__dirname, file), 'utf8'),
    '--artifact-id', 'acla-promotion-' + file, '--revision', '1', '--model', 'gpt-6', '--client-name', 'Codex'],
    { encoding: 'utf8', env: { ...process.env, OPT_OUT_INSTRUMENTATION: 'true' } });
  console.log(file + '\n' + result.stdout + result.stderr);
  if (result.status !== 0) process.exitCode = 1;
}
