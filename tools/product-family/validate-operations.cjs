const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const validator = path.join(process.env.USERPROFILE, '.agents/skills/shopify/scripts/validate.mjs');
const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.graphql'));
process.env.OPT_OUT_INSTRUMENTATION = 'true';
for (const file of files) {
  const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const result = spawnSync(process.execPath, [validator, '--api', 'admin', '--code', code,
    '--artifact-id', 'acla-family-' + file, '--revision', '2', '--model', 'gpt-6', '--client-name', 'Codex'], { encoding: 'utf8' });
  console.log(file + '\n' + result.stdout + result.stderr);
  if (result.status) process.exitCode = 1;
}
