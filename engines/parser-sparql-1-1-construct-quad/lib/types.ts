import type { Node, Patch } from '@traqula/core';
import type * as T11 from '@traqula/rules-sparql-1-1';

export type Sparql11Nodes =
  | T11.GraphRef
  | T11.UpdateOperation
  | T11.Update
  | T11.DatasetClauses
  | T11.TripleCollection
  | T11.TripleNesting
  | T11.Pattern
  | T11.SolutionModifier
  | T11.Expression
  | T11.Path
  | T11.ContextDefinition
  | T11.Wildcard
  | T11.Term;

export type SparqlQuery = Query | T11.Update;

export type Query =
  | T11.QuerySelect
  | QueryConstruct
  | T11.QueryDescribe
  | T11.QueryAsk;

export type QueryConstruct = Patch<T11.QueryConstruct, {
  template: ConstructQuads[];
}>;

export type ConstructQuads = T11.PatternBgp | GraphQuads;

export type GraphQuads = Node & {
  type: 'graph';
  graph: T11.TermIri | T11.TermVariable | T11.TermBlank;
  triples: T11.PatternBgp;
};
