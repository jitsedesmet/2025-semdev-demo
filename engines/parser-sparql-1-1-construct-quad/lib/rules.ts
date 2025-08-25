import type { RuleDefReturn, Wrap } from '@traqula/core';
import {
  lex as l,
  gram as g,
} from '@traqula/rules-sparql-1-1';
import type {
  Factory,
  PatternBgp,
  PatternGraph,
  SparqlGrammarRule,
  TermBlank,
  TermIri,
  TermVariable,
} from '@traqula/rules-sparql-1-1';
import type { IToken } from 'chevrotain';
import type { ConstructQuads, GraphQuads, QueryConstruct } from './types';

export const constructTemplateQ: SparqlGrammarRule<'constructTemplateQ', Wrap<ConstructQuads[]>> = {
  name: 'constructTemplateQ',
  impl: ({ SUBRULE, CONSUME, ACTION }) => (C) => {
    const open = CONSUME(l.symbols.LCurly);
    const quads = SUBRULE(constructQuads, undefined);
    const close = CONSUME(l.symbols.RCurly);
    return ACTION(() => C.factory.wrap(quads.val, C.factory.sourceLocation(open, close)));
  },
};

export const constructQuads: SparqlGrammarRule<'constructQuads', Wrap<ConstructQuads[]>> = {
  name: 'constructQuads',
  impl: ({ ACTION, SUBRULE1, SUBRULE2, MANY, OPTION1, OPTION2, OPTION3, CONSUME }) => (C) => {
    const result: ConstructQuads[] = [];
    let lastDot: IToken | undefined;
    const firstTriples = OPTION1(() => SUBRULE1(g.triplesTemplate, undefined));
    ACTION(() => {
      if (firstTriples) {
        result.push(firstTriples);
      }
    });
    MANY(() => {
      const notTriples = SUBRULE1(constructQuadsNotTriples, undefined);
      lastDot = OPTION2(() => CONSUME(l.symbols.dot));
      const triples = OPTION3(() => SUBRULE2(g.triplesTemplate, undefined));
      ACTION(() => {
        result.push(notTriples);
        if (triples) {
          result.push(triples);
        }
      });
    });
    return ACTION(() => C.factory.wrap(result, C.factory.sourceLocation(...result, lastDot)));
  },
};

export const varOrBlankNodeIri: SparqlGrammarRule<'varOrBlankNodeIri', TermVariable | TermBlank | TermIri> = {
  name: 'varOrBlankNodeIri',
  impl: ({ SUBRULE, OR }) => () => OR<RuleDefReturn<typeof varOrBlankNodeIri>>([
    { ALT: () => SUBRULE(g.varOrIri, undefined) },
    { ALT: () => SUBRULE(g.blankNode, undefined) },
  ]),
};

export const constructQuadsNotTriples: SparqlGrammarRule<'constructQuadsNotTriples', GraphQuads> = {
  name: 'constructQuadsNotTriples',
  impl: ({ ACTION, SUBRULE, CONSUME, OPTION }) => (C) => {
    const graph = CONSUME(l.graph.graph);
    const graphVal = SUBRULE(varOrBlankNodeIri, undefined);
    CONSUME(l.symbols.LCurly);
    const triples = OPTION(() => SUBRULE(g.triplesTemplate, undefined));
    const rCurly = CONSUME(l.symbols.RCurly);
    return ACTION(() => ({
      type: 'graph',
      graph: graphVal,
      triples: triples ?? C.factory.patternBgp([], C.factory.sourceLocation()),
      loc: C.factory.sourceLocation(graph, rCurly),
    } satisfies GraphQuads));
  },
};

/**
 * [[10]](https://www.w3.org/TR/sparql11-query/#rConstructQuery)
 * https://jena.apache.org/documentation/query/construct-quad.html#Grammar
 * ‘CONSTRUCT’ ( ConstructTemplateQ DatasetClause* WhereClause SolutionModifier
 * | DatasetClause* ‘WHERE’ ConstructTemplateQ SolutionModifier )
 */
export const constructQuery:
SparqlGrammarRule<'constructQuery', Omit<QueryConstruct, 'type' | 'context' | 'values'>> = <const> {
  name: 'constructQuery',
  impl: ({ ACTION, SUBRULE1, SUBRULE2, CONSUME, OR }) => (C) => {
    const construct = CONSUME(l.construct);
    return OR<RuleDefReturn<typeof constructQuery>>([
      { ALT: () => {
        // Long format
        const template = SUBRULE1(constructTemplateQ, undefined);
        const from = SUBRULE1(g.datasetClauseStar, undefined);
        const where = SUBRULE1(g.whereClause, undefined);
        const modifiers = SUBRULE1(g.solutionModifier, undefined);
        return ACTION(() => ({
          subType: 'construct',
          template: template.val,
          datasets: from,
          where: where.val,
          solutionModifiers: modifiers,
          loc: C.factory.sourceLocation(
            construct,
            where,
            modifiers.group,
            modifiers.having,
            modifiers.order,
            modifiers.limitOffset,
          ),
        }));
      } },
      { ALT: () => {
        // Short format
        const from = SUBRULE2(g.datasetClauseStar, undefined);
        CONSUME(l.where);
        // ConstructTemplate is same as '{' TriplesTemplate? '}'
        const template = SUBRULE2(constructTemplateQ, undefined);
        const modifiers = SUBRULE2(g.solutionModifier, undefined);

        return ACTION(() => {
          const where = C.factory.patternGroup(
            template.val.map(x => toPatternGroup(x, C.factory)),
            C.factory.sourceLocation(),
          );
          return {
            subType: 'construct',
            template: template.val,
            datasets: from,
            where,
            solutionModifiers: modifiers,
            loc: C.factory.sourceLocation(
              construct,
              template,
              modifiers.group,
              modifiers.having,
              modifiers.order,
              modifiers.limitOffset,
            ),
          };
        });
      } },
    ]);
  },
};

function toPatternGroup(constructQuads: ConstructQuads, F: Factory): PatternBgp | PatternGraph {
  if (F.isPattern(constructQuads)) {
    return constructQuads;
  }
  const graph = constructQuads.graph;
  if (F.isTermBlank(graph)) {
    throw new Error('Cannot have a blanknode as graph name in pattern');
  }
  return F.patternGraph(
    graph,
    [ constructQuads.triples ],
    constructQuads.loc,
  );
}
