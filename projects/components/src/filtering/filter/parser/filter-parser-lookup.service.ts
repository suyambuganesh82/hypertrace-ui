import { Injectable } from '@angular/core';
import { assertUnreachable } from '@hypertrace/common';
import { FilterValue } from '../filter';
import { FilterAttributeType } from '../filter-attribute-type';
import { FilterOperator } from '../filter-operators';
import { AbstractFilterParser } from './types/abstract-filter-parser';
import { ComparisonFilterParser } from './types/comparison-filter-parser';
import { ContainsFilterParser } from './types/contains-filter-parser';
import { InNotInFilterParser } from './types/in-not-in-filter-parser';

@Injectable({
  providedIn: 'root'
})
export class FilterParserLookupService {
  // TODO remove the separate parsers entirely.
  // There's next to no logic left in them, and they duplicate (incorrectly) supported operators,
  // Which should be based on attribute type (as defined in filter builders)
  public lookup(operator: FilterOperator): AbstractFilterParser<FilterValue> {
    switch (operator) {
      case FilterOperator.Equals:
      case FilterOperator.NotEquals:
      case FilterOperator.LessThan:
      case FilterOperator.LessThanOrEqualTo:
      case FilterOperator.GreaterThan:
      case FilterOperator.GreaterThanOrEqualTo:
      case FilterOperator.Contains:
      case FilterOperator.Like:
        return new ComparisonFilterParser();
      case FilterOperator.In:
      case FilterOperator.NotIn:
        return new InNotInFilterParser();
      case FilterOperator.ContainsKey:
      case FilterOperator.NotContainsKey:
      case FilterOperator.ContainsKeyLike:
        return new ContainsFilterParser();
      default:
        return assertUnreachable(operator);
    }
  }

  public isParsableOperatorForType(operator: FilterOperator, type: FilterAttributeType): boolean {
    // NOTE: Just because a type is parsable, does not mean the operator is supported for that type.
    try {
      const filterParser = this.lookup(operator);

      return filterParser.supportedAttributeTypes().includes(type);
    } catch (e) {
      return false;
    }
  }
}
