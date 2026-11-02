import assert from 'node:assert/strict';
import { test } from 'node:test';
import { demoDatabaseUrl, localDatabaseUrl } from '../src/database/local-tools';

test('herramientas locales rechazan hosts remotos, URL ausente y parámetros que redirigen pg', () => {
  for (const input of [undefined, 'postgres://db.example.invalid/sorteos_test',
    'https://127.0.0.1/sorteos_test', 'postgres://127.0.0.1/sorteos_test?host=remote.invalid',
    'postgres://127.0.0.1/sorteos_test#fragment']) {
    assert.throws(() => localDatabaseUrl(input));
  }
  assert.equal(localDatabaseUrl('postgres://127.0.0.1/postgres').hostname,'127.0.0.1');
});

test('migración y seed no escriben en bases locales con nombre ajeno al entorno DEMO', () => {
  for (const name of ['postgres','production','sorteos','sorteos_live']) {
    assert.throws(() => demoDatabaseUrl(`postgres://127.0.0.1/${name}`));
  }
  for (const name of ['sorteos_dev','sorteos_test','sorteos_b1_test_123']) {
    assert.equal(demoDatabaseUrl(`postgres://127.0.0.1/${name}`).pathname,`/${name}`);
  }
});

test('staging y producción bloquean las herramientas aunque la DB tenga nombre DEMO', () => {
  const previous = process.env.NODE_ENV;
  try {
    for (const environment of ['staging','production']) {
      process.env.NODE_ENV = environment;
      assert.throws(() => demoDatabaseUrl('postgres://127.0.0.1/sorteos_test'));
    }
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
