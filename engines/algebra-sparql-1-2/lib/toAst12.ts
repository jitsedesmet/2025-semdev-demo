import { toAstBuilder } from '@traqula/algebra-sparql-1-1';
import type { Algebra, algToSparql } from '@traqula/algebra-transformations-1-1';
import type { AstContext } from '@traqula/algebra-transformations-1-2';
import { createAstContext, translateAlgTerm12 } from '@traqula/algebra-transformations-1-2';
import { IndirBuilder } from '@traqula/core';
import type { SparqlQuery } from '@traqula/rules-sparql-1-2';

export const toAstBuilder12 = IndirBuilder
  .create(toAstBuilder)
  .widenContext<AstContext>()
  .patchRule(translateAlgTerm12)
  .typePatch<{
    [algToSparql.name]: [SparqlQuery, [Algebra.Operation]];
  }>();

export function toSparql12(op: Algebra.Operation): SparqlQuery {
  const c = createAstContext();
  const transformer = toAstBuilder12.build();
  return transformer.toSparqlJs(c, op);
}
