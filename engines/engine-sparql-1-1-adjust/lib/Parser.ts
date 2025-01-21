import {Builder, LexerBuilder, SparqlContext} from '@traqula/core';
import {gram, lex} from '@traqula/rules-sparql-1-1-adjust';
import {Expression, gram as g11, IriTerm, lex as l11, PropertyPath, SparqlQuery} from '@traqula/rules-sparql-1-1';
import {sparql11ParserBuilder} from '@traqula/engine-sparql-1-1';
import {DataFactory} from "rdf-data-factory";

const builtInPatch: typeof g11.builtInCall = {
  name: 'builtInCall',
  impl: ({ SUBRULE, OR }) => () => OR<Expression>([
    { ALT: () => SUBRULE(gram.builtInAdjust, undefined) },
    { ALT: () => SUBRULE(gram.existingBuildInCall, undefined) },
  ]),
};

export const adjustBuilder = Builder.createBuilder(sparql11ParserBuilder)
  .addRule(gram.builtInAdjust)
  .addRule(gram.existingBuildInCall)
  .patchRule(builtInPatch);


export class Parser {
  private readonly parser: {
    queryOrUpdate: (input: string, context: SparqlContext, arg: undefined) => SparqlQuery;
    path: (input: string, context: SparqlContext, arg: undefined) => PropertyPath | IriTerm;
  };
  private config: SparqlContext;
  private readonly initialConfig: SparqlContext;

  public constructor(context: Partial<SparqlContext> = {}) {
    this.parser  =adjustBuilder.consumeToParser({
      tokenVocabulary: LexerBuilder.create(l11.sparql11Tokens).addBefore(l11.a, lex.BuiltInAdjust).build(),
    });
    this.initialConfig = {
      dataFactory: context.dataFactory ?? new DataFactory({ blankNodePrefix: 'g_' }),
      baseIRI: context.baseIRI,
      prefixes: { ...context.prefixes },
      parseMode: context.parseMode ? new Set(context.parseMode) : new Set([ g11.canParseVars, g11.canCreateBlankNodes ]),
      skipValidation: context.skipValidation ?? false,
    }
    this.reset();
  }

  private reset() {
    this.config = {
      dataFactory: this.initialConfig.dataFactory,
      baseIRI: this.initialConfig.baseIRI,
      prefixes: { ...this.initialConfig.prefixes },
      parseMode: new Set(this.initialConfig.parseMode),
      skipValidation: this.initialConfig.skipValidation,
    }
  }

  public _resetBlanks(): void {
    this.config.dataFactory.resetBlankNodeCounter();
  }

  public parse(query: string): SparqlQuery {
    this.reset();
    return this.parser.queryOrUpdate(query, this.config, undefined);
  }

  public parsePath(query: string): (PropertyPath & { prefixes: object }) | IriTerm {
    this.reset();
    const result = this.parser.path(query, this.config, undefined);
    if ('type' in result) {
      return {
        ...result,
        prefixes: {},
      };
    }
    return result;
  }
}
