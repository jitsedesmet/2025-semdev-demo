import type { Localized, RuleDefReturn, Wrap } from '@traqula/core';
import type { IToken } from 'chevrotain';
import * as l from '../lexer/index';
import type { SparqlGrammarRule, SparqlRule } from '../sparql11HelperTypes';
import type {
  PatternBgp,
  PatternBind,
  PatternValues,
  Query,
  QueryAsk,
  QueryConstruct,
  QueryDescribe,
  QuerySelect,
  SubSelect,
  TermIri,
  TermVariable,
  Wildcard,
} from '../Sparql11types';
import { queryIsGood } from '../validation/validators';
import { datasetClauseStar } from './dataSetClause';
import { expression } from './expression';
import { prologue, var_, varOrIri, varOrTerm } from './general';
import { solutionModifier } from './solutionModifier';
import { triplesBlock, triplesTemplate } from './tripleBlock';
import { inlineData, whereClause } from './whereClause';

/**
 * [[1]](https://www.w3.org/TR/sparql11-query/#rQueryUnit)
 */
export const queryUnit: SparqlGrammarRule<'queryUnit', Query> = <const> {
  name: 'queryUnit',
  impl: ({ SUBRULE }) => () => SUBRULE(query),
};

export type HandledByBase = 'type' | 'context' | 'values';

/**
 * [[2]](https://www.w3.org/TR/sparql11-query/#rQuery)
 */
export const query: SparqlRule<'query', Query> = <const> {
  name: 'query',
  impl: ({ ACTION, SUBRULE, OR }) => (C) => {
    const prologueValues = SUBRULE(prologue);
    const subType = OR<Omit<Query, HandledByBase>>([
      { ALT: () => SUBRULE(selectQuery) },
      { ALT: () => SUBRULE(constructQuery) },
      { ALT: () => SUBRULE(describeQuery) },
      { ALT: () => SUBRULE(askQuery) },
    ]);
    const values = SUBRULE(valuesClause);

    return ACTION(() => (<Query>{
      context: prologueValues,
      ...subType,
      type: 'query',
      ...(values && { values }),
      loc: C.factory.sourceLocation(
        prologueValues.at(0),
        subType,
        values,
      ),
    }));
  },
  gImpl: ({ SUBRULE }) => (ast, { factory: F }) => {
    SUBRULE(prologue, ast.context);
    if (F.isQuerySelect(ast)) {
      SUBRULE(selectQuery, ast);
    } else if (F.isQueryConstruct(ast)) {
      SUBRULE(constructQuery, ast);
    } else if (F.isQueryDescribe(ast)) {
      SUBRULE(describeQuery, ast);
    } else if (F.isQueryAsk(ast)) {
      SUBRULE(askQuery, ast);
    }
    if (ast.values) {
      SUBRULE(inlineData, ast.values);
    }
  },
};

/**
 * [[7]](https://www.w3.org/TR/sparql11-query/#rSelectQuery)
 */
export const selectQuery: SparqlRule<'selectQuery', Omit<QuerySelect, HandledByBase>> = <const> {
  name: 'selectQuery',
  impl: ({ ACTION, SUBRULE }) => (C) => {
    const selectVal = SUBRULE(selectClause);
    const from = SUBRULE(datasetClauseStar);
    const where = SUBRULE(whereClause);
    const modifiers = SUBRULE(solutionModifier);

    return ACTION(() => {
      const ret = {
        subType: 'select',
        where: where.val,
        solutionModifiers: modifiers,
        datasets: from,
        ...selectVal.val,
        loc: C.factory.sourceLocation(
          selectVal,
          where,
          modifiers.group,
          modifiers.having,
          modifiers.order,
          modifiers.limitOffset,
        ),
      } satisfies RuleDefReturn<typeof selectQuery>;
      queryIsGood(ret);
      return ret;
    });
  },
  gImpl: ({ SUBRULE }) => (ast, { factory: F }) => {
    SUBRULE(selectClause, F.wrap({
      variables: ast.variables,
      distinct: ast.distinct,
      reduced: ast.reduced,
    }, F.sourceLocation(...ast.variables)));
    SUBRULE(datasetClauseStar, ast.datasets);
    SUBRULE(whereClause, F.wrap(ast.where, ast.where.loc));
    SUBRULE(solutionModifier, ast.solutionModifiers);
  },
};

