import type { RuleDefReturn } from '@traqula/core';
import { LexerBuilder, ParserBuilder } from '@traqula/core';
import { sparql11ParserBuilder } from '@traqula/parser-sparql-1-1';
import {
  completeParseContext,
  Factory,
  lex as l11,
  sparqlCodepointEscape,

  gram as g,
} from '@traqula/rules-sparql-1-1';
import type {
  SparqlQuery,
  SparqlContext,
  SparqlGrammarRule,
} from '@traqula/rules-sparql-1-1';

export const graphPatternNotTriples:
SparqlGrammarRule<(typeof g.graphPatternNotTriples)['name'], RuleDefReturn<typeof g.graphPatternNotTriples>> = {
  name: 'graphPatternNotTriples',
  impl: ({ SUBRULE, OR }) => () => OR<RuleDefReturn<typeof graphPatternNotTriples>>([
    { ALT: () => SUBRULE(g.groupOrUnionGraphPattern) },
    { ALT: () => SUBRULE(g.minusGraphPattern) },
    { ALT: () => SUBRULE(g.graphGraphPattern) },
    { ALT: () => SUBRULE(g.serviceGraphPattern) },
    { ALT: () => SUBRULE(g.filter) },
    { ALT: () => SUBRULE(g.bind) },
    { ALT: () => SUBRULE(g.inlineData) },
  ]),
};

export const noOptionalBuilder = ParserBuilder.create(sparql11ParserBuilder)
  .patchRule(graphPatternNotTriples)
  .deleteRule(g.optionalGraphPattern.name);

export class Parser {
  private readonly F = new Factory();
  private readonly parser: {
    queryOrUpdate: (query: string, context: SparqlContext) => SparqlQuery;
  };

  public constructor() {
    this.parser = noOptionalBuilder.build({
      tokenVocabulary: LexerBuilder.create(l11.sparql11Tokens).tokenVocabulary,
      lexerConfig: {
        positionTracking: 'full',
      },
      queryPreProcessor: sparqlCodepointEscape,
    });
  }

  public parse(query: string, context: Partial<SparqlContext> = {}): SparqlQuery {
    return this.parser.queryOrUpdate(query, completeParseContext(context));
  }
}
