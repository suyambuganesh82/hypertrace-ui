import { assertUnreachable } from '@hypertrace/common';
import { FilterAttribute } from '../../filter-attribute';
import { FilterAttributeType } from '../../filter-attribute-type';
import { FilterOperator } from '../../filter-operators';
import { SplitFilter } from '../parsed-filter';
import { AbstractFilterParser } from './abstract-filter-parser';

export class InFilterParser extends AbstractFilterParser<PossibleValuesTypes> {
  private static readonly IN_DELIMITER: string = ',';

  public supportedAttributeTypes(): FilterAttributeType[] {
    return [FilterAttributeType.String, FilterAttributeType.Number];
  }

  public supportedOperators(): FilterOperator[] {
    return [FilterOperator.In];
  }

  protected parseValueString(
    attribute: FilterAttribute,
    splitFilter: SplitFilter<FilterOperator>
  ): PossibleValuesTypes | undefined {
    switch (attribute.type) {
      case FilterAttributeType.String:
        return this.parseStringArrayValue(splitFilter.rhs);
      case FilterAttributeType.Number:
        return this.parseNumberArrayValue(splitFilter.rhs);
      case FilterAttributeType.Boolean: // Unsupported
      case FilterAttributeType.StringArray: // Unsupported
      case FilterAttributeType.StringMap: // Unsupported
      case FilterAttributeType.Timestamp: // Unsupported
        return undefined;
      default:
        assertUnreachable(attribute.type);
    }
  }

  private parseStringArrayValue(valueString: string): string[] {
    return valueString.split(InFilterParser.IN_DELIMITER).map(str => str.trim());
  }

  private parseNumberArrayValue(valueString: string): number[] | undefined {
    const array = valueString.split(InFilterParser.IN_DELIMITER).map(str => {
      const val = Number(str.trim());

      return isNaN(val) ? undefined : val;
    });

    return array.includes(undefined) ? undefined : (array as number[]);
  }
}

type PossibleValuesTypes = string[] | number[];
