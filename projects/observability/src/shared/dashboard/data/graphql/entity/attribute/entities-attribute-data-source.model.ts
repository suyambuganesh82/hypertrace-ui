import {
  Model,
  ModelModelPropertyTypeInstance,
  ModelProperty,
  ModelPropertyType,
  STRING_PROPERTY
} from '@hypertrace/hyperdash';
import { Observable } from 'rxjs';
import { EntityType } from '../../../../../graphql/model/schema/entity';
import { Specification } from '../../../../../graphql/model/schema/specifier/specification';
import { AttributeSpecificationModel } from '../../specifiers/attribute-specification.model';
import { EntitiesValuesDataSourceModel } from '../entities-values-data-source.model';

@Model({
  type: 'entities-attribute-data-source'
})
export class EntitiesAttributeDataSourceModel extends EntitiesValuesDataSourceModel {
  @ModelProperty({
    key: 'attribute',
    type: {
      key: ModelPropertyType.TYPE,
      defaultModelClass: AttributeSpecificationModel
    } as ModelModelPropertyTypeInstance,
    required: true
  })
  public specification!: Specification;

  @ModelProperty({
    key: 'entity',
    type: STRING_PROPERTY.type,
    required: true
  })
  public entityType!: EntityType;

  public getData(): Observable<unknown[]> {
    return this.fetchSpecificationData();
  }
}
