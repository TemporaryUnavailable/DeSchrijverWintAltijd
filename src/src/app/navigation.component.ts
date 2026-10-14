import { Component, ElementRef, OnDestroy, ViewChild, output, signal } from '@angular/core';
import { LucideHouse, LucideMenu, LucideQrCode, LucideSettings } from '@lucide/angular';
import type { Sidenav } from '@materializecss/materialize';

@Component({
  selector: 'app-navigation',
  imports: [LucideHouse, LucideMenu, LucideQrCode, LucideSettings],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css',
})
export class NavigationComponent implements OnDestroy {
  @ViewChild('sidenav', { static: true }) private sidenavElement!: ElementRef<HTMLUListElement>;
  readonly home = output<void>();
  readonly qrScan = output<void>();
  readonly settings = output<void>();
  protected readonly open = signal(false);
  private sidenav?: Sidenav;
  private sidenavLoading?: Promise<Sidenav>;

  ngOnDestroy(): void {
    this.sidenav?.destroy();
  }

  protected async toggleMenu(): Promise<void> {
    const sidenav = await this.getSidenav();
    if (sidenav.isOpen) sidenav.close();
    else sidenav.open();
  }

  protected closeMenu(): void {
    this.sidenav?.close();
  }

  private getSidenav(): Promise<Sidenav> {
    if (this.sidenav) return Promise.resolve(this.sidenav);
    this.sidenavLoading ??= import('@materializecss/materialize').then(({ Sidenav }) => {
      this.sidenav = Sidenav.init(this.sidenavElement.nativeElement, {
        edge: 'left',
        onOpenStart: () => this.open.set(true),
        onCloseStart: () => this.open.set(false),
      });
      return this.sidenav;
    });
    return this.sidenavLoading;
  }

  protected goHome(): void {
    this.closeMenu();
    this.home.emit();
  }

  protected scanQr(): void {
    this.closeMenu();
    this.qrScan.emit();
  }

  protected openSettings(): void {
    this.closeMenu();
    this.settings.emit();
  }
}