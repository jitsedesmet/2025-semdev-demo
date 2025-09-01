import type { Wrap } from '@traqula/core';
import { lex as l, gram as g } from '@traqula/rules-sparql-1-1';
import type { SparqlGrammarRule } from '@traqula/rules-sparql-1-1';
import { option, qName } from './lexer';
import type { Option, TripleNesting } from './types';

export const tripleOption: SparqlGrammarRule<'tripleOption', Option> = {
  name: 'tripleOption',
  impl: ({ CONSUME, SUBRULE }) => () => {
    const name = CONSUME(qName);
    const expression = SUBRULE(g.expression);
    return {
      name: name.image.toLowerCase(),
      expression,
    } satisfies Option;
  },
};

export const tripleOptions: SparqlGrammarRule<'tripleOptions', Wrap<Option[]>> = {
  name: 'tripleOptions',
  impl: ({ ACTION, SUBRULE1, CONSUME, AT_LEAST_ONE_SEP }) => (C) => {
    const optionToken = CONSUME(option);
    CONSUME(l.symbols.LParen);

    const options: Option[] = [];

    AT_LEAST_ONE_SEP({
      SEP: l.symbols.comma,
      DEF: () => {
        const option = SUBRULE1(tripleOption);
        options.push(option);
      },
    });

    const close = CONSUME(l.symbols.RParen);
    return ACTION(() => C.factory.wrap(options, C.factory.sourceLocation(optionToken, close)));
  },
};

/**
 * [DOCS (32)](https://docs.openlinksw.com/virtuoso/rdfsparql/) do not seem right, as they do not enable
 * the [score example](https://docs.openlinksw.com/virtuoso/sparqlextensions/#rdfsparqlrulescoreexmp)
 */
function objectListImpl<T extends string>(name: T, allowPaths: boolean):
SparqlGrammarRule<T, TripleNesting[], [TripleNesting['subject'], TripleNesting['predicate']]> {
  return <const> {
    name,
    impl: ({ ACTION, SUBRULE, AT_LEAST_ONE_SEP, OPTION }) => (_, subj, pred) => {
      const objects: TripleNesting[] = [];
      AT_LEAST_ONE_SEP({
        SEP: l.symbols.comma,
        DEF: () => {
          const objectTriple = SUBRULE(allowPaths ? g.objectPath : g.object, subj, pred);
          const options = OPTION(() => SUBRULE(tripleOptions));
          ACTION(() => {
            const casted = <TripleNesting> objectTriple;
            if (options !== undefined) {
              casted.options = options?.val ?? [];
            }
            objects.push(casted);
          });
        },
      });
      return objects;
    },
  };
}

export const objectList = objectListImpl('objectList', false);
export const objectListPath = objectListImpl('objectListPath', true);
