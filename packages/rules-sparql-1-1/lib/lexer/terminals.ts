/* eslint-disable require-unicode-regexp,no-misleading-character-class,max-len,no-control-regex */
import { LexerBuilder, createToken } from '@traqula/core';
import { Lexer } from 'chevrotain';

const pnCharsBasePattern = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF]/;
const pnCharsUPattern = new RegExp(`${pnCharsBasePattern.source}|_`);
const varNamePattern = new RegExp(`((${pnCharsUPattern.source})|[0-9])((${pnCharsUPattern.source})|[0-9]|[\u00B7\u0300-\u036F\u203F-\u2040])*`);
const iriRefPattern = /<([^\u0000-\u0020"<>\\^`{|}])*>/;
const pnCharsPattern = new RegExp(`(${pnCharsUPattern.source})|[\\-0-9\u00B7\u0300-\u036F\u203F-\u2040]`);
const pnPrefixPattern = new RegExp(`(${pnCharsBasePattern.source})(((${pnCharsPattern.source})|\\.)*(${pnCharsPattern.source}))?`);
const pNameNsPattern = new RegExp(`(${pnPrefixPattern.source})?:`);
const percentPattern = /%[\dA-Fa-f]{2}/;
const pnLocalEscPattern = /\\[!#$%&'()*+,./;=?@\\_~-]/;
const plxPattern = new RegExp(`(${percentPattern.source})|(${pnLocalEscPattern.source})`);
const pnLocalPattern = new RegExp(`((${pnCharsUPattern.source})|:|[0-9]|(${plxPattern.source}))(((${pnCharsPattern.source})|\\.|:|(${plxPattern.source}))*((${pnCharsPattern.source})|:|(${plxPattern.source})))?`);
const pNameLnPattern = new RegExp(`(${pNameNsPattern.source})(${pnLocalPattern.source})`);
const blankNodeLabelPattern = new RegExp(`_:((${pnCharsUPattern.source})|[0-9])(((${pnCharsPattern.source})|\\.)*(${pnCharsPattern.source}))?`);
const var1Pattern = new RegExp(`\\?(${varNamePattern.source})`);
const var2Pattern = new RegExp(`\\$(${varNamePattern.source})`);
const langTagPattern = /@[A-Za-z]+(-[\dA-Za-z]+)*/;
const integerPattern = /\d+/;
const decimalPattern = /\d+\.\d+/;
const exponentPattern = /[Ee][+-]?\d+/;
const doublePattern = new RegExp(`([0-9]+\\.[0-9]*(${exponentPattern.source}))|(\\.[0-9]+(${exponentPattern.source}))|([0-9]+(${exponentPattern.source}))`);
const interferePositivePattern = new RegExp(`\\+${integerPattern.source}`);
const decimalPositivePattern = new RegExp(`\\+${decimalPattern.source}`);
const doublePositivePattern = new RegExp(`\\+${doublePattern.source}`);
const integerNegativePattern = new RegExp(`-${integerPattern.source}`);
const decimalNegativePattern = new RegExp(`-${decimalPattern.source}`);
const doubleNegativePattern = new RegExp(`-${doublePattern.source}`);
const echarPattern = /\\[\\"'bfnrt]/u;
const stringLiteral1Pattern = new RegExp(`'(([^\\u0027\\u005C\\u000A\u000D])|(${echarPattern.source}))*'`);
const stringLiteral2Pattern = new RegExp(`"(([^\\u0022\\u005C\\u000A\\u000D])|(${echarPattern.source}))*"`);
const stringLiteralLong1Pattern = new RegExp(`'''(('|(''))?([^'\\\\]|(${echarPattern.source})))*'''`);
const stringLiteralLong2Pattern = new RegExp(`"""(("|(""))?([^"\\\\]|(${echarPattern.source})))*"""`);
const wsPattern = /[\u0009\u000A\u000D ]/;
const nilPattern = new RegExp(`\\((${wsPattern.source})*\\)`);
const anonPattern = new RegExp(`\\[(${wsPattern.source})*\\]`);

/**
 * [[139]](https://www.w3.org/TR/sparql11-query/#rIRIREF)
 */
export const iriRef = createToken({ name: 'IriRef', pattern: iriRefPattern });
/**
 * [[141]](https://www.w3.org/TR/sparql11-query/#rPNAME_LN)
 */
export const pNameLn = createToken({ name: 'PNameLn', pattern: pNameLnPattern });
/**
 * [[140]](https://www.w3.org/TR/sparql11-query/#rPNAME_NS)
 */
export const pNameNs = createToken({ name: 'PNameNs', pattern: pNameNsPattern, longer_alt: [ pNameLn ]});
/**
 * [[142]](https://www.w3.org/TR/sparql11-query/#rBLANK_NODE_LABEL)
 */
export const blankNodeLabel = createToken({ name: 'BlankNodeLabel', pattern: blankNodeLabelPattern });
/**
 * [[143]](https://www.w3.org/TR/sparql11-query/#rVAR1)
 */
export const var1 = createToken({ name: 'Var1', pattern: var1Pattern });
/**
 * [[144]](https://www.w3.org/TR/sparql11-query/#rVAR1)
 */
export const var2 = createToken({ name: 'Var2', pattern: var2Pattern });
/**
 * [[145]](https://www.w3.org/TR/sparql11-query/#rLANGTAG)
 */
export const langTag = createToken({ name: 'LangTag', pattern: langTagPattern });
/**
 * [[146]](https://www.w3.org/TR/sparql11-query/#rINTEGER)
 */
export const integer = createToken({ name: 'Integer', pattern: integerPattern });
/**
 * [[148]](https://www.w3.org/TR/sparql11-query/#rDOUBLE)
 */
export const decimal = createToken({ name: 'Decimal', pattern: decimalPattern });
/**
 * [[148]](https://www.w3.org/TR/sparql11-query/#rDOUBLE)
 */
export const double = createToken({ name: 'Double', pattern: doublePattern });
/**
 * [[149]](https://www.w3.org/TR/sparql11-query/#rINTEGER_POSITIVE)
 */
export const integerPositive = createToken({ name: 'InterferePositive', pattern: interferePositivePattern });
/**
 * [[150]](https://www.w3.org/TR/sparql11-query/#rDECIMAL_POSITIVE)
 */
export const decimalPositive = createToken({ name: 'DecimalPositive', pattern: decimalPositivePattern });
/**
 * [[151]](https://www.w3.org/TR/sparql11-query/#rDOUBLE_POSITIVE)
 */
export const doublePositive = createToken({ name: 'DoublePositive', pattern: doublePositivePattern });
/**
 * [[152]](https://www.w3.org/TR/sparql11-query/#rINTEGER_NEGATIVE)
 */
export const integerNegative = createToken({ name: 'IntegerNegative', pattern: integerNegativePattern });
/**
 * [[153]](https://www.w3.org/TR/sparql11-query/#rDECIMAL_NEGATIVE)
 */
export const decimalNegative = createToken({ name: 'DecimalNegative', pattern: decimalNegativePattern });
/**
 * [[154]](https://www.w3.org/TR/sparql11-query/#rDOUBLE_NEGATIVE)
 */
export const doubleNegative = createToken({ name: 'DoubleNegative', pattern: doubleNegativePattern });
/**
 * [[156]](https://www.w3.org/TR/sparql11-query/#rSTRING_LITERAL1)
 */
export const stringLiteral1 = createToken({ name: 'StringLiteral1', pattern: stringLiteral1Pattern });
/**
 * [[157]](https://www.w3.org/TR/sparql11-query/#rSTRING_LITERAL1)
 */
export const stringLiteral2 = createToken({ name: 'StringLiteral2', pattern: stringLiteral2Pattern });
/**
 * [[158]](https://www.w3.org/TR/sparql11-query/#rSTRING_LITERAL_LONG1)
 */
export const stringLiteralLong1 = createToken({ name: 'StringLiteralLong1', pattern: stringLiteralLong1Pattern });
/**
 * [[159]]https://www.w3.org/TR/sparql11-query/#rSTRING_LITERAL_LONG2)
 */
export const stringLiteralLong2 = createToken({ name: 'StringLiteralLong2', pattern: stringLiteralLong2Pattern });
/**
 * https://www.w3.org/TR/sparql11-query/#rWS
 */
export const ws = createToken({ name: 'Ws', pattern: wsPattern, group: Lexer.SKIPPED });
export const comment = createToken({ name: 'Comment', pattern: /#[^\n]*/, group: Lexer.SKIPPED });
/**
 * [[161]](https://www.w3.org/TR/sparql11-query/#rNIL)
 */
export const nil = createToken({ name: 'Nil', pattern: nilPattern });
/**
 * [[163]](https://www.w3.org/TR/sparql11-query/#rANON)
 */
export const anon = createToken({ name: 'Anon', pattern: anonPattern });

export const allTerminals = LexerBuilder.create().add(
  iriRef,
  pNameNs,
  pNameLn,
  blankNodeLabel,
  var1,
  var2,
  langTag,
  double,
  decimal,
  integer,
  integerPositive,
  decimalPositive,
  doublePositive,
  integerNegative,
  decimalNegative,
  doubleNegative,
  stringLiteralLong1,
  stringLiteralLong2,
  stringLiteral1,
  stringLiteral2,
  ws,
  comment,
  nil,
  anon,
);
