import type * as T11 from '@traqula/rules-sparql-1-1';

// https://www.w3.org/TR/sparql11-query/#rTriplesBlock
export type TripleNesting = T11.TripleNesting & {
  options?: Option[];
};

export type Option = {
  name: string;
  expression: T11.Expression | undefined;
};
