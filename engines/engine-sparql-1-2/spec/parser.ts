import type { SparqlContext } from '@traqula/rules-sparql-1-1';
import { ErrorSkipped } from 'rdf-test-suite';
import { Parser } from '../lib';

export async function parse(query: string, context: Partial<SparqlContext> = {}) {
  const parser = new Parser();
  parser.parse(query, context);
}
export function query() {
  return Promise.reject(new ErrorSkipped('Querying is not supported'));
}

export function update() {
  return Promise.reject(new ErrorSkipped('Updating is not supported'));
}
