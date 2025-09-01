import type { Localized, RuleDefReturn, Wrap } from '@traqula/core';
import { unCapitalize } from '@traqula/core';
import type { IToken, TokenType } from 'chevrotain';
import * as l from '../lexer/index';
import type { SparqlGrammarRule, SparqlRule } from '../sparql11HelperTypes';
import type {
  GraphQuads,
  GraphRef,
  GraphRefDefault,
  GraphRefSpecific,
  Quads,
  Update,
  UpdateOperation,
  UpdateOperationAdd,
  UpdateOperationClear,
  UpdateOperationCopy,
  UpdateOperationCreate,
  UpdateOperationDeleteData,
  UpdateOperationDeleteWhere,
  UpdateOperationDrop,
  UpdateOperationInsertData,
  UpdateOperationLoad,
  UpdateOperationModify,
  UpdateOperationMove,
} from '../Sparql11types';
import { updateNoReuseBlankNodeLabels } from '../validation/validators';
import { usingClauseStar } from './dataSetClause';
import { prologue, varOrIri, varOrTerm } from './general';
import { iri } from './literals';
import { triplesBlock, triplesTemplate } from './tripleBlock';
import { groupGraphPattern } from './whereClause';

/**
 * [[3]](https://www.w3.org/TR/sparql11-query/#rUpdateUnit)
 */
export const updateUnit: SparqlGrammarRule<'updateUnit', Update> = <const> {
  name: 'updateUnit',
  impl: ({ SUBRULE }) => () => SUBRULE(update),
};

/**
 * [[29]](https://www.w3.org/TR/sparql11-query/#rUpdate)
 */
export const update: SparqlRule<'update', Update> = <const> {
  name: 'update',
  impl: ({ ACTION, SUBRULE, SUBRULE1, SUBRULE2, CONSUME, OPTION1, MANY }) => (C) => {
    // Override prologueValues on new reads of prologue and sink them into updates later
    const updates: Update['updates'] = [];
    const prologueValues = SUBRULE1(prologue);
    updates.push({ context: prologueValues });

    let parsedSemi = true;
    MANY({
      GATE: () => parsedSemi,
      DEF: () => {
        parsedSemi = false;
        updates.at(-1)!.operation = SUBRULE(update1);

        OPTION1(() => {
          CONSUME(l.symbols.semi);

          parsedSemi = true;
          const innerPrologue = SUBRULE2(prologue);
          updates.push({ context: innerPrologue });
        });
      },
    });
    return ACTION(() => {
      const update = {
        type: 'update',
        updates,
        loc: C.factory.sourceLocation(
          ...updates[0].context,
          updates[0].operation,
          ...updates.at(-1)!.context,
          updates.at(-1)?.operation,
        ),
      } satisfies Update;
      updateNoReuseBlankNodeLabels(update);
      return update;
    });
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    for (const update of ast.updates) {
      SUBRULE(prologue, update.context);
      if (update.operation) {
        SUBRULE(update1, update.operation);
        F.printFilter(ast, () => PRINT_WORD(' ;\n'));
      }
    }
  },
};

/**
 * [[30]](https://www.w3.org/TR/sparql11-query/#rUpdate1)
 */
export const update1: SparqlRule<'update1', UpdateOperation> = <const> {
  name: 'update1',
  impl: ({ SUBRULE, OR }) => () => OR<UpdateOperation>([
    { ALT: () => SUBRULE(load) },
    { ALT: () => SUBRULE(clear) },
    { ALT: () => SUBRULE(drop) },
    { ALT: () => SUBRULE(add) },
    { ALT: () => SUBRULE(move) },
    { ALT: () => SUBRULE(copy) },
    { ALT: () => SUBRULE(create) },
    { ALT: () => SUBRULE(insertData) },
    { ALT: () => SUBRULE(deleteData) },
    { ALT: () => SUBRULE(deleteWhere) },
    { ALT: () => SUBRULE(modify) },
  ]),
  gImpl: ({ SUBRULE }) => (ast) => {
    switch (ast.subType) {
      case ('load'):
        SUBRULE(load, ast);
        break;
      case ('clear'):
        SUBRULE(clear, ast);
        break;
      case ('drop'):
        SUBRULE(drop, ast);
        break;
      case ('add'):
        SUBRULE(add, ast);
        break;
      case ('move'):
        SUBRULE(move, ast);
        break;
      case ('copy'):
        SUBRULE(copy, ast);
        break;
      case ('create'):
        SUBRULE(create, ast);
        break;
      case ('insertdata'):
        SUBRULE(insertData, ast);
        break;
      case ('deletedata'):
        SUBRULE(deleteData, ast);
        break;
      case ('deletewhere'):
        SUBRULE(deleteWhere, ast);
        break;
      case ('modify'):
        SUBRULE(modify, ast);
        break;
    }
  },
};

