import { DataFactory } from 'rdf-data-factory';
import {Builder, SparqlContext} from '@traqula/core';
import type { ImplArgs, SparqlRuleDef } from '@traqula/core';
import { gram, lex as l } from '@traqula/rules-sparql-1-1';
import type {
  IriTerm,
  PropertyPath,
  Query,
  SparqlQuery,
  Update,
} from '@traqula/rules-sparql-1-1';
import { queryUnitParserBuilder } from './queryUnitParser';
import { updateParserBuilder } from './updateUnitParser';
import type * as RDF from '@rdfjs/types';

// Create merge of
// ```
// Prologue
// ( SelectQuery | ConstructQuery | DescribeQuery | AskQuery )
// ValuesClause
// ```
// and:
// ```
// Prologue ( Update1 ( ';' Update )? )?
// ```
const queryOrUpdate: SparqlRuleDef<'queryOrUpdate', Query | Update | Pick<Update, 'base' | 'prefixes'>> = {
  name: 'queryOrUpdate',
  impl: ({ ACTION, SUBRULE, SUBRULE2, OR1, OR2, CONSUME, OPTION1, MANY }) => () => {
    const prologueValues = SUBRULE(gram.prologue, undefined);
    return OR1<Query | Update | Pick<Update, 'base' | 'prefixes'>>([
      { ALT: () => {
        const queryType = OR2<Omit<Query, gram.HandledByBase>>([
          { ALT: () => SUBRULE(gram.selectQuery, undefined) },
          { ALT: () => SUBRULE(gram.constructQuery, undefined) },
          { ALT: () => SUBRULE(gram.describeQuery, undefined) },
          { ALT: () => SUBRULE(gram.askQuery, undefined) },
        ]);
        const values = SUBRULE(gram.valuesClause, undefined);
        return ACTION(() => (<Query>{
          ...prologueValues,
          ...queryType,
          type: 'query',
          ...(values && { values }),
        }));
      } },
      { ALT: () => {
        // Prologue ( Update1 ( ';' Update )? )?
        // Is equivalent to:

        let parsedPrologue = true;
        const updateResult: Update = {
          ...prologueValues,
          type: 'update',
          updates: [],
        }
        MANY({
          GATE: () => parsedPrologue,
          DEF: () => {
            parsedPrologue = false;
            const updateOperation = SUBRULE(gram.update1, undefined);

            updateResult.updates.push(updateOperation);

            OPTION1(() => {
              CONSUME(l.symbols.semi);
              const prologueValues = SUBRULE2(gram.prologue, undefined);

              ACTION(() => {
                updateResult.base = prologueValues.base ?? updateResult.base;
                updateResult.prefixes = prologueValues.prefixes ?
                  { ...updateResult.prefixes, ...prologueValues.prefixes } :
                  updateResult.prefixes;
              });

              parsedPrologue = true;
            })
          }
        });

        ACTION(() => {
          const blankLabelsUsedInInsertData = new Set<string>();
          for (const updateOperation of updateResult.updates) {
            const iterBlankNodes = (callback: (blankNodeLabel: string) => void) => {
              if ('updateType' in updateOperation && updateOperation.updateType === 'insert') {
                for (const quad of updateOperation.insert) {
                  for (const triple of quad.triples) {
                    for (const position of <const> ['subject', 'object']) {
                      if (triple[position].termType === 'BlankNode') {
                        callback(triple[position].value);
                      }
                    }
                  }
                }
              }
            }
            iterBlankNodes(label => {
              if (blankLabelsUsedInInsertData.has(label)) {
                throw new Error('Detected reuse blank node across different INSERT DATA clauses');
              }
            });
            iterBlankNodes(label => blankLabelsUsedInInsertData.add(label));
          }
        });

        return updateResult.updates.length > 0 ? updateResult : prologueValues;
      } },
    ]);
  },
};

export const sparql11ParserBuilder = Builder.createBuilder(queryUnitParserBuilder)
  .merge(updateParserBuilder, <const> [])
  .deleteRule('queryUnit')
  .deleteRule('query')
  .deleteRule('updateUnit')
  .addRule(queryOrUpdate);

export class Parser {
  private readonly parser: {
    queryOrUpdate: (input: string, context: SparqlContext, arg: undefined) => SparqlQuery;
    path: (input: string, context: SparqlContext, arg: undefined) => PropertyPath | IriTerm;
  };
  private config: SparqlContext;
  private readonly initialConfig: SparqlContext;

  public constructor(context: Partial<SparqlContext> = {}) {
    this.parser = sparql11ParserBuilder.consumeToParser({
      tokenVocabulary: l.sparql11Tokens.build(),
    });
    this.initialConfig = {
      dataFactory: context.dataFactory ?? new DataFactory({ blankNodePrefix: 'g_' }),
      baseIRI: context.baseIRI,
      prefixes: { ...context.prefixes },
      parseMode: context.parseMode ? new Set(context.parseMode) : new Set([ gram.canParseVars, gram.canCreateBlankNodes ]),
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
    this.reset()
    return this.parser.queryOrUpdate(query, this.config, undefined);
  }

  public parsePath(query: string): (PropertyPath & { prefixes: object }) | IriTerm {
    this.reset()
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
