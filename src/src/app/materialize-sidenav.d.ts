declare module '@materializecss/materialize' {
  interface SidenavOptions {
    edge?: 'left' | 'right';
    onOpenStart?: (element: HTMLElement) => void;
    onCloseStart?: (element: HTMLElement) => void;
  }

  export class Sidenav {
    readonly isOpen: boolean;
    static init(element: HTMLElement, options?: SidenavOptions): Sidenav;
    open(): void;
    close(): void;
    destroy(): void;
  }

  export class FormSelect {
    static init(element: HTMLSelectElement): FormSelect;
    destroy(): void;
  }
}