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

  export interface ToastOptions {
    text: string;
    displayLength: number;
    outDuration: number;
    classes: string;
  }

  export class Toast {
    readonly options: ToastOptions;
    readonly message: string;
    constructor(options: Partial<ToastOptions>);
    static getInstance(element: HTMLElement): Toast | undefined;
    static dismissAll(): void;
    dismiss(): void;
  }
}