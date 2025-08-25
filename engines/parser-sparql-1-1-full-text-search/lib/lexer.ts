/* eslint-disable require-unicode-regexp,no-misleading-character-class,max-len */
import { createToken } from '@traqula/core';

export const option = createToken({ name: 'Option', pattern: /option/i, label: 'option' });
export const inference = createToken({ name: 'Inference', pattern: /inference/i, label: 'inference' });

const pnCharsBasePattern = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF]/;
const pnCharsUPattern = new RegExp(`${pnCharsBasePattern.source}|_`);
const varNamePattern = new RegExp(`((${pnCharsUPattern.source})|[0-9])((${pnCharsUPattern.source})|[0-9]|[\u00B7\u0300-\u036F\u203F-\u2040])*`);

export const qName = createToken({ name: 'QName', pattern: varNamePattern, label: 'qName' });
