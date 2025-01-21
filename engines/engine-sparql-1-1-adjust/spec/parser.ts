import {ErrorSkipped,} from 'rdf-test-suite';
import {Parser} from '../lib'
import {SparqlContext} from "@traqula/core";

export async function parse(query: string,  context: Partial<SparqlContext> = {}) {
  const parser = new Parser(context);
  parser.parse(query);
}
export function query() {
  return Promise.reject(new ErrorSkipped('Querying is not supported'));
}

export function update() {
  return Promise.reject(new ErrorSkipped('Updating is not supported'));
}
