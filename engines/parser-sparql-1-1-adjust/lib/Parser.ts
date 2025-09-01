import { ParserBuilder, LexerBuilder } from '@traqula/core';
import { sparql11ParserBuilder } from '@traqula/parser-sparql-1-1';
import type { Expression, gram as g11, SparqlQuery } from '@traqula/rules-sparql-1-1';
import { sparqlCodepointEscape, lex as l11, SparqlParser } from '@traqula/rules-sparql-1-1';
import { gram, lex } from '@traqula/rules-sparql-1-1-adjust';

const builtInPatch: typeof g11.builtInCall = {
  name: 'builtInCall',
  impl: ({ SUBRULE, OR }) => () => OR<Expression>([
    { ALT: () => SUBRULE(gram.builtInAdjust) },
    { ALT: () => SUBRULE(gram.existingBuildInCall) },
  ]),
};

export const adjustBuilder = ParserBuilder.create(sparql11ParserBuilder)
  .addRule(gram.builtInAdjust)
  .addRule(gram.existingBuildInCall)
  .patchRule(builtInPatch);

export const lexerBuilder = LexerBuilder.create(l11.sparql11Tokens).addBefore(l11.a, lex.BuiltInAdjust);

export class Parser extends SparqlParser<SparqlQuery> {
  public constructor() {
    const parser = adjustBuilder.build({
      tokenVocabulary: lexerBuilder.tokenVocabulary,
      queryPreProcessor: sparqlCodepointEscape,
    });
    super(parser);
  }
}
