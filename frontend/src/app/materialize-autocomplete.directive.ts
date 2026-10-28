import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

@Directive({
  selector: 'input.autocomplete',
  standalone: true,
})
export class MaterializeAutocompleteDirective {
  readonly autocompleteOptions = input<readonly string[]>([]);

  constructor() {
    const element = inject(ElementRef<HTMLInputElement>).nativeElement;
    let destroyed = false;
    let instance: import('@materializecss/materialize').Autocomplete | undefined;

    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      instance?.destroy();
    });

    afterNextRender(() => void initialize());

    const initialize = async (): Promise<void> => {
      const { Autocomplete } = await import('@materializecss/materialize');
      if (destroyed) return;
      instance?.destroy();
      instance = Autocomplete.init(element, {
        minLength: 0,
        data: this.autocompleteOptions().map((name) => ({ id: name, text: name })),
        onAutocomplete: ([option]) => {
          if (!option) return;
          const name = typeof option === 'string' ? option : option.text ?? String(option.id);
          element.value = name;
          element.dispatchEvent(new Event('input', { bubbles: true }));
        },
      });
    };
  }
}