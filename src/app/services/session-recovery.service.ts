import { Injectable } from '@angular/core';

type FieldSnapshot = {
  id?: string;
  name?: string;
  occurrence: number;
  tag: string;
  type?: string;
  value?: string;
  checked?: boolean;
  selectedValues?: string[];
};

type PageSnapshot = {
  route: string;
  scrollX: number;
  scrollY: number;
  fields: FieldSnapshot[];
};

@Injectable({ providedIn: 'root' })
export class SessionRecoveryService {
  private readonly storageKey = 'admin.sessionRecovery';

  capture(route: string): void {
    const fields: FieldSnapshot[] = [];
    const occurrences = new Map<string, number>();
    const controls = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select',
    );

    controls.forEach(control => {
      const inputType = control instanceof HTMLInputElement ? control.type.toLowerCase() : undefined;
      // Browsers intentionally prohibit restoring file picker selections.
      if (inputType === 'password' || inputType === 'file' || inputType === 'submit' || inputType === 'button') return;
      const tag = control.tagName.toLowerCase();
      const identity = control.id ? `#${control.id}` : `${tag}[name="${control.name}"]`;
      const occurrence = occurrences.get(identity) ?? 0;
      occurrences.set(identity, occurrence + 1);

      fields.push({
        id: control.id || undefined,
        name: control.name || undefined,
        occurrence,
        tag,
        type: inputType,
        value: control instanceof HTMLSelectElement && control.multiple
          ? undefined
          : control.value,
        checked: control instanceof HTMLInputElement && (inputType === 'checkbox' || inputType === 'radio')
          ? control.checked
          : undefined,
        selectedValues: control instanceof HTMLSelectElement && control.multiple
          ? Array.from(control.selectedOptions, option => option.value)
          : undefined,
      });
    });

    try {
      const snapshot: PageSnapshot = {
        route,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        fields,
      };
      sessionStorage.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch {
      // Keep the current page usable if storage is unavailable or full.
    }
  }

  restore(route: string): void {
    let snapshot: PageSnapshot | null = null;
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (raw) snapshot = JSON.parse(raw) as PageSnapshot;
      sessionStorage.removeItem(this.storageKey);
    } catch {
      return;
    }
    if (!snapshot || snapshot.route !== route) return;

    // Lazy route components and their controls may render after navigation.
    const restored = new Set<string>();
    for (const delay of [0, 150, 500, 1200]) {
      window.setTimeout(() => this.restoreFields(snapshot!.fields, restored), delay);
    }
    window.setTimeout(() => window.scrollTo(snapshot!.scrollX, snapshot!.scrollY), 150);
  }

  private restoreFields(fields: FieldSnapshot[], restored: Set<string>): void {
    const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select',
    ));
    const occurrences = new Map<string, number>();

    for (const control of controls) {
      const tag = control.tagName.toLowerCase();
      const identity = control.id ? `#${control.id}` : `${tag}[name="${control.name}"]`;
      const occurrence = occurrences.get(identity) ?? 0;
      occurrences.set(identity, occurrence + 1);
      const saved = fields.find(field => field.tag === tag && field.occurrence === occurrence &&
        (field.id ? field.id === control.id : field.name === control.name));
      if (!saved) continue;
      const restoreKey = `${saved.id ? `#${saved.id}` : `${saved.tag}[name="${saved.name ?? ''}"]`}:${saved.occurrence}`;
      if (restored.has(restoreKey)) continue;

      if (control instanceof HTMLInputElement && (saved.type === 'checkbox' || saved.type === 'radio')) {
        control.checked = !!saved.checked;
      } else if (control instanceof HTMLSelectElement && control.multiple) {
        const selected = new Set(saved.selectedValues ?? []);
        Array.from(control.options).forEach(option => option.selected = selected.has(option.value));
      } else if (saved.value !== undefined && control.value !== saved.value) {
        const prototype = Object.getPrototypeOf(control) as { value?: unknown };
        const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (setter) setter.call(control, saved.value);
        else control.value = saved.value;
      }

      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
      restored.add(restoreKey);
    }
  }
}