/**
 * [[31]](https://www.w3.org/TR/sparql11-query/#rLoad)
 */
export const load: SparqlRule<'load', UpdateOperationLoad> = <const> {
  name: 'load',
  impl: ({ ACTION, SUBRULE1, CONSUME, OPTION1, OPTION2 }) => (C) => {
    const loadToken = CONSUME(l.load);
    const silent = OPTION1(() => CONSUME(l.silent));
    const source = SUBRULE1(iri);
    const destination = OPTION2(() => {
      CONSUME(l.loadInto);
      return SUBRULE1(graphRef);
    });
    return ACTION(() => C.factory.updateOperationLoad(
      C.factory.sourceLocation(loadToken, source, destination),
      source,
      Boolean(silent),
      destination,
    ));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    F.printFilter(ast, () => {
      PRINT_WORD('LOAD');
      if (ast.silent) {
        PRINT_WORD('SILENT');
      }
    });
    SUBRULE(iri, ast.source);
    if (ast.destination) {
      F.printFilter(ast, () => PRINT_WORD('INTO'));
      SUBRULE(graphRefAll, ast.destination);
    }
  },
};

function clearOrDrop<T extends 'Clear' | 'Drop'>(operation: TokenType & { name: T }):
SparqlRule<Uncapitalize<T>, UpdateOperationClear | UpdateOperationDrop> {
  return {
    name: unCapitalize(operation.name),
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const opToken = CONSUME(operation);
      const silent = OPTION(() => CONSUME(l.silent));
      const destination = SUBRULE1(graphRefAll);
      return ACTION(() => C.factory.updateOperationClearDrop(
        unCapitalize(operation.name),
        Boolean(silent),
        destination,
        C.factory.sourceLocation(opToken, destination),
      ));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
      F.printFilter(ast, () => {
        PRINT_WORD(operation.name.toUpperCase());
        if (ast.silent) {
          PRINT_WORD('SILENT');
        }
      });
      SUBRULE(graphRefAll, ast.destination);
    },
  };
}

/**
 * [[32]](https://www.w3.org/TR/sparql11-query/#rClear)
 */
export const clear = clearOrDrop(l.clear);

/**
 * [[33]](https://www.w3.org/TR/sparql11-query/#rDrop)
 */
export const drop = clearOrDrop(l.drop);

/**
 * [[34]](https://www.w3.org/TR/sparql11-query/#rCreate)
 */
export const create: SparqlRule<'create', UpdateOperationCreate> = <const> {
  name: 'create',
  impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
    const createToken = CONSUME(l.create);
    const silent = OPTION(() => CONSUME(l.silent));
    const destination = SUBRULE1(graphRef);

    return ACTION(() => C.factory.updateOperationCreate(
      destination,
      Boolean(silent),
      C.factory.sourceLocation(createToken, destination),
    ));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    F.printFilter(ast, () => {
      PRINT_WORD('CREATE');
      if (ast.silent) {
        PRINT_WORD('SILENT');
      }
    });
    SUBRULE(graphRefAll, ast.destination);
  },
};

function copyMoveAddOperation<T extends 'Copy' | 'Move' | 'Add'>(operation: TokenType & { name: T }):
SparqlRule<Uncapitalize<T>, UpdateOperationAdd | UpdateOperationMove | UpdateOperationCopy> {
  return {
    name: unCapitalize(operation.name),
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OPTION }) => (C) => {
      const op = CONSUME(operation);
      const silent = OPTION(() => CONSUME(l.silent));
      const source = SUBRULE1(graphOrDefault);
      CONSUME(l.to);
      const destination = SUBRULE2(graphOrDefault);

      return ACTION(() => C.factory.updateOperationAddMoveCopy(
        unCapitalize(operation.name),
        source,
        destination,
        Boolean(silent),
        C.factory.sourceLocation(op, destination),
      ));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
      F.printFilter(ast, () => {
        PRINT_WORD(operation.name.toUpperCase());
        if (ast.silent) {
          PRINT_WORD('SILENT');
        }
      });
      SUBRULE(graphRefAll, ast.source);
      F.printFilter(ast, () => PRINT_WORD('TO'));
      SUBRULE(graphRefAll, ast.destination);
    },
  };
}

