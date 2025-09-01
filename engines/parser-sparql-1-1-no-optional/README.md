<p align="center">
    <img alt="Traqula logo" width="70%" style="border-radius: 20px" src="/assets/white-on-red/logo-white-on-red-lettered-social.png">
</p>

<p align="center">
  <strong>A query language transpiler framework for JavaScript</strong>
</p>

# Traqula parser engine for SPARQL 1.1 + No OPTIONAL

Traqula Sparql 1.1 no optional is a [SPARQL 1.1](https://www.w3.org/TR/sparql11-query/#grammar) query parser that does not parse the
[OPTIONAL pattern](https://www.w3.org/TR/sparql11-query/#rOptionalGraphPattern) for TypeScript.
Simple grammar extension of [Traqula engine-sparql-1-1](https://github.com/comunica/traqula/tree/main/engines/parser-sparql-1-1)

## Installation

```bash
npm install @traqula/parser-sparql-1-1-no-optional
```

or

```bash
yarn add @traqula/parser-sparql-1-1-no-optional
```

## Import

Either through ESM import:

```typescript
import { Parser } from '@traqula/parser-sparql-1-1-no-optional';
```

_or_ CJS require:

```typescript
const Sparql11NoOptional = require('@traqula/parser-sparql-1-1-no-optional').Parser;
```

## Usage

This package contains a `Parser` that is able to parse SPARQL 1.1 queries excluding the
[OPTIONAL pattern](https://www.w3.org/TR/sparql11-query/#rOptionalGraphPattern):

This parser is a simple grammar modification of the [engine-sparql-1-1](https://github.com/comunica/traqula/tree/main/engines/engine-sparql-1-1).
As such, most, if not all, documentation of that parser holds for this one too.
