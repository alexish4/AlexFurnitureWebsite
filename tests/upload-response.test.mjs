import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../app/lib/upload-response.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { readUploadResponse } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('successful upload returns its URL', async () => {
  assert.equal(await readUploadResponse(Response.json({url:'/api/uploads/photo.png'}, {status:201})), '/api/uploads/photo.png');
});
test('HTML size rejection reports the server limit', async () => {
  await assert.rejects(readUploadResponse(new Response('<html>Too large</html>', {status:413})), /server rejected.*too large/);
});
test('plain text gateway error preserves HTTP status', async () => {
  await assert.rejects(readUploadResponse(new Response('Bad Gateway', {status:502})), /HTTP 502/);
});
test('API error is preserved', async () => {
  await assert.rejects(readUploadResponse(Response.json({error:'Admin access required.'}, {status:403})), /Admin access required/);
});
test('unexpected successful responses do not confirm an upload', async () => {
  for (const body of ['<html>Login</html>', 'null', '{}', '{"url":""}']) {
    await assert.rejects(readUploadResponse(new Response(body)), /did not confirm/);
  }
});
