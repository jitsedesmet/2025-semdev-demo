import * as l from '../lexer';
import type { SparqlRuleDef } from '@traqula/core';
import { builtInCall, canParseAggregate } from './builtIn';
import { brackettedExpression, expression } from './expression';
import { var_ } from './general';
import type { Expression, Grouping, Ordering, SelectQuery } from '../Sparql11types';
import { constraint, functionCall } from './whereClause';

/**
 * [[18]](https://www.w3.org/TR/sparql11-query/#rSolutionModifier)
 */
export type ISolutionModifier = Pick<SelectQuery, 'group' | 'having' | 'order' | 'limit' | 'offset'>;
export const solutionModifier: SparqlRuleDef<'solutionModifier', ISolutionModifier> = <const> {
  name: 'solutionModifier',
  impl: ({ ACTION, SUBRULE, OPTION1, OPTION2, OPTION3, OPTION4 }) => () => {
    const group = OPTION1(() => SUBRULE(groupClause, undefined));
    const having = OPTION2(() => SUBRULE(havingClause, undefined));
    const order = OPTION3(() => SUBRULE(orderClause, undefined));
    const limitAndOffset = OPTION4(() => SUBRULE(limitOffsetClauses, undefined));

    return ACTION(() => ({
      ...limitAndOffset,
      ...(group && { group }),
      ...(having && { having }),
      ...(order && { order }),
    }));
  },
};

/**
 * [[19]](https://www.w3.org/TR/sparql11-query/#rGroupClause)
 */
export const groupClause: SparqlRuleDef<'groupClause', Grouping[]> = <const> {
  name: 'groupClause',
  impl: ({ AT_LEAST_ONE, SUBRULE, CONSUME }) => () => {
    const groupings: Grouping[] = [];
    CONSUME(l.groupBy);
    AT_LEAST_ONE(() => {
      groupings.push(SUBRULE(groupCondition, undefined));
    });

    return groupings;
  },
};

/**
 * [[20]](https://www.w3.org/TR/sparql11-query/#rGroupCondition)
 */
export const groupCondition: SparqlRuleDef<'groupCondition', Grouping> = <const> {
  name: 'groupCondition',
  impl: ({ SUBRULE, CONSUME, SUBRULE1, SUBRULE2, OPTION, OR }) => () => OR<Grouping>([
    { ALT: () => {
      const expression = SUBRULE(builtInCall, undefined);
      return {
        expression,
      };
    } },
    { ALT: () => {
      const expression = SUBRULE(functionCall, undefined);
      return {
        expression,
      };
    } },
    {
      ALT: () => {
        CONSUME(l.symbols.LParen);
        const expressionValue = SUBRULE(expression, undefined);
        const variable = OPTION(() => {
          CONSUME(l.as);
          return SUBRULE1(var_, undefined);
        });
        CONSUME(l.symbols.RParen);

        return {
          expression: expressionValue,
          variable,
        };
      },
    },
    { ALT: () => {
      const expression = SUBRULE2(var_, undefined);
      return {
        expression,
      };
    } },
  ]),
};

/**
 * [[21]](https://www.w3.org/TR/sparql11-query/#rHavingClause)
 */
export const havingClause: SparqlRuleDef<'havingClause', Expression[]> = <const> {
  name: 'havingClause',
  impl: ({ ACTION, AT_LEAST_ONE, SUBRULE, CONSUME }) => (C) => {
    const expressions: Expression[] = [];

    CONSUME(l.having);
    const couldParseAgg = ACTION(() =>
      C.parseMode.has(canParseAggregate) || !C.parseMode.add(canParseAggregate));
    AT_LEAST_ONE(() => {
      expressions.push(SUBRULE(havingCondition, undefined));
    });
    ACTION(() => !couldParseAgg && C.parseMode.delete(canParseAggregate));

    return expressions;
  },
};

/**
 * [[22]](https://www.w3.org/TR/sparql11-query/#rHavingCondition)
 */
export const havingCondition: SparqlRuleDef<'havingCondition', Expression> = <const> {
  name: 'havingCondition',
  impl: ({ SUBRULE }) => () => SUBRULE(constraint, undefined),
};

/**
 * [[23]](https://www.w3.org/TR/sparql11-query/#rOrderClause)
 */
export const orderClause: SparqlRuleDef<'orderClause', Ordering[]> = <const> {
  name: 'orderClause',
  impl: ({ ACTION, AT_LEAST_ONE, SUBRULE, CONSUME }) => (C) => {
    const orderings: Ordering[] = [];

    CONSUME(l.order);
    const couldParseAgg = ACTION(() =>
      C.parseMode.has(canParseAggregate) || !C.parseMode.add(canParseAggregate));
    AT_LEAST_ONE(() => {
      orderings.push(SUBRULE(orderCondition, undefined));
    });
    ACTION(() => !couldParseAgg && C.parseMode.delete(canParseAggregate));

    return orderings;
  },
};

/**
 * [[24]](https://www.w3.org/TR/sparql11-query/#rOrderCondition)
 */
export const orderCondition: SparqlRuleDef<'orderCondition', Ordering> = <const> {
  name: 'orderCondition',
  impl: ({ SUBRULE, CONSUME, OR1, OR2 }) => () => OR1([
    {
      ALT: () => {
        const descending = OR2([
          { ALT: () => {
            CONSUME(l.orderAsc);
            return false;
          } },
          { ALT: () => {
            CONSUME(l.orderDesc);
            return true;
          } },
        ]);
        const expr = SUBRULE(brackettedExpression, undefined);

        return {
          expression: expr,
          descending,
        };
      },
    },
    { ALT: () => {
      const expr = SUBRULE(constraint, undefined);
      return {
        expression: expr,
      };
    } },
    { ALT: () => {
      const expr = SUBRULE(var_, undefined);
      return {
        expression: expr,
      };
    } },
  ]),
};

/**
 * Parses limit and or offset in any order.
 * [[25]](https://www.w3.org/TR/sparql11-query/#rLimitOffsetClauses)
 */
export const limitOffsetClauses: SparqlRuleDef<'limitOffsetClauses', Pick<SelectQuery, 'limit' | 'offset'>> = <const> {
  name: 'limitOffsetClauses',
  impl: ({ SUBRULE1, SUBRULE2, OPTION1, OPTION2, OR }) => () => OR<Pick<SelectQuery, 'limit' | 'offset'>>([
    {
      ALT: () => {
        const limit = SUBRULE1(limitClause, undefined);
        const offset = OPTION1(() => SUBRULE1(offsetClause, undefined));
        return {
          limit,
          offset,
        };
      },
    },
    {
      ALT: () => {
        const offset = SUBRULE2(offsetClause, undefined);
        const limit = OPTION2(() => SUBRULE2(limitClause, undefined));
        return {
          limit,
          offset,
        };
      },
    },
  ]),
};

/**
 * [[26]](https://www.w3.org/TR/sparql11-query/#rLimitClause)
 */
export const limitClause: SparqlRuleDef<'limitClause', number> = <const> {
  name: 'limitClause',
  impl: ({ CONSUME }) => () => {
    CONSUME(l.limit);
    return Number.parseInt(CONSUME(l.terminals.integer).image, 10);
  },
};

/**
 * [[27]](https://www.w3.org/TR/sparql11-query/#rWhereClause)
 */
export const offsetClause: SparqlRuleDef<'offsetClause', number> = <const> {
  name: <const> 'offsetClause',
  impl: ({ CONSUME }) => () => {
    CONSUME(l.offset);
    return Number.parseInt(CONSUME(l.terminals.integer).image, 10);
  },
};
