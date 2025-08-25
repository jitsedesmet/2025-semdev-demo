import type { BaseQuad } from '@rdfjs/types';
import { positiveTest, importSparql11NoteTests } from '@traqula/test-utils';
import { DataFactory } from 'rdf-data-factory';
import { describe, it } from 'vitest';
import { Parser } from '../lib';

describe('a SPARQL 1.1 - OPTIONAL', () => {
  const parser = new Parser();
  const context = { prefixes: { ex: 'http://example.org/' }};

  describe('positive sparql 1.1', () => {
    for (const { name, statics } of positiveTest('sparql-1-1')) {
      it(`can parse ${name}`, async({ expect }) => {
        const { query, ast } = await statics();
        if (query.includes('OPTIONAL')) {
          expect(() => parser.parse(query, context)).toThrow();
        } else {
          const res: unknown = parser.parse(query, context);
          expect(res).toEqualParsedQuery(ast);
        }
      });
    }
  });

  describe('specific sparql 1.1 tests', () => {
    importSparql11NoteTests(parser, new DataFactory<BaseQuad>());
  });
});
