import { AsyncPipe } from '@angular/common';
import { Directive, DoCheck, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Allows setting a variable in the template without condition. The value of the variable will
 * be undefined until a defined value is emitted from any provided observable, but, unlike
 * ngIf the template will be instantiated immediately.
 */
@Directive({
  selector: '[htLetAsync]',
  providers: [AsyncPipe]
})
export class LetAsyncDirective<T> implements DoCheck {
  @Input('htLetAsync')
  public data$?: Observable<T>;

  private readonly context: LetAsyncContext<T> = {};

  public constructor(
    private readonly viewContainer: ViewContainerRef,
    private readonly templateRef: TemplateRef<LetAsyncContext<T>>,
    private readonly asyncPipe: AsyncPipe
  ) {
    this.viewContainer.createEmbeddedView(this.templateRef, this.context);
  }

  public ngDoCheck(): void {
    // Async pipe is impure, use do check to check it each cycle as an async pipe alone would be
    this.updateContext(this.removeNulls(this.asyncPipe.transform(this.data$)));
  }

  private updateContext(value?: T): void {
    this.context.htLetAsync = value;
    this.context.$implicit = value;
  }

  private removeNulls(value: T | null | undefined): T | undefined {
    return value === null ? undefined : value;
  }
}

interface LetAsyncContext<T> {
  htLetAsync?: T;
  $implicit?: T;
}