/**
 * [[35]](https://www.w3.org/TR/sparql11-query/#rAdd)
 */
export const add = copyMoveAddOperation(l.add);

/**
 * [[36]](https://www.w3.org/TR/sparql11-query/#rMove)
 */
export const move = copyMoveAddOperation(l.move);

/**
 * [[37]](https://www.w3.org/TR/sparql11-query/#rCopy)
 */
export const copy = copyMoveAddOperation(l.copy);

/**
 * [[48]](https://www.w3.org/TR/sparql11-query/#rQuadPattern)
 */
export const quadPattern: SparqlGrammarRule<'quadPattern', Wrap<Quads[]>> = <const> {
  name: 'quadPattern',
  impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
    const open = CONSUME(l.symbols.LCurly);
    const val = SUBRULE1(quads);
    const close = CONSUME(l.symbols.RCurly);
    return ACTION(() => C.factory.wrap(val.val, C.factory.sourceLocation(open, close)));
  },
};

/**
 * [[49]](https://www.w3.org/TR/sparql11-query/#rQuadData)
 */
export const quadData: SparqlGrammarRule<'quadData', Wrap<Quads[]>> = <const> {
  name: 'quadData',
  impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
    const open = CONSUME(l.symbols.LCurly);

    const couldParseVars = ACTION(() => C.parseMode.delete('canParseVars'));
    const val = SUBRULE1(quads);
    ACTION(() => couldParseVars && C.parseMode.add('canParseVars'));

    const close = CONSUME(l.symbols.RCurly);
    return ACTION(() => C.factory.wrap(val.val, C.factory.sourceLocation(open, close)));
  },
};

function insertDeleteDelWhere<T extends string>(
  name: T,
  subType: 'insertdata' | 'deletedata' | 'deletewhere',
  cons1: TokenType,
  cons2: TokenType,
  dataRule: SparqlGrammarRule<any, Wrap<Quads[]>>,
): SparqlRule<T, UpdateOperationInsertData | UpdateOperationDeleteData | UpdateOperationDeleteWhere> {
  return {
    name,
    impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
      const insDelToken = CONSUME(cons1);
      CONSUME(cons2);

      let couldCreateBlankNodes = true;
      if (name !== 'insertData') {
        couldCreateBlankNodes = ACTION(() => C.parseMode.delete('canCreateBlankNodes'));
      }
      const data = SUBRULE1(dataRule);
      if (name !== 'insertData') {
        ACTION(() => couldCreateBlankNodes && C.parseMode.add('canCreateBlankNodes'));
      }

      return ACTION(() =>
        C.factory.updateOperationInsDelDataWhere(subType, data.val, C.factory.sourceLocation(insDelToken, data)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
      F.printFilter(ast, () => PRINT_WORD(
        subType === 'insertdata' ?
          'INSERT DATA' :
            (subType === 'deletedata' ? 'DELETE DATA' : 'DELETE WHERE'),
        '{',
      ));
      SUBRULE(quads, F.wrap(ast.data, ast.loc));
      F.printFilter(ast, () => PRINT_WORD('}'));
    },
  };
}

/**
 * [[38]](https://www.w3.org/TR/sparql11-query/#rInsertData)
 */
export const insertData = insertDeleteDelWhere('insertData', 'insertdata', l.insertClause, l.dataClause, quadData);

/**
 * [[39]](https://www.w3.org/TR/sparql11-query/#rDeleteData)
 */
export const deleteData = insertDeleteDelWhere('deleteData', 'deletedata', l.deleteClause, l.dataClause, quadData);

/**
 * [[40]](https://www.w3.org/TR/sparql11-query/#rDeleteWhere)
 */
export const deleteWhere = insertDeleteDelWhere('deleteWhere', 'deletewhere', l.deleteClause, l.where, quadPattern);

/**
 * [[41]](https://www.w3.org/TR/sparql11-query/#rModify)
 */
export const modify: SparqlRule<'modify', UpdateOperationModify> = <const> {
  name: 'modify',
  impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OR }) => (C) => {
    const graph = OPTION1(() => {
      const withToken = CONSUME(l.modifyWith);
      const graph = SUBRULE1(iri);
      return { withToken, graph };
    });
    const { insert, del } = OR<{
      del: RuleDefReturn<typeof deleteClause> | undefined;
      insert: RuleDefReturn<typeof insertClause> | undefined;
    }>([
      { ALT: () => {
        const del = SUBRULE1(deleteClause);
        const insert = OPTION2(() => SUBRULE1(insertClause));
        return { del, insert };
      } },
      { ALT: () => {
        const insert = SUBRULE2(insertClause);
        return { insert, del: undefined };
      } },
    ]);
    const using = SUBRULE1(usingClauseStar);
    CONSUME(l.where);
    const where = SUBRULE1(groupGraphPattern);

    return ACTION(() => C.factory.updateOperationModify(
      C.factory.sourceLocation(graph?.withToken, del, insert, where),
      insert?.val ?? [],
      del?.val ?? [],
      where,
      using,
      graph?.graph,
    ));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    if (ast.graph) {
      F.printFilter(ast, () => PRINT_WORD('WITH'));
      SUBRULE(iri, ast.graph);
    }
    if (ast.delete.length > 0) {
      F.printFilter(ast, () => PRINT_WORD('DELETE', '{'));
      SUBRULE(quads, F.wrap(ast.delete, ast.loc));
      F.printFilter(ast, () => PRINT_WORD('}'));
    }
    if (ast.insert.length > 0) {
      F.printFilter(ast, () => PRINT_WORD('INSERT', '{'));
      SUBRULE(quads, F.wrap(ast.insert, ast.loc));
      F.printFilter(ast, () => PRINT_WORD('}'));
    }
    SUBRULE(usingClauseStar, ast.from);
    F.printFilter(ast, () => PRINT_WORD('WHERE'));
    SUBRULE(groupGraphPattern, ast.where);
  },
};

