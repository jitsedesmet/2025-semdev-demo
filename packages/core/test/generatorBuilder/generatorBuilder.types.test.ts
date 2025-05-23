import { describe, it, expectTypeOf } from 'vitest';
import type { GeneratorRule } from '../../lib';
import { GeneratorBuilder } from '../../lib';

interface Context {
  world: 'hello';
}

const RuleA: GeneratorRule<Context, 'apple', 'apple'> = {
  name: 'apple',
  gImpl: () => () => 'apple',
};
const RuleB: GeneratorRule<Context, 'banana', 'banana'> = {
  name: 'banana',
  gImpl: () => () => 'banana',
};
const RuleC: GeneratorRule<Context, 'coconut', 'coconut'> = {
  name: 'coconut',
  gImpl: () => () => 'coconut',
};

describe('parserBuilder', () => {
  describe('types', () => {
    it('builder constructor', () => {
      expectTypeOf(GeneratorBuilder.create(<const> [ RuleA ]))
        .branded.toEqualTypeOf<GeneratorBuilder<Context, 'apple', { apple: typeof RuleA }>>();
      expectTypeOf(GeneratorBuilder.create(<const> [ RuleB ]))
        .branded.toEqualTypeOf<GeneratorBuilder<Context, 'banana', { banana: typeof RuleB }>>();
      expectTypeOf(GeneratorBuilder.create(<const> [ RuleA, RuleB ]))
        .branded
        .toEqualTypeOf<GeneratorBuilder<Context, 'apple' | 'banana', { apple: typeof RuleA; banana: typeof RuleB }>>();

      // AddRule
      expectTypeOf(GeneratorBuilder.create(<const> [ RuleA, RuleB ]).addRule(RuleC))
        .branded.toEqualTypeOf<GeneratorBuilder<
        Context,
        'apple' | 'banana' | 'coconut',
        { apple: typeof RuleA; banana: typeof RuleB; coconut: typeof RuleC }
      >>();

      // Merge
      expectTypeOf(
        GeneratorBuilder.create(<const> [ RuleA ])
          .merge(GeneratorBuilder.create(<const> [ RuleB ]), <const> []),
      ).branded
        .toEqualTypeOf<GeneratorBuilder<Context, 'apple' | 'banana', { apple: typeof RuleA; banana: typeof RuleB }>>();

      expectTypeOf(
        GeneratorBuilder.create(<const> [ RuleA, RuleB ])
          .merge(GeneratorBuilder.create(<const> [ RuleB, RuleC ]), <const> []),
      ).branded
        .toEqualTypeOf<GeneratorBuilder<
          Context,
          'apple' | 'banana' | 'coconut',
          { apple: typeof RuleA; banana: typeof RuleB; coconut: typeof RuleC }
        >>();
    });
  });
});
