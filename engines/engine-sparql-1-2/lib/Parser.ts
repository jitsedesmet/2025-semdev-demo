import {DataFactory} from 'rdf-data-factory';
import {Builder, SparqlContext} from '@traqula/core';
import {gram as g11, IriTerm, PropertyPath, SparqlQuery,} from '@traqula/rules-sparql-1-1';
import {gram as S11} from '@traqula/rules-sparql-1-1';
import {gram as S12, lex as l12} from '@traqula/rules-sparql-1-2';
import {sparql11ParserBuilder} from '@traqula/engine-sparql-1-1';

export const sparql12ParserBuilder = Builder.createBuilder(sparql11ParserBuilder)
  .addMany(
    S12.reifiedTripleBlock,
    S12.reifiedTripleBlockPath,
    S12.reifier,
    S12.varOrReifierId,
    S12.annotation,
    S12.annotationPath,
    S12.annotationBlockPath,
    S12.annotationBlock,
    S12.reifiedTriple,
    S12.reifiedTripleSubject,
    S12.reifiedTripleObject,
    S12.tripleTerm,
    S12.tripleTermSubject,
    S12.tripleTermObject,
    S12.tripleTermData,
    S12.tripleTermDataSubject,
    S12.tripleTermDataObject,
    S12.exprTripleTerm,
    S12.exprTripleTermSubject,
    S12.exprTripleTermObject,
    S12.builtinLangDir,
    S12.builtinLangStrDir,
    S12.builtinHasLang,
    S12.builtinHasLangDir,
    S12.builtinIsTriple,
    S12.builtinTriple,
    S12.builtinSubject,
    S12.builtinPredicate,
    S12.builtinObject,
  )
  .patchRule(S12.dataBlockValue)
  .patchRule(S12.triplesSameSubject)
  .patchRule(S12.triplesSameSubjectPath)
  .patchRule(S12.object)
  .patchRule(S12.objectPath)
  .patchRule(S12.graphNode)
  .patchRule(S12.graphNodePath)
  .patchRule(S12.varOrTerm)
  .patchRule(S12.primaryExpression)
  .patchRule(S12.builtInCall)
  .patchRule(S12.rdfLiteral);

export class Parser {
  private readonly parser: {
    queryOrUpdate: (input: string, context: SparqlContext, arg: undefined) => SparqlQuery;
    path: (input: string, context: SparqlContext, arg: undefined) => PropertyPath | IriTerm;
  };
  private config: SparqlContext;
  private readonly initialConfig: SparqlContext;

  public constructor(context: Partial<SparqlContext> = {}) {
    this.parser = sparql12ParserBuilder.consumeToParser({
      tokenVocabulary: l12.sparql12Tokens.build(),
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
