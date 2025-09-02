<p align="center">
    <img alt="Traqula logo" width="70%" style="border-radius: 20px" src="/assets/white-on-red/logo-white-on-red-lettered-social.png">
</p>

<p align="center">
  <strong>A query language transpiler framework for JavaScript</strong>
</p>

# Traqula parser engine for SPARQL 1.1 + Construct Quad

Traqula Sparql 1.1 Construct Quad is a [SPARQL 1.1](https://www.w3.org/TR/sparql11-query/#grammar) query parser that also parses
[construct QUAD queries](https://jena.apache.org/documentation/query/construct-quad.html#Grammar), build for TypeScript.
Simple grammar extension of [Traqula engine-sparql-1-1](https://github.com/comunica/traqula/tree/main/engines/parser-sparql-1-1)

## Installation

```bash
npm install @traqula/parser-sparql-1-1-construct-quad
```

or

```bash
yarn add @traqula/parser-sparql-1-1-construct-quad
```

## Import

Either through ESM import:

```typescript
import { Parser } from '@traqula/parser-sparql-1-1-construct-quad';
```

_or_ CJS require:

```typescript
const Sparql11ConstructQuads = require('@traqula/parser-sparql-1-1-construct-quad').Parser;
```

## Usage

This package contains a `Parser` that is able to parse SPARQL 1.1 queries including
[construct QUAD queries](https://jena.apache.org/documentation/query/construct-quad.html#Grammar):

```typescript
const parser = new Parser();
const abstractSyntaxTree = parser.parse(`
CONSTRUCT WHERE { GRAPH <wow> { ?s ?p ?o } }
`);
```

This parser is a simple grammar extension to the [engine-sparql-1-1](https://github.com/comunica/traqula/tree/main/engines/engine-sparql-1-1).
As such, most, if not all, documentation of that parser holds for this one too.
