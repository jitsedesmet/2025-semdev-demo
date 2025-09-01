import type * as RDF from '@rdfjs/types';
import type { Path, PathNegatedElt, PathPure, TermIri } from '@traqula/rules-sparql-1-1';
import type { Algebra } from '../index';
import type { AlgebraIndir, FlattenedTriple } from './core';
import { isTerm, types } from './core';
import { generateFreshVar, translateNamed } from './general';

/**
 * 18.2.2.3 Translate Property Path Expressions
 * 18.2.2.4 Translate Property Path Patterns
 */
export const translatePath:
AlgebraIndir<'translatePath', (Algebra.Path | Algebra.Pattern)[], [FlattenedTriple & { predicate: PathPure }]> = {
  name: 'translatePath',
  fun: ({ SUBRULE }) => (_, triple) => {
    const sub = triple.subject;
    const pred = SUBRULE(translatePathPredicate, triple.predicate);
    const obj = triple.object;

    return SUBRULE(simplifyPath, sub, pred, obj);
  },
};

/**
 * 18.2.2.3 Translate Property Path Expressions
 */
export const translatePathPredicate:
AlgebraIndir<'translatePathPredicate', Algebra.PropertyPathSymbol, [RDF.NamedNode | Path]> = {
  name: 'translatePathPredicate',
  fun: ({ SUBRULE }) => (c, predicate) => {
    const F = c.astFactory;
    if (F.isTerm(predicate)) {
      return SUBRULE(translatePathPredicate, SUBRULE(translateNamed, predicate));
    }
    // Iri -> link(iri)
    if (isTerm(predicate)) {
      return c.factory.createLink(predicate);
    }

    // ^path -> inv(path)
    if (predicate.subType === '^') {
      return c.factory.createInv(SUBRULE(translatePathPredicate, <RDF.NamedNode | PathPure> predicate.items[0]));
    }

    if (predicate.subType === '!') {
      // Negation is either over a single predicate or a list of disjuncted properties - that can only have modifier '^'
      const normals: TermIri[] = [];
      const inverted: TermIri[] = [];
      // Either the item of this one is an `|`, `^` or `iri`
      const contained = predicate.items[0];
      let items: (TermIri | PathNegatedElt)[];
      if (F.isPathPure(contained) && contained.subType === '|') {
        items = contained.items;
      } else {
        items = [ contained ];
      }

      for (const item of items) {
        if (F.isTerm(item)) {
          normals.push(item);
        } else if (item.subType === '^') {
          inverted.push(item.items[0]);
        } else {
          throw new Error(`Unexpected item: ${JSON.stringify(item)}`);
        }
      }

      // NPS elements do not have the LINK function
      const normalElement = c.factory.createNps(normals.map(x => SUBRULE(translateNamed, x)));
      const invertedElement = c.factory.createInv(c.factory.createNps(inverted.map(x => SUBRULE(translateNamed, x))));

      // !(:iri1|...|:irin) -> NPS({:iri1 ... :irin})
      if (inverted.length === 0) {
        return normalElement;
      }
      // !(^:iri1|...|^:irin) -> inv(NPS({:iri1 ... :irin}))
      if (normals.length === 0) {
        return invertedElement;
      }
      // !(:iri1|...|:irii|^:irii+1|...|^:irim -> alt(NPS({:iri1 ...:irii}), inv(NPS({:irii+1, ..., :irim})) )
      return c.factory.createAlt([ normalElement, invertedElement ]);
    }

    // Path1 / path -> seq(path1, path2)
    if (predicate.subType === '/') {
      return c.factory.createSeq(predicate.items.map(item => SUBRULE(translatePathPredicate, <PathPure> item)));
    }
    // Path1 | path2 -> alt(path1, path2)
    if (predicate.subType === '|') {
      return c.factory.createAlt(predicate.items.map(item => SUBRULE(translatePathPredicate, <PathPure> item)));
    }
    // Path* -> ZeroOrMorePath(path)
    if (predicate.subType === '*') {
      return c.factory.createZeroOrMorePath(SUBRULE(translatePathPredicate, <PathPure> predicate.items[0]));
    }
    // Path+ -> OneOrMorePath(path)
    if (predicate.subType === '+') {
      return c.factory.createOneOrMorePath(SUBRULE(translatePathPredicate, <PathPure> predicate.items[0]));
    }
    // Path? -> ZeroOrOnePath(path)
    if (predicate.subType === '?') {
      return c.factory.createZeroOrOnePath(SUBRULE(translatePathPredicate, <PathPure> predicate.items[0]));
    }

    throw new Error(`Unable to translate path expression ${JSON.stringify(predicate)}`);
  },
};

/**
 * 18.2.2.4 Translate Property Path Patterns
 */
export const simplifyPath:
AlgebraIndir<'simplifyPath', (Algebra.Pattern | Algebra.Path)[], [RDF.Term, Algebra.PropertyPathSymbol, RDF.Term]> = {
  name: 'simplifyPath',
  fun: ({ SUBRULE }) => (c, subject, predicate, object) => {
    // X link(iri) Y -> X iri Y
    if (predicate.type === types.LINK) {
      return [ c.factory.createPattern(subject, predicate.iri, object) ];
    }

    // X inv(iri) Y -> Y iri X
    if (predicate.type === types.INV) {
      return SUBRULE(simplifyPath, <RDF.Quad_Subject> object, predicate.path, subject);
    }

    // X seq(P, Q) Y -> X P ?V . ?V Q P
    if (predicate.type === types.SEQ) {
      let iter = subject;
      const result: (Algebra.Pattern | Algebra.Path)[] = [];
      for (const pathOfSeq of predicate.input.slice(0, -1)) {
        const joinVar = SUBRULE(generateFreshVar);
        result.push(...SUBRULE(simplifyPath, iter, pathOfSeq, joinVar));
        iter = joinVar;
      }
      result.push(...SUBRULE(simplifyPath, iter, predicate.input.at(-1)!, object));
      return result;
    }

    // X P Y -> Path(X, P, Y)
    return [ c.factory.createPath(subject, predicate, object) ];
  },
};
