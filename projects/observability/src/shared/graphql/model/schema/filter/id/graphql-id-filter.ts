import { GraphQlArgumentValue, GraphQlEnumArgument } from '@hypertrace/graphql-client';
import { GraphQlFilter, GraphQlFilterType, GraphQlOperatorType } from '../graphql-filter';

export class GraphQlIdFilter implements GraphQlFilter {
  public readonly key: string = 'id';

  public constructor(
    public readonly id: string,
    public readonly idScope: string,
    public readonly operator: GraphQlOperatorType = GraphQlOperatorType.Equals
  ) {}

  public asArgumentObjects(): [GraphQlIdFilterArgument] {
    return [
      {
        operator: new GraphQlEnumArgument(this.operator),
        value: this.id,
        type: new GraphQlEnumArgument(GraphQlFilterType.Id),
        idScope: this.idScope
      }
    ];
  }
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GraphQlIdFilterArgument = {
  value: GraphQlArgumentValue;
  operator: GraphQlEnumArgument<GraphQlOperatorType>;
  type: GraphQlEnumArgument<GraphQlFilterType.Id>;
  idScope: string;
};
