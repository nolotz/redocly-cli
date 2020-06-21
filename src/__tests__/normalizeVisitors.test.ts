import { normalizeVisitors, VisitorLevelContext } from '../visitors';
import { OAS3RuleSet } from '../validate';
import { OAS3Types, normalizeTypes } from '../types/oa3';

describe('Normalize visitors', () => {
  it('should work correctly for single rule', () => {
    const schemaEnter = () => undefined;

    const ruleset: OAS3RuleSet[] = [
      {
        test: () => {
          return {
            Schema: schemaEnter,
          };
        },
      },
    ];

    const visitors = ruleset.flatMap((ruleset) =>
      Object.keys(ruleset).map((ruleId) => ({
        ruleId,
        severity: 'error' as 'error',
        visitor: ruleset[ruleId](),
      })),
    );

    const normalized = normalizeVisitors(visitors, normalizeTypes(OAS3Types));
    expect(normalized).toBeDefined();
    expect(normalized.Schema.enter).toHaveLength(1);
    expect(normalized.Schema.enter[0].visit).toEqual(schemaEnter);
    expect(normalized.Schema.enter[0].context.parent).toEqual(null);
    const { type, ...contextWithoutType } = normalized.Schema.enter[0]
      .context as VisitorLevelContext;

    expect(contextWithoutType).toEqual({
      activatedOn: null,
      parent: null,
      isSkippedLevel: false,
    });

    expect(type.name).toEqual('Schema');
  });

  it('should work for nested rule', () => {
    const infoEnter = () => undefined;
    const infoLeave = () => undefined;
    const contactEnter = () => undefined;

    const ruleset: OAS3RuleSet[] = [
      {
        test: () => {
          return {
            Info: {
              enter: infoEnter,
              leave: infoLeave,
              Contact: contactEnter,
            },
          };
        },
      },
    ];

    const visitors = ruleset.flatMap((ruleset) =>
      Object.keys(ruleset).map((ruleId) => ({
        ruleId,
        severity: 'error' as 'error',
        visitor: ruleset[ruleId](),
      })),
    );

    const normalized = normalizeVisitors(visitors, normalizeTypes(OAS3Types));
    expect(normalized).toBeDefined();
    expect(normalized.Info.enter).toHaveLength(1);

    expect(normalized.Info.enter[0].context).toStrictEqual(normalized.Info.leave[0].context);

    expect(normalized.Info.enter[0].visit).toEqual(infoEnter);
    expect(normalized.Contact.enter[0].visit).toEqual(contactEnter);

    expect(normalized.Contact.enter[0].context.parent).toEqual(normalized.Info.enter[0].context);

    expect(normalized.Info.leave).toHaveLength(1);
    expect(normalized.Info.leave[0].visit).toEqual(infoLeave);
  });

  it('should normalize with weak interminient types', () => {
    const contactEnter = () => undefined;

    const ruleset: OAS3RuleSet[] = [
      {
        test: () => {
          return {
            PathItem: {
              Parameter: contactEnter,
            },
          };
        },
      },
    ];

    const visitors = ruleset.flatMap((ruleset) =>
      Object.keys(ruleset).map((ruleId) => ({
        ruleId,
        severity: 'error' as 'error',
        visitor: ruleset[ruleId](),
      })),
    );

    const normalized = normalizeVisitors(visitors, normalizeTypes(OAS3Types));
    expect(normalized).toBeDefined();
    expect(normalized.PathItem.enter).toHaveLength(1);
    expect(normalized.Operation.enter).toHaveLength(1);
    expect(normalized.Parameter.enter).toHaveLength(1);
    expect(normalized.Parameter_List.enter).toHaveLength(2);
  });

  it('should order deeper visitors first', () => {
    const pathParam = () => undefined;
    const operationParam = () => undefined;

    const ruleset: OAS3RuleSet[] = [
      {
        test: () => {
          return {
            PathItem: {
              Parameter: pathParam,
              Operation: {
                Parameter: operationParam,
              },
            },
          };
        },
      },
    ];

    const visitors = ruleset.flatMap((ruleset) =>
      Object.keys(ruleset).map((ruleId) => ({
        ruleId,
        severity: 'error' as 'error',
        visitor: ruleset[ruleId](),
      })),
    );

    const normalized = normalizeVisitors(visitors, normalizeTypes(OAS3Types));
    expect(normalized).toBeDefined();
    expect(normalized.Parameter.enter).toHaveLength(2);
    expect(normalized.Parameter.enter[0].visit).toStrictEqual(operationParam);
    expect(normalized.Parameter.enter[1].visit).toStrictEqual(pathParam);
  });
});
