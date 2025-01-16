import { DataFactory } from 'rdf-data-factory';
import { Builder } from '@traqula/core';
import type { ImplArgs, RuleDef } from '@traqula/core';
import { gram, lex as l } from '@traqula/rules-sparql-1-1';
import type {
  IriTerm,
  PropertyPath,
  Query,
  SparqlParser as ISparqlParser,
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
const queryOrUpdate: RuleDef<'queryOrUpdate', Query | Update | Pick<Update, 'base' | 'prefixes'>> = {
  name: 'queryOrUpdate',
  impl: ({ ACTION, SUBRULE, OR1, OR2, CONSUME, OPTION1, OPTION2, context }) => () => {
    const prologueValues = SUBRULE(gram.prologue);
    return OR1<Query | Update | Pick<Update, 'base' | 'prefixes'>>([
      { ALT: () => {
        const queryType = OR2<Omit<Query, gram.HandledByBase>>([
          { ALT: () => SUBRULE(gram.selectQuery) },
          { ALT: () => SUBRULE(gram.constructQuery) },
          { ALT: () => SUBRULE(gram.describeQuery) },
          { ALT: () => SUBRULE(gram.askQuery) },
        ]);
        const values = SUBRULE(gram.valuesClause);
        return ACTION(() => (<Query>{
          ...prologueValues,
          ...queryType,
          type: 'query',
          ...(values && { values }),
        }));
      } },
      { ALT: () => {

        let result: Update | Pick<Update, 'base' | 'prefixes'> = prologueValues;
        OPTION1(() => {
          const updateOperation = SUBRULE(gram.update1);

          const recursiveRes = OPTION2(() => {
            CONSUME(l.symbols.semi);
            return SUBRULE(gram.update);
          });

          return ACTION(() => {
            const updateResult: Update = {
              ...result,
              type: 'update',
              updates: [ updateOperation ],
            };
            if (recursiveRes) {
              updateResult.updates.push(...recursiveRes.updates);
              updateResult.base = recursiveRes.base ?? result.base;
              updateResult.prefixes = recursiveRes.prefixes ?
                  { ...result.prefixes, ...recursiveRes.prefixes } :
                updateResult.prefixes;
            }
            result = updateResult;
          });
        });

        ACTION(() => {
          const blankLabelsUsedInInsertData = new Set<string>();
          if ('updates' in result) {
            for (const updateOperation of result.updates) {
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
          }
        });
        return result;
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

export class Parser implements ISparqlParser {
  private readonly parser: {
    queryOrUpdate: (input: string) => SparqlQuery;
    path: (input: string) => PropertyPath | IriTerm;
  };

  private readonly dataFactory: DataFactory<RDF.BaseQuad>;

  public constructor(context: Partial<ImplArgs['context']> = {}) {
    this.dataFactory = context.dataFactory ?? new DataFactory({ blankNodePrefix: 'g_' });
    this.parser = sparql11ParserBuilder.consumeToParser({
      tokenVocabulary: l.sparql11Tokens.build(),
    }, {
      parseMode: new Set([ gram.canParseVars, gram.canCreateBlankNodes ]),
      ...context,
      dataFactory: this.dataFactory,
    });
  }

  public _resetBlanks(): void {
    this.dataFactory.resetBlankNodeCounter();
  }

  public parse(query: string): SparqlQuery {
    return this.parser.queryOrUpdate(query);
  }

  public parsePath(query: string): (PropertyPath & { prefixes: object }) | IriTerm {
    const result = this.parser.path(query);
    if ('type' in result) {
      return {
        ...result,
        prefixes: {},
      };
    }
    return result;
  }
}