/**
 * [[42]](https://www.w3.org/TR/sparql11-query/#rDeleteClause)
 */
export const deleteClause: SparqlGrammarRule<'deleteClause', Wrap<Quads[]>> = <const> {
  name: 'deleteClause',
  impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
    const delToken = CONSUME(l.deleteClause);
    const couldCreateBlankNodes = ACTION(() => C.parseMode.delete('canCreateBlankNodes'));
    const del = SUBRULE(quadPattern);
    ACTION(() => couldCreateBlankNodes && C.parseMode.add('canCreateBlankNodes'));

    return ACTION(() => C.factory.wrap(del.val, C.factory.sourceLocation(delToken, del)));
  },
};

/**
 * [[43]](https://www.w3.org/TR/sparql11-query/#rInsertClause)
 */
export const insertClause: SparqlGrammarRule<'insertClause', Wrap<Quads[]>> = <const> {
  name: 'insertClause',
  impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
    const insertToken = CONSUME(l.insertClause);
    const insert = SUBRULE(quadPattern);

    return ACTION(() => C.factory.wrap(insert.val, C.factory.sourceLocation(insertToken, insert)));
  },
};

/**
 * [[45]](https://www.w3.org/TR/sparql11-query/#rGraphOrDefault)
 */
export const graphOrDefault: SparqlGrammarRule<'graphOrDefault', GraphRefDefault | GraphRefSpecific> = <const> {
  name: 'graphOrDefault',
  impl: ({ ACTION, SUBRULE1, CONSUME, OPTION, OR }) => C => OR<GraphRefDefault | GraphRefSpecific>([
    { ALT: () => {
      const def = CONSUME(l.graph.default_);
      return ACTION(() => C.factory.graphRefDefault(C.factory.sourceLocation(def)));
    } },
    { ALT: () => {
      const graph = OPTION(() => CONSUME(l.graph.graph));
      const name = SUBRULE1(iri);
      return ACTION(() =>
        C.factory.graphRefSpecific(name, C.factory.sourceLocation(graph, name)));
    } },
  ]),
};

/**
 * [[46]](https://www.w3.org/TR/sparql11-query/#rGraphRef)
 */
