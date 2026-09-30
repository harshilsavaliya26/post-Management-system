import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Toast } from '../models/post.model';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts = this.toasts$.asObservable();

  show(type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, durationMs = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, type, title, message };
    
    this.toasts$.next([...this.toasts$.value, newToast]);

    setTimeout(() => {
      this.remove(id);
    }, durationMs);
  }

  success(title: string, message: string): void {
    this.show('success', title, message);
  }

  error(title: string, message: string): void {
    this.show('error', title, message);
  }

  info(title: string, message: string): void {
    this.show('info', title, message);
  }

  warning(title: string, message: string): void {
    this.show('warning', title, message);
  }

  remove(id: string): void {
    this.toasts$.next(this.toasts$.value.filter(t => t.id !== id));
  }
}
