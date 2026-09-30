export interface PaymentPlan {
  id: string;
  name: string;
  tagline: string;
  price: number;
  period: 'month' | 'year' | 'one-time';
  popular?: boolean;
  features: string[];
}

export interface TipOption {
  amount: number;
  label: string;
  icon: string;
}

export interface BillingDetails {
  name: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  pincode?: string;
}

export interface TransactionReceipt {
  id: string;
  type: 'tip' | 'subscription' | 'unlock';
  title: string;
  postId?: number;
  authorId?: number;
  planId?: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: 'card' | 'upi' | 'wallet';
  timestamp: string;
  status: 'completed' | 'failed' | 'pending';
  receiptNumber: string;
  billing?: BillingDetails;
}

export interface PaymentFormData {
  type: 'tip' | 'subscription' | 'unlock';
  targetPostId?: number;
  targetPostTitle?: string;
  targetAuthorId?: number;
  targetAuthorName?: string;
  selectedPlan?: PaymentPlan;
  amount: number;
  method: 'card' | 'upi' | 'wallet';
  cardNumber: string;
  cardName: string;
  cardExpiry: string;
  cardCvc: string;
  upiId: string;
  couponCode: string;
  discountPercentage: number;
  billing?: BillingDetails;
}
