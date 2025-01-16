import { ErrorSkipped, } from 'rdf-test-suite';
import { Parser } from '../lib'

export async function parse(query: string, baseIRI: string) {
  const parser = new Parser({ baseIRI });
  parser.parse(query);
}
export function query() {
  return Promise.reject(new ErrorSkipped('Querying is not supported'));
}

export function update() {
  return Promise.reject(new ErrorSkipped('Updating is not supported'));
}