/**
 * [[8]](https://www.w3.org/TR/sparql11-query/#rSubSelect)
 */
export const subSelect: SparqlGrammarRule<'subSelect', SubSelect> = <const> {
  name: 'subSelect',
  impl: ({ ACTION, SUBRULE }) => (C) => {
    const selectVal = SUBRULE(selectClause);
    const where = SUBRULE(whereClause);
    const modifiers = SUBRULE(solutionModifier);
    const values = SUBRULE(valuesClause);

    return ACTION(() => C.factory.querySelect({
      where: where.val,
      datasets: C.factory.datasetClauses([], C.factory.sourceLocation()),
      context: [],
      solutionModifiers: modifiers,
      ...selectVal.val,
      ...(values && { values }),
    }, C.factory.sourceLocation(
      selectVal,
      where,
      modifiers.group,
      modifiers.having,
      modifiers.order,
      modifiers.limitOffset,
      values,
    )));
  },
};

/**
 * [[9]](https://www.w3.org/TR/sparql11-query/#rSelectClause)
 */
export const selectClause: SparqlRule<'selectClause', Wrap<Pick<QuerySelect, 'variables' | 'distinct' | 'reduced'>>> = {
  name: 'selectClause',
  impl: ({
    ACTION,
    AT_LEAST_ONE,
    SUBRULE1,
    SUBRULE2,
    CONSUME,
    OPTION,
    OR1,
    OR2,
    OR3,
  }) => (C) => {
    const select = CONSUME(l.select);
    const couldParseAgg = ACTION(() => C.parseMode.has('canParseAggregate') || !C.parseMode.add('canParseAggregate'));

    const distinctAndReduced = OPTION(() => OR1<[boolean, boolean]>([
      { ALT: () => {
        CONSUME(l.distinct);
        return <const> [ true, false ];
      } },
      { ALT: () => {
        CONSUME(l.reduced);
        return <const> [ false, true ];
      } },
    ])) ?? [ false, false ];
    const distRed = ACTION(() => {
      const [ distinct, reduced ] = distinctAndReduced;
      return {
        ...(distinct && { distinct }),
        ...(reduced && { reduced }),
      };
    });

    let last: Localized | IToken;
    const val = OR2<RuleDefReturn<typeof selectClause>['val']>([
      { ALT: () => {
        const star = CONSUME(l.symbols.star);
        return ACTION(() => {
          last = star;
          return { variables: [ C.factory.wildcard(C.factory.sourceLocation(star)) ], ...distRed };
        });
      } },
      { ALT: () => {
        const usedVars: TermVariable[] = [];
        const variables: (TermVariable | PatternBind)[] = [];
        AT_LEAST_ONE(() => OR3([
          { ALT: () => {
            const raw = SUBRULE1(var_);
            ACTION(() => {
              if (usedVars.some(v => v.value === raw.value)) {
                throw new Error(`Variable ${raw.value} used more than once in SELECT clause`);
              }
              usedVars.push(raw);
              variables.push(raw);
              last = raw;
            });
          } },
          { ALT: () => {
            const open = CONSUME(l.symbols.LParen);
            const expr = SUBRULE1(expression);
            CONSUME(l.as);
            const variable = SUBRULE2(var_);
            const close = CONSUME(l.symbols.RParen);
            ACTION(() => {
              last = close;
              if (usedVars.some(v => v.value === variable.value)) {
                throw new Error(`Variable ${variable.value} used more than once in SELECT clause`);
              }
              usedVars.push(variable);
              variables.push(C.factory.patternBind(expr, variable, C.factory.sourceLocation(open, last)));
            });
          } },
        ]));
        return { variables, ...distRed };
      } },
    ]);
    ACTION(() => !couldParseAgg && C.parseMode.delete('canParseAggregate'));
    return ACTION(() => C.factory.wrap(val, C.factory.sourceLocation(select, last)));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    F.printFilter(ast, () => {
      PRINT_WORD('SELECT');
      if (ast.val.distinct) {
        PRINT_WORD('DISTINCT');
      } else if (ast.val.reduced) {
        PRINT_WORD('REDUCED');
      }
    });
    for (const variable of ast.val.variables) {
      if (F.isWildcard(variable)) {
        F.printFilter(ast, () => PRINT_WORD('*'));
      } else if (F.isTerm(variable)) {
        SUBRULE(var_, variable);
      } else {
        F.printFilter(ast, () => PRINT_WORD('('));
        SUBRULE(expression, variable.expression);
        F.printFilter(ast, () => PRINT_WORD('AS'));
        SUBRULE(var_, variable.variable);
        F.printFilter(ast, () => PRINT_WORD(')'));
      }
    }
  },
};

