import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkItems } from './chunkItems';

test('splits a reset larger than the Firestore batch limit into safe chunks', () => {
  const operations = Array.from({ length: 1_237 }, (_, index) => index);
  const chunks = chunkItems(operations, 450);

  assert.deepEqual(chunks.map(chunk => chunk.length), [450, 450, 337]);
  assert.deepEqual(chunks.flat(), operations);
});

test('returns no chunks for an empty reset', () => {
  assert.deepEqual(chunkItems([], 450), []);
});

test('rejects invalid chunk sizes', () => {
  assert.throws(() => chunkItems([1], 0));
  assert.throws(() => chunkItems([1], 1.5));
});
