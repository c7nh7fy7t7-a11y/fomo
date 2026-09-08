const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadMediaCache() {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '../services/mediaCache.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  let now = 0;
  let signCalls = 0;
  const supabase = {
    storage: {
      from: () => ({
        async createSignedUrls(paths) {
          signCalls += 1;
          return {
            data: paths.map((item) => ({ path: item, signedUrl: `signed-${signCalls}-${item}` })),
            error: null,
          };
        },
      }),
    },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      assert.equal(name, '@/lib/supabase');
      return { supabase };
    },
    Date: class extends Date { static now() { return now; } },
    Map, Set,
  });
  return { exports, advance(ms) { now += ms; }, get signCalls() { return signCalls; } };
}

test('private media URLs are re-signed before session-cache reuse can outlive them', async () => {
  const harness = loadMediaCache();
  const first = await harness.exports.signedUrlsFor('feed-media', ['owner/post/photo.jpg']);
  assert.equal(first.get('owner/post/photo.jpg'), 'signed-1-owner/post/photo.jpg');

  harness.advance(9 * 60 * 1000);
  const reused = await harness.exports.signedUrlsFor('feed-media', ['owner/post/photo.jpg']);
  assert.equal(reused.get('owner/post/photo.jpg'), 'signed-1-owner/post/photo.jpg');
  assert.equal(harness.signCalls, 1);

  harness.advance(2 * 60 * 1000);
  const refreshed = await harness.exports.signedUrlsFor('feed-media', ['owner/post/photo.jpg']);
  assert.equal(refreshed.get('owner/post/photo.jpg'), 'signed-2-owner/post/photo.jpg');
  assert.equal(harness.signCalls, 2);
});
