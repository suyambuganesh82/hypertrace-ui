import { Injectable } from '@angular/core';
import {
  GraphQlHandlerType,
  GraphQlQueryHandler,
  GraphQlRequestOptions,
  GraphQlSelection
} from '@hypertrace/graphql-client';
import { Observable } from 'rxjs';
import {
  EntitiesGraphqlQueryBuilderService,
  EntitiesResponse,
  GraphQlEntitiesRequest
} from './entities-graphql-query-builder.service';

@Injectable({ providedIn: 'root' })
export class EntitiesGraphQlQueryHandlerService
  implements GraphQlQueryHandler<GraphQlEntitiesQueryRequest, EntitiesResponse> {
  public readonly type: GraphQlHandlerType.Query = GraphQlHandlerType.Query;

  public constructor(private readonly entitiesGraphQlQueryBuilderService: EntitiesGraphqlQueryBuilderService) {}

  public matchesRequest(request: unknown): request is GraphQlEntitiesQueryRequest {
    return (
      typeof request === 'object' &&
      request !== null &&
      (request as Partial<GraphQlEntitiesQueryRequest>).requestType === ENTITIES_GQL_REQUEST
    );
  }

  public convertRequest(request: GraphQlEntitiesQueryRequest): GraphQlSelection {
    const totalSelection = request.includeTotal ? [{ path: 'total' }] : [];

    return {
      path: 'entities',
      arguments: this.entitiesGraphQlQueryBuilderService.buildRequestArguments(request),
      children: [
        {
          path: 'results',
          children: [
            { path: 'id', alias: 'entityId' },
            ...this.entitiesGraphQlQueryBuilderService.buildRequestSpecifications(request)
          ]
        },
        ...totalSelection
      ]
    };
  }

  public convertResponse(response: unknown, request: GraphQlEntitiesQueryRequest): Observable<EntitiesResponse> {
    return this.entitiesGraphQlQueryBuilderService.buildResponse(response, request);
  }

  public getRequestOptions(request: GraphQlEntitiesQueryRequest): GraphQlRequestOptions {
    return this.entitiesGraphQlQueryBuilderService.getRequestOptions(request);
  }
}

export const ENTITIES_GQL_REQUEST = Symbol('GraphQL Entities Request');

export interface GraphQlEntitiesQueryRequest extends GraphQlEntitiesRequest {
  requestType: typeof ENTITIES_GQL_REQUEST;
}
