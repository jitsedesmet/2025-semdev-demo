import type * as RDF from '@rdfjs/types';
import type {
  DatasetClauses,
  Pattern,
  PatternGroup,
  QuerySelect,
  Term,
  TermBlank,
  TermIri,
  TermLiteral,
  TermVariable,
  TripleNesting,
} from '@traqula/rules-sparql-1-1';
import type { Algebra } from '../index';
import * as util from '../util';
import type { AstIndir } from './core';
import { translateAlgPureExpression } from './expression';
import { translateAlgPatternIntoGroup, translateAlgPatternNew } from './pattern';

export type RdfTermToAst<T extends RDF.Term> = T extends RDF.Variable ? TermVariable :
  T extends RDF.BlankNode ? TermBlank :
    T extends RDF.Literal ? TermLiteral :
      T extends RDF.NamedNode ? TermIri : never;

export const translateAlgTerm: AstIndir<'translateTerm', Term, [RDF.Term]> = {
  name: 'translateTerm',
  fun: ({ SUBRULE }) => ({ astFactory: F }, term) => {
    if (term.termType === 'NamedNode') {
      return F.namedNode(F.gen(), term.value);
    }
    if (term.termType === 'BlankNode') {
      return F.blankNode(term.value, F.gen());
    }
    if (term.termType === 'Variable') {
      return F.variable(term.value, F.gen());
    }
    if (term.termType === 'Literal') {
      return F.literalTerm(
        F.gen(),
        term.value,
        term.language ? term.language : <RdfTermToAst<typeof term.datatype>>SUBRULE(translateAlgTerm, term.datatype),
      );
    }
    throw new Error(`invalid term type: ${term.termType}`);
  },
};

/**
 * Extend is for example a bind, or an aggregator.
 * The result is thus registered to be tackled at the project level,
 *  or if we are not in project scope, we give it as a patternBind
 *  - of course, the pattern bind is scoped with the other operations at this level
 */
export const translateAlgExtend: AstIndir<'translateExtend', Pattern | Pattern[], [Algebra.Extend]> = {
  name: 'translateExtend',
  fun: ({ SUBRULE }) => ({ astFactory: F, project, extend }, op) => {
    if (project) {
      extend.push(op);
      return SUBRULE(translateAlgPatternNew, op.input);
    }
    return util.flatten([
      SUBRULE(translateAlgPatternNew, op.input),
      F.patternBind(
        SUBRULE(translateAlgPureExpression, op.expression),
        <RdfTermToAst<typeof op.variable>> SUBRULE(translateAlgTerm, op.variable),
        F.gen(),
      ),
    ]);
  },
};

export const translateAlgDatasetClauses:
AstIndir<'translateDatasetClauses', DatasetClauses, [RDF.NamedNode[], RDF.NamedNode[]]> = {
  name: 'translateDatasetClauses',
  fun: ({ SUBRULE }) => ({ astFactory: F }, _default, named) =>
    F.datasetClauses([
      ..._default.map(x => (<const>{
        clauseType: 'default',
        value: <RdfTermToAst<typeof x>> SUBRULE(translateAlgTerm, x),
      })),
      ...named.map(x => (<const>{
        clauseType: 'named',
        value: <RdfTermToAst<typeof x>>SUBRULE(translateAlgTerm, x),
      })),
    ], F.gen()),
};

/**
 * An order by is just registered to be handled in the creation of your QueryBase
 */
export const translateAlgOrderBy: AstIndir<'translateOrderBy', Pattern | Pattern[], [Algebra.OrderBy]> = {
  name: 'translateOrderBy',
  fun: ({ SUBRULE }) => ({ order }, op) => {
    order.push(...op.expressions);
    return SUBRULE(translateAlgPatternNew, op.input);
  },
};

export const translateAlgPattern: AstIndir<'translatePattern', TripleNesting, [Algebra.Pattern]> = {
  name: 'translatePattern',
  fun: ({ SUBRULE }) => ({ astFactory: F }, op) =>
    F.triple(
      SUBRULE(translateAlgTerm, op.subject),
      <TripleNesting['predicate']> SUBRULE(translateAlgTerm, op.predicate),
      SUBRULE(translateAlgTerm, op.object),
    ),
};

/**
 * Reduced is wrapped around a project, set the query contained to be distinct
 */
export const translateAlgReduced: AstIndir<'translateReduced', PatternGroup, [Algebra.Reduced]> = {
  name: 'translateReduced',
  fun: ({ SUBRULE }) => (_, op) => {
    const result = SUBRULE(translateAlgPatternIntoGroup, op.input);
    const select = <QuerySelect>result.patterns[0];
    select.reduced = true;
    return result;
  },
};

/**
 * District is wrapped around a project, set the query contained to be distinct
 */
export const translateAlgDistinct: AstIndir<'translateDistinct', PatternGroup, [Algebra.Distinct]> = {
  name: 'translateDistinct',
  fun: ({ SUBRULE }) => (_, op) => {
    const result = SUBRULE(translateAlgPatternIntoGroup, op.input);
    const select = <QuerySelect>result.patterns[0];
    select.distinct = true;
    return result;
  },
};
