import * as l from '../lexer';
import { iri } from './literals';
import type {IriTerm, SparqlRuleDef} from '../Sparql11types';

/**
 * [[13]](https://www.w3.org/TR/sparql11-query/#rDatasetClause)
 */
export interface IDatasetClause {
  value: IriTerm;
  type: 'default' | 'named';
}
export const datasetClause: SparqlRuleDef<'datasetClause', IDatasetClause> = <const> {
  name: 'datasetClause',
  impl: ({ SUBRULE, CONSUME, OR }) => () => {
    CONSUME(l.from);
    return OR<IDatasetClause>([
      { ALT: () => ({ value: SUBRULE(defaultGraphClause, undefined), type: 'default' }) },
      { ALT: () => ({ value: SUBRULE(namedGraphClause, undefined), type: 'named' }) },
    ]);
  },
};

/**
 * [[14]](https://www.w3.org/TR/sparql11-query/#rDefaultGraphClause)
 */
export const defaultGraphClause: SparqlRuleDef<'defaultGraphClause', IriTerm> = <const> {
  name: 'defaultGraphClause',
  impl: ({ SUBRULE }) => () => SUBRULE(sourceSelector, undefined),
};

/**
 * [[15]](https://www.w3.org/TR/sparql11-query/#rNamedGraphClause)
 */
export const namedGraphClause: SparqlRuleDef<'namedGraphClause', IriTerm> = <const> {
  name: 'namedGraphClause',
  impl: ({ SUBRULE, CONSUME }) => () => {
    CONSUME(l.graph.named);
    return SUBRULE(sourceSelector, undefined);
  },
};

/**
 * [[16]](https://www.w3.org/TR/sparql11-query/#rSourceSelector)
 */
export const sourceSelector: SparqlRuleDef<'sourceSelector', IriTerm> = <const> {
  name: 'sourceSelector',
  impl: ({ SUBRULE }) => () => SUBRULE(iri, undefined),
};