/**
 * [[10]](https://www.w3.org/TR/sparql11-query/#rConstructQuery)
 */
export const constructQuery: SparqlRule<'constructQuery', Omit<QueryConstruct, HandledByBase>> = <const> {
  name: 'constructQuery',
  impl: ({ ACTION, SUBRULE1, SUBRULE2, CONSUME, OR }) => (C) => {
    const construct = CONSUME(l.construct);
    return OR<Omit<QueryConstruct, HandledByBase>>([
      { ALT: () => {
        const template = SUBRULE1(constructTemplate);
        const from = SUBRULE1(datasetClauseStar);
        const where = SUBRULE1(whereClause);
        const modifiers = SUBRULE1(solutionModifier);
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
        } satisfies Omit<QueryConstruct, HandledByBase>));
      } },
      { ALT: () => {
        const from = SUBRULE2(datasetClauseStar);
        CONSUME(l.where);
        // ConstructTemplate is same as '{' TriplesTemplate? '}'
        const template = SUBRULE2(constructTemplate);
        const modifiers = SUBRULE2(solutionModifier);

        return ACTION(() => ({
          subType: 'construct',
          template: template.val,
          datasets: from,
          where: C.factory.patternGroup([ template.val ], C.factory.sourceLocation()),
          solutionModifiers: modifiers,
          loc: C.factory.sourceLocation(
            construct,
            template,
            modifiers.group,
            modifiers.having,
            modifiers.order,
            modifiers.limitOffset,
          ),
        }));
      } },
    ]);
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    F.printFilter(ast, () => PRINT_WORD('CONSTRUCT'));
    if (!F.isSourceLocationNoMaterialize(ast.where.loc)) {
      // You are NOT in second case construct
      F.printFilter(ast, () => PRINT_WORD('{'));
      SUBRULE(triplesBlock, ast.template);
      F.printFilter(ast, () => PRINT_WORD('}'));
    }
    SUBRULE(datasetClauseStar, ast.datasets);
    if (F.isSourceLocationNoMaterialize(ast.where.loc)) {
      SUBRULE(whereClause, F.wrap(F.patternGroup([ ast.template ], ast.template.loc), ast.template.loc));
    } else {
      SUBRULE(whereClause, F.wrap(ast.where, ast.where.loc));
    }
    SUBRULE(solutionModifier, ast.solutionModifiers);
  },
};

/**
 * [[11]](https://www.w3.org/TR/sparql11-query/#rDescribeQuery)
 */
