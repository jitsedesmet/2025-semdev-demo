import { ParserBuilder, LexerBuilder } from '@traqula/core';
import type { queryOrUpdate } from '@traqula/parser-sparql-1-1';
import { sparql11ParserBuilder } from '@traqula/parser-sparql-1-1';
import type {
  SparqlContext,
  gram as g,
} from '@traqula/rules-sparql-1-1';
import {
  sparqlCodepointEscape,
  lex as l11,
  completeParseContext,
  Factory,
} from '@traqula/rules-sparql-1-1';
import {
  constructQuads,
  constructQuadsNotTriples,
  constructQuery,
  constructTemplateQ,
  varOrBlankNodeIri,
} from './rules';
import type { Query, SparqlQuery } from './types';

export const constructQuadBuilder = ParserBuilder.create(sparql11ParserBuilder)
  .addMany(
    constructTemplateQ,
    constructQuads,
    varOrBlankNodeIri,
    constructQuadsNotTriples,
  )
  .patchRule(constructQuery)
  .typePatch<{
    [g.query.name]: Query;
    [queryOrUpdate.name]: SparqlQuery;
  }>();

export class Parser {
  private readonly F = new Factory();
  private readonly parser: {
    queryOrUpdate: (query: string, context: SparqlContext, _: undefined) => SparqlQuery;
  };

  public constructor() {
    this.parser = constructQuadBuilder.build({
      tokenVocabulary: LexerBuilder.create(l11.sparql11Tokens).tokenVocabulary,
      queryPreProcessor: sparqlCodepointEscape,
    });
  }

  public parse(query: string, context: Partial<SparqlContext> = {}): SparqlQuery {
    return this.parser.queryOrUpdate(query, completeParseContext(context), undefined);
  }
}
