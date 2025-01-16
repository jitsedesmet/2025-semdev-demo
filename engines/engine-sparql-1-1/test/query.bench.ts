/* eslint-disable test/consistent-test-it */
import { Parser as SparqlJSparser } from 'sparqljs';
import { describe, bench } from 'vitest';
import { Parser as TraqulaParqer } from '../lib/';

describe('query, exclude construction', () => {
  const traqulaParqer = new TraqulaParqer();
  const sparqlJSparser = new SparqlJSparser();
  const query = `
SELECT ?president ?party ?page WHERE {
   ?president <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://dbpedia.org/ontology/President> .
   ?president <http://dbpedia.org/ontology/nationality> <http://dbpedia.org/resource/United_States> .
   ?president <http://dbpedia.org/ontology/party> ?party .
   ?x <http://data.nytimes.com/elements/topicPage> ?page .
   ?x <http://www.w3.org/2002/07/owl#sameAs> ?president .
}
`;

  bench('traqula parse', () => {
    traqulaParqer.parse(query);
  });
  bench('sparqljs', () => {
    sparqlJSparser.parse(query);
  });
});