export const describeQuery: SparqlRule<'describeQuery', Omit<QueryDescribe, HandledByBase>> = <const> {
  name: 'describeQuery',
  impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, CONSUME, OPTION, OR }) => (C) => {
    const describe = CONSUME(l.describe);
    const variables = OR<QueryDescribe['variables']>([
      { ALT: () => {
        const variables: (TermVariable | TermIri)[] = [];
        AT_LEAST_ONE(() => {
          variables.push(SUBRULE1(varOrIri));
        });
        return variables;
      } },
      { ALT: () => {
        const star = CONSUME(l.symbols.star);
        return [ ACTION(() => C.factory.wildcard(C.factory.sourceLocation(star))) ];
      } },
    ]);
    const from = SUBRULE1(datasetClauseStar);
    const where = OPTION(() => SUBRULE1(whereClause));
    const modifiers = SUBRULE1(solutionModifier);
    return ACTION(() => ({
      subType: 'describe',
      variables,
      datasets: from,
      ...(where && { where: where.val }),
      solutionModifiers: modifiers,
      loc: C.factory.sourceLocation(
        describe,
        ...variables,
        from,
        where,
        modifiers.group,
        modifiers.having,
        modifiers.order,
        modifiers.limitOffset,
      ),
    }));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    F.printFilter(ast, () => PRINT_WORD('DESCRIBE'));
    if (F.isWildcard(ast.variables[0])) {
      F.printFilter(ast, () => PRINT_WORD('*'));
    } else {
      for (const variable of (<Exclude<QueryDescribe['variables'], [Wildcard]>> ast.variables)) {
        SUBRULE(varOrTerm, variable);
      }
    }
    SUBRULE(datasetClauseStar, ast.datasets);
    if (ast.where) {
      SUBRULE(whereClause, F.wrap(ast.where, ast.loc));
    }
    SUBRULE(solutionModifier, ast.solutionModifiers);
  },
};

/**
 * [[12]](https://www.w3.org/TR/sparql11-query/#rAskQuery)
 */
export const askQuery: SparqlRule<'askQuery', Omit<QueryAsk, HandledByBase>> = <const> {
  name: 'askQuery',
  impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
    const ask = CONSUME(l.ask);
    const from = SUBRULE(datasetClauseStar);
    const where = SUBRULE(whereClause);
    const modifiers = SUBRULE(solutionModifier);

    return ACTION(() => ({
      subType: 'ask',
      datasets: from,
      where: where.val,
      solutionModifiers: modifiers,
      loc: C.factory.sourceLocation(
        ask,
        from,
        where,
        modifiers.group,
        modifiers.having,
        modifiers.order,
        modifiers.limitOffset,
      ),
    } satisfies RuleDefReturn<typeof askQuery>));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    F.printFilter(ast, () => PRINT_WORD('ASK'));
    SUBRULE(datasetClauseStar, ast.datasets);
    SUBRULE(whereClause, F.wrap(ast.where, ast.loc));
    SUBRULE(solutionModifier, ast.solutionModifiers);
  },
};

/**
 * [[28]](https://www.w3.org/TR/sparql11-query/#rValuesClause)
 */
export const valuesClause: SparqlGrammarRule<'valuesClause', PatternValues | undefined> = <const> {
  name: 'valuesClause',
  impl: ({ OPTION, SUBRULE }) => () => OPTION(() => SUBRULE(inlineData)),
};

/**
 * [[73]](https://www.w3.org/TR/sparql11-query/#ConstructTemplate)
 */
export const constructTemplate: SparqlGrammarRule<'constructTemplate', Wrap<PatternBgp>> = <const> {
  name: 'constructTemplate',
  impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
    const open = CONSUME(l.symbols.LCurly);
    const triples = OPTION(() => SUBRULE1(constructTriples));
    const close = CONSUME(l.symbols.RCurly);

    return ACTION(() => C.factory.wrap(
      triples ?? C.factory.patternBgp([], C.factory.sourceLocation()),
      C.factory.sourceLocation(open, close),
    ));
  },
};

/**
 * [[12]](https://www.w3.org/TR/sparql11-query/#rConstructTriples)
 */
export const constructTriples: SparqlGrammarRule<'constructTriples', PatternBgp> = <const> {
  name: 'constructTriples',
  impl: triplesTemplate.impl,
};