export const graphRef: SparqlRule<'graphRef', GraphRefSpecific> = <const> {
  name: 'graphRef',
  impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
    const graph = CONSUME(l.graph.graph);
    const val = SUBRULE(iri);
    return ACTION(() => C.factory.graphRefSpecific(val, C.factory.sourceLocation(graph, val)));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    F.printFilter(ast, () => PRINT_WORD('GRAPH'));
    SUBRULE(iri, ast.graph);
  },
};

/**
 * [[47]](https://www.w3.org/TR/sparql11-query/#rGraphRefAll)
 */
export const graphRefAll: SparqlRule<'graphRefAll', GraphRef> = <const> {
  name: 'graphRefAll',
  impl: ({ ACTION, SUBRULE, CONSUME, OR }) => C => OR<GraphRef>([
    { ALT: () => SUBRULE(graphRef) },
    { ALT: () => {
      const def = CONSUME(l.graph.default_);
      return ACTION(() => C.factory.graphRefDefault(C.factory.sourceLocation(def)));
    } },
    { ALT: () => {
      const named = CONSUME(l.graph.named);
      return ACTION(() => C.factory.graphRefNamed(C.factory.sourceLocation(named)));
    } },
    { ALT: () => {
      const graphAll = CONSUME(l.graph.graphAll);
      return ACTION(() => C.factory.graphRefAll(C.factory.sourceLocation(graphAll)));
    } },
  ]),
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    if (F.isGraphRefSpecific(ast)) {
      SUBRULE(graphRef, ast);
    } else if (F.isGraphRefDefault(ast)) {
      F.printFilter(ast, () => PRINT_WORD('DEFAULT'));
    } else if (F.isGraphRefNamed(ast)) {
      F.printFilter(ast, () => PRINT_WORD('NAMED'));
    } else if (F.isGraphRefAll(ast)) {
      F.printFilter(ast, () => PRINT_WORD('ALL'));
    }
  },
};

/**
 * [[50]](https://www.w3.org/TR/sparql11-query/#rQuads)
 */
export const quads: SparqlRule<'quads', Wrap<Quads[]>> = <const> {
  name: 'quads',
  impl: ({ ACTION, SUBRULE, CONSUME, MANY, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OPTION3 }) => (C) => {
    const quads: Quads[] = [];
    let last: IToken | Localized | undefined;

    OPTION1(() => {
      const triples = SUBRULE1(triplesTemplate);
      last = triples;
      ACTION(() => quads.push(triples));
    });

    MANY(() => {
      const notTriples = SUBRULE(quadsNotTriples);
      last = notTriples;
      quads.push(notTriples);
      OPTION2(() => {
        const dotToken = CONSUME(l.symbols.dot);
        last = dotToken;
        return dotToken;
      });
      OPTION3(() => {
        const triples = SUBRULE2(triplesTemplate);
        last = triples;
        ACTION(() => quads.push(triples));
      });
    });

    return ACTION(() => C.factory.wrap(quads, C.factory.sourceLocation(quads.at(0), last)));
  },
  gImpl: ({ SUBRULE }) => (ast, { factory: F }) => {
    for (const quad of ast.val) {
      if (F.isPattern(quad)) {
        SUBRULE(triplesBlock, quad);
      } else {
        SUBRULE(quadsNotTriples, quad);
      }
    }
  },
};

/**
 * [[51]](https://www.w3.org/TR/sparql11-query/#rQuadsNotTriples)
 */
export const quadsNotTriples: SparqlRule<'quadsNotTriples', GraphQuads> = <const> {
  name: 'quadsNotTriples',
  impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
    const graph = CONSUME(l.graph.graph);
    const name = SUBRULE1(varOrIri);
    CONSUME(l.symbols.LCurly);
    const triples = OPTION(() => SUBRULE1(triplesTemplate));
    const close = CONSUME(l.symbols.RCurly);

    return ACTION(() => C.factory.graphQuads(
      name,
      triples ?? C.factory.patternBgp([], C.factory.sourceLocationNoMaterialize()),
      C.factory.sourceLocation(graph, close),
    ));
  },
  gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { factory: F }) => {
    F.printFilter(ast, () => PRINT_WORD('GRAPH'));
    SUBRULE(varOrTerm, ast.graph);
    F.printFilter(ast, () => PRINT_WORD('{'));
    SUBRULE(triplesBlock, ast.triples);
    F.printFilter(ast, () => PRINT_WORD('}'));
  },
};
