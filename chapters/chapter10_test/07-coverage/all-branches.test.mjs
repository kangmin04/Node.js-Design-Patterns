import { test } from 'node:test';
import assert from 'node:assert';
import { getCategory } from './conditional.js';

test('getCategory - covers both if and else branches', () => {
  assert.strictEqual(getCategory(20), 'A', 'should cover the if branch');
  assert.strictEqual(getCategory(5), 'B', 'should cover the else branch');
});

/*
# file                                                      | line % | branch % | funcs % | uncovered lines
# ----------------------------------------------------------------------------------------------------------
# chapters/chapter10_test/07-coverage/all-branches.test.mjs | 100.00 |   100.00 |  100.00 | 
# chapters/chapter10_test/07-coverage/conditional.js        | 100.00 |   100.00 |  100.00 | 
# ----------------------------------------------------------------------------------------------------------
# all files                                                 | 100.00 |   100.00 |  100.00 |
# -----------------------------------------------------------------------------------------------
*/