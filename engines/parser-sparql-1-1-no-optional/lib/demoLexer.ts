/* eslint-disable require-unicode-regexp,no-misleading-character-class,max-len,no-control-regex */
/**
 * This code is not used - it just serves the demo of https://modular-parsing.demo.jitsedesmet.be/
 */
import { createToken, LexerBuilder } from '@traqula/core';
import { Lexer } from 'chevrotain';

const pnCharsBasePattern = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF]/;
const pnCharsUPattern = new RegExp(`${pnCharsBasePattern.source}|_`);
const varNamePattern = new RegExp(`((${pnCharsUPattern.source})|[0-9])((${pnCharsUPattern.source})|[0-9]|[\u00B7\u0300-\u036F\u203F-\u2040])*`);
const var1Pattern = new RegExp(`\\?(${varNamePattern.source})`);

export const select = createToken({ name: 'Select', pattern: /select/i, label: 'SELECT' });
export const star = createToken({ name: 'Star', pattern: '*', label: '*' });
export const LCurly = createToken({ name: 'LCurly', pattern: '{', label: '{' });
export const RCurly = createToken({ name: 'RCurly', pattern: '}', label: '}' });
export const var1 = createToken({ name: 'Var1', pattern: var1Pattern });
export const anonPattern = createToken({ name: 'Anon', pattern: /\[[\u0009\u000A\u000D ]*]/ });
export const ws = createToken({ name: 'Ws', pattern: /[\u0009\u000A\u000D ]/, group: Lexer.SKIPPED });

export const simpleBuilder = LexerBuilder.create()
  .add(select, star, LCurly, RCurly, var1, anonPattern, ws);
export const lexer: Lexer = simpleBuilder.build();
