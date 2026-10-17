import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const toolkit = path.join(process.env.TEMP, 'acla-product-tools/node_modules');
const { Client } = await import(pathToFileURL(path.join(toolkit, '@modelcontextprotocol/sdk/dist/esm/client/index.js')));
const { StdioClientTransport } = await import(pathToFileURL(path.join(toolkit, '@modelcontextprotocol/sdk/dist/esm/client/stdio.js')));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(toolkit, '@shopify/dev-mcp/dist/index.js')],
  env: { ...process.env, OPT_OUT_INSTRUMENTATION: 'true' },
  stderr: 'pipe',
});
const client = new Client({ name: 'Codex', version: '1.0.0' });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const learn = tools.find(tool => tool.name === 'learn_shopify_api');
  if (!learn) throw new Error('learn_shopify_api is unavailable: ' + tools.map(tool => tool.name).join(', '));
  console.log('Calling learn_shopify_api with api=liquid');
  const result = await client.callTool({ name: 'learn_shopify_api', arguments: { api: 'liquid' } });
  const output = path.resolve('product-import/product-family');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'shopify-liquid-guidance.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result).slice(0, 18000));
} finally {
  await client.close();
}
