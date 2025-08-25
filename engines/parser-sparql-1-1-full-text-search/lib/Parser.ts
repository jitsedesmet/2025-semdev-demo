import { LexerBuilder, ParserBuilder } from '@traqula/core';
import { sparql11ParserBuilder } from '@traqula/parser-sparql-1-1';
import {
  completeParseContext,
  Factory,
  lex as l11,
  sparqlCodepointEscape,
} from '@traqula/rules-sparql-1-1';
import type {
  SparqlQuery,
  SparqlContext,

  gram as g,
} from '@traqula/rules-sparql-1-1';
import { option, qName } from './lexer';
import { objectList, objectListPath, tripleOption, tripleOptions } from './rules';
import type { TripleNesting } from './types';

export const fulltextSearchBuilder = ParserBuilder.create(sparql11ParserBuilder)
  .addMany(
    tripleOption,
    tripleOptions,
  )
  .patchRule(objectList)
  .patchRule(objectListPath)
  .typePatch<{
    [g.objectPath.name]: TripleNesting;
  }>();

export class Parser {
  private readonly F = new Factory();
  private readonly parser: {
    queryOrUpdate: (query: string, context: SparqlContext, _: undefined) => SparqlQuery;
  };

  public constructor() {
    this.parser = fulltextSearchBuilder.build({
      tokenVocabulary: LexerBuilder.create(l11.sparql11Tokens)
        .add(option, qName).tokenVocabulary,
      lexerConfig: {
        positionTracking: 'full',
      },
      queryPreProcessor: sparqlCodepointEscape,
    });
  }

  public parse(query: string, context: Partial<SparqlContext> = {}): SparqlQuery {
    return this.parser.queryOrUpdate(query, completeParseContext(context), undefined);
  }
}
