import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { PaymentPlan, TipOption, TransactionReceipt, PaymentFormData } from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly plans: PaymentPlan[] = [
    {
      id: 'pro_monthly',
      name: 'Pulse Pro Monthly',
      tagline: 'Best for avid readers & enthusiasts',
      price: 9.99,
      period: 'month',
      popular: true,
      features: [
        'Unlock ALL posts without individual paywalls',
        'Ad-free reading experience',
        'Verified Author Pro Badge',
        'Priority comment highlighting',
        'Unlimited author tips with 0% fee'
      ]
    },
    {
      id: 'pro_yearly',
      name: 'Pulse Pro Annual',
      tagline: 'Save 35% with annual billing',
      price: 79.99,
      period: 'year',
      features: [
        'Unlock ALL posts for the entire year',
        '35% Annual discount applied',
        'Custom author profile vanity URL',
        'Export posts as PDF / Markdown',
        'VIP direct creator messaging'
      ]
    },
    {
      id: 'lifetime',
      name: 'VIP Creator Lifetime',
      tagline: 'One-time payment for lifetime access',
      price: 199.99,
      period: 'one-time',
      features: [
        'Lifetime unlimited post unlocks',
        'Exclusive Founder Badge',
        'Featured author placement in sidebar',
        'Dedicated 24/7 priority support',
        'Direct API webhooks integration'
      ]
    }
  ];

  private readonly tips: TipOption[] = [
    { amount: 1, label: 'Coffee', icon: '☕' },
    { amount: 3, label: 'Snack', icon: '🍩' },
    { amount: 5, label: 'Meal', icon: '🍕' },
    { amount: 10, label: 'Super Fan', icon: '🚀' },
    { amount: 25, label: 'Patron', icon: '👑' }
  ];

  private readonly coupons: { [code: string]: number } = {
    'WELCOME20': 20,
    'PULSE50': 50,
    'ANGULAR10': 10,
    'FREESHIP': 100
  };

  getPlans(): PaymentPlan[] {
    return this.plans;
  }

  getTipOptions(): TipOption[] {
    return this.tips;
  }

  validateCoupon(code: string): { valid: boolean; discountPercentage: number; message: string } {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) {
      return { valid: false, discountPercentage: 0, message: 'Please enter a coupon code.' };
    }
    if (this.coupons[cleanCode]) {
      return {
        valid: true,
        discountPercentage: this.coupons[cleanCode],
        message: `Success! ${this.coupons[cleanCode]}% discount applied.`
      };
    }
    return { valid: false, discountPercentage: 0, message: 'Invalid or expired coupon code.' };
  }

  processPayment(form: PaymentFormData): Observable<TransactionReceipt> {
    const discountAmount = Number(((form.amount * form.discountPercentage) / 100).toFixed(2));
    const finalAmount = Number(Math.max(0, form.amount - discountAmount).toFixed(2));

    let title = 'Payment';
    if (form.type === 'unlock') {
      title = `Unlock: "${form.targetPostTitle || 'Post #' + form.targetPostId}"`;
    } else if (form.type === 'tip') {
      title = `Tip for Author #${form.targetAuthorId}`;
    } else {
      title = form.selectedPlan?.name || 'Pulse Pro Subscription';
    }

    const receipt: TransactionReceipt = {
      id: 'tx_' + Math.random().toString(36).substring(2, 11),
      type: form.type,
      title: title,
      postId: form.targetPostId,
      authorId: form.targetAuthorId,
      planId: form.selectedPlan?.id,
      amount: form.amount,
      discount: discountAmount,
      finalAmount: finalAmount,
      paymentMethod: form.method,
      timestamp: new Date().toLocaleString(),
      status: 'completed',
      receiptNumber: 'REC-' + Math.floor(100000 + Math.random() * 900000)
    };

    // Save transaction to local storage
    this.saveReceipt(receipt);

    // Simulate payment gateway delay of 1.2 seconds
    return of(receipt).pipe(delay(1200));
  }

  private saveReceipt(receipt: TransactionReceipt): void {
    try {
      const history = this.getTransactionHistory();
      history.unshift(receipt);
      localStorage.setItem('pulsepost_transactions', JSON.stringify(history));
    } catch (e) {}
  }

  getTransactionHistory(): TransactionReceipt[] {
    try {
      const data = localStorage.getItem('pulsepost_transactions');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }
}
