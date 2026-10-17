// Receive the private Site bearer through hidden stdin, never command arguments.
const base = 'https://acla-promotion-title-sync.shrewdsloth8.chatgpt.site';
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdout.write('Ready for private service credential (input is hidden).\n');
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (!/[\r\n]/.test(input)) continue;
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  const { token } = JSON.parse(input.trim());
  const headers = { 'OAI-Sites-Authorization': `Bearer ${token}` };
  for (const [path, method] of [['/health', 'GET'], ['/api/sync', 'POST']]) {
    const response = await fetch(base + path, { method, headers, redirect: 'manual', signal: AbortSignal.timeout(45000) });
    const body = response.headers.get('content-type')?.includes('application/json') ? await response.json() : { message: 'Non-JSON response', location: response.headers.get('location') };
    console.log(JSON.stringify({ path, status: response.status, result: body }));
  }
  process.exit(0);
}
