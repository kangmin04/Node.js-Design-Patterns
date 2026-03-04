import { test } from 'node:test';
import assert from 'node:assert';
import { getCategory } from './conditional.js';

test('getCategory - covers only the if branch', () => {
  assert.strictEqual(getCategory(20), 'A');
});
