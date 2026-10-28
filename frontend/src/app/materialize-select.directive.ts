import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: 'select[materializeSelect]',
  standalone: true,
})
export class MaterializeSelectDirective {
  constructor() {
    const select = inject(ElementRef<HTMLSelectElement>).nativeElement;
    let destroyed = false;
    let instance: import('@materializecss/materialize').FormSelect | undefined;
    const originalAriaHidden = select.getAttribute('aria-hidden');

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      observer?.disconnect();
      instance?.destroy();
      if (originalAriaHidden === null) select.removeAttribute('aria-hidden');
      else select.setAttribute('aria-hidden', originalAriaHidden);
    });

    let observer: MutationObserver | undefined;
    afterNextRender(() => {
      observer = new MutationObserver(() => void initialize());
      observer.observe(select, {
        attributes: true,
        attributeFilter: ['disabled', 'selected'],
        childList: true,
        subtree: true,
      });
      void initialize();
    });

    const initialize = async (): Promise<void> => {
      const { FormSelect } = await import('@materializecss/materialize');
      if (destroyed) return;
      instance?.destroy();
      instance = FormSelect.init(select);
      select.setAttribute('aria-hidden', 'true');
    };
  }
}