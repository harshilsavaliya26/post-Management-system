import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PostService } from '../services/post.service';
import { ToastService } from '../services/toast.service';
import { Post, Comment, Reaction, Toast } from '../models/post.model';

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './posts.html',
  styleUrl: './posts.css'
})
export class Posts implements OnInit, OnDestroy {
  private postService = inject(PostService);
  toastService = inject(ToastService);

  // Layout & Sidebar State
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  activeNav: 'all' | 'trending' | 'tags' | 'authors' | 'saved' | 'pro' = 'all';

  // Posts Feed State
  posts: Post[] = [];
  loading = false;
  total = 0;
  skip = 0;
  limit = 9;
  currentPage = 1;
  totalPages = 1;
  pages: number[] = [];

  // Filter & Search State
  searchQuery = '';
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  selectedTag = '';
  selectedUser: number | null = null;
  sortBy = 'id';
  order: 'asc' | 'desc' = 'asc';
  viewMode: 'grid' | 'list' = 'grid';

  // Tags
  tags: string[] = [];
  tagsLoading = false;

  // Bookmarks / Saved Posts
  savedPostIds = new Set<number>();

  // Selected Post for Detail & Comments Drawer
  selectedPost: Post | null = null;
  comments: Comment[] = [];
  commentsLoading = false;
  newCommentText = '';

  // Reactions tracking
  userReactions: { [postId: number]: 'like' | 'dislike' } = {};

  // =========================================================
  // Payment Gateway & Creator Pass State
  // =========================================================
  showPaymentModal = false;
  paymentStep: 'select' | 'otp' | 'processing' | 'success' = 'select';
  pricingMode: 'plans' | 'custom' = 'plans';
  selectedPlan: 'single' | 'creator' | 'unlimited' = 'single';
  currency: 'INR' | 'USD' = 'INR';
  customCredits = 1;
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet' = 'upi';

  // Customer & Billing Details (Name, Email, Mobile, Address, City)
  billingData = {
    name: '',
    email: '',
    mobile: '',
    address: '',
    city: '',
    pincode: ''
  };

  // Card details
  cardTheme: 'cyber' | 'gold' | 'emerald' | 'rose' = 'cyber';
  cardBrand: 'mastercard' | 'visa' | 'rupay' | 'amex' = 'mastercard';
  cardData = {
    number: '4532 8902 3412 8849',
    name: 'HARSHIL SAVALIYA',
    expiry: '08/29',
    cvv: '849'
  };

  // UPI details
  upiData = { vpa: 'creator@okhdfcbank' };
  upiAccountLookup = 'Verified VPA: creator@okhdfcbank (Pulse Creator)';
  upiTimerSeconds = 299;
  private upiTimerInterval: any = null;

  // Net Banking details
  bankSearchQuery = '';
  selectedBank = 'hdfc';
  bankList = [
    { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC', color: '#004c8f' },
    { id: 'sbi', name: 'State Bank of India', code: 'SBI', color: '#280071' },
    { id: 'icici', name: 'ICICI Bank', code: 'ICICI', color: '#b02a30' },
    { id: 'axis', name: 'Axis Bank', code: 'AXIS', color: '#97144d' },
    { id: 'kotak', name: 'Kotak Mahindra Bank', code: 'KOTAK', color: '#ed1c24' },
    { id: 'pnb', name: 'Punjab National Bank', code: 'PNB', color: '#a20a3a' }
  ];

  // Wallets details
  selectedWallet: 'gpay' | 'paytm' | 'amazon' | 'apple' = 'gpay';

  // Coupons & Promo Codes
  couponInput = '';
  appliedCoupon: { code: string; discountPercent?: number; isFree?: boolean; desc: string } | null = null;
  couponFeedback: { type: 'success' | 'error'; text: string } | null = null;

  // OTP Verification
  otpPhoneNumber = '+91 98765 43210';
  otpInput = '';
  otpTimerSeconds = 30;
  private otpTimerInterval: any = null;

  // Payment Processing & Receipts
  processingStatusText = 'Connecting to 256-bit secure gateway...';
  processingProgress = 0;
  private processingInterval: any = null;

  lastTransaction = {
    id: '',
    amount: '',
    planName: '',
    method: '',
    creditsAdded: 0,
    date: '',
    customerName: '',
    customerEmail: '',
    customerMobile: '',
    customerAddress: '',
    customerCity: '',
    customerPincode: ''
  };

  // Credits count for pay-per-post enforcement (0 = locked, requires payment)
  postCredits = 0;

  // Create / Edit Modal State
  showPostModal = false;
  isEditMode = false;
  saving = false;
  postForm = {
    id: 0,
    title: '',
    body: '',
    tagsString: '',
    userId: 5
  };

  // Delete Modal State
  showDeleteModal = false;
  postToDelete: Post | null = null;
  deleting = false;

  // Popular Suggested Tags for Post Creator
  popularTagList: string[] = ['angular', 'technology', 'webdev', 'javascript', 'coding', 'ai', 'design', 'future', 'productivity', 'cloud'];

  // Predefined users for assignment / filter
  userList: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 35, 50, 100];

  // User avatar gradient cache
  private avatarGradientCache = new Map<number, string>();

  ngOnInit(): void {
    // Ensure every session starts with pay-per-post required
    this.postCredits = 0;
    this.setupSearchDebounce();
    this.loadSavedBookmarks();
    this.loadTags();
    this.loadPosts();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  openPost(post: Post): void {
    this.openPostDetail(post);
  }

  // --- Sidebar & Layout Controls ---
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  setNav(nav: 'all' | 'trending' | 'tags' | 'authors' | 'saved' | 'pro'): void {
    this.activeNav = nav;
    this.closeMobileSidebar();

    if (nav === 'all') {
      this.resetAllFilters();
    } else if (nav === 'trending') {
      this.selectedTag = '';
      this.selectedUser = null;
      this.searchQuery = '';
      this.sortBy = 'views';
      this.order = 'desc';
      this.currentPage = 1;
      this.loadPosts();
      this.toastService.info('Trending', 'Showing most viewed posts');
    } else if (nav === 'saved') {
      this.currentPage = 1;
      this.toastService.info('Saved Posts', `You have ${this.savedPostIds.size} saved post(s)`);
    }
  }

  // --- Bookmarking ---
  private loadSavedBookmarks(): void {
    try {
      const saved = localStorage.getItem('pulsepost_saved');
      if (saved) {
        this.savedPostIds = new Set(JSON.parse(saved));
      }
    } catch (e) {
      this.savedPostIds = new Set();
    }
  }

  toggleBookmark(post: Post, event?: Event): void {
    if (event) event.stopPropagation();
    const id = post.id ?? 0;
    if (this.savedPostIds.has(id)) {
      this.savedPostIds.delete(id);
      this.toastService.info('Bookmark Removed', `Post #${id} removed from saved.`);
    } else {
      this.savedPostIds.add(id);
      this.toastService.success('Bookmark Saved', `Post #${id} added to saved posts!`);
    }
    try {
      localStorage.setItem('pulsepost_saved', JSON.stringify(Array.from(this.savedPostIds)));
    } catch (e) {}
  }

  isBookmarked(id?: number): boolean {
    return id ? this.savedPostIds.has(id) : false;
  }

  // --- Search & Filtering ---
  private setupSearchDebounce(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(query => {
        this.searchQuery = query;
        this.currentPage = 1;
        this.skip = 0;
        this.loadPosts();
      });
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  loadTags(): void {
    this.tagsLoading = true;
    this.postService.getTags().subscribe({
      next: tags => {
        this.tags = tags;
        this.tagsLoading = false;
      },
      error: () => {
        this.tagsLoading = false;
      }
    });
  }

  loadPosts(): void {
    this.loading = true;
    this.skip = (this.currentPage - 1) * this.limit;

    if (this.searchQuery.trim()) {
      this.postService.searchPosts(this.searchQuery.trim(), this.limit, this.skip).subscribe({
        next: res => this.handlePostsResponse(res),
        error: err => this.handleError('Error searching posts', err)
      });
    } else if (this.selectedTag) {
      this.postService.getPostsByTag(this.selectedTag, this.limit, this.skip).subscribe({
        next: res => this.handlePostsResponse(res),
        error: err => this.handleError('Error filtering by tag', err)
      });
    } else if (this.selectedUser !== null) {
      this.postService.getPostsByUser(this.selectedUser, this.limit, this.skip).subscribe({
        next: res => this.handlePostsResponse(res),
        error: err => this.handleError('Error filtering by user', err)
      });
    } else {
      const sortByParam = this.sortBy !== 'id' ? this.sortBy : undefined;
      this.postService.getPosts({
        limit: this.limit,
        skip: this.skip,
        sortBy: sortByParam,
        order: this.order
      }).subscribe({
        next: res => this.handlePostsResponse(res),
        error: err => this.handleError('Error loading posts', err)
      });
    }
  }

  private handlePostsResponse(res: { posts: Post[]; total: number; skip: number; limit: number }): void {
    if (this.activeNav === 'saved') {
      this.posts = res.posts.filter(p => this.savedPostIds.has(p.id ?? 0));
      this.total = this.posts.length;
    } else {
      this.posts = res.posts;
      this.total = res.total;
    }
    this.totalPages = Math.ceil(this.total / this.limit) || 1;
    this.calculatePagination();
    this.loading = false;
  }

  private handleError(message: string, error: any): void {
    this.loading = false;
    this.toastService.error('Error', message);
    console.error(message, error);
  }

  private calculatePagination(): void {
    const current = this.currentPage;
    const total = this.totalPages;
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      range.unshift(-1);
    }
    if (current + delta < total - 1) {
      range.push(-2);
    }

    range.unshift(1);
    if (total > 1) {
      range.push(total);
    }

    this.pages = range;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setLimit(newLimit: number): void {
    this.limit = newLimit;
    this.currentPage = 1;
    this.loadPosts();
  }

  selectTag(tag: string): void {
    if (this.selectedTag === tag) {
      this.selectedTag = '';
    } else {
      this.selectedTag = tag;
      this.selectedUser = null;
      this.searchQuery = '';
      this.activeNav = 'tags';
    }
    this.closeMobileSidebar();
    this.currentPage = 1;
    this.loadPosts();
  }

  selectUser(userId: number | null): void {
    this.selectedUser = userId;
    if (userId !== null) {
      this.selectedTag = '';
      this.searchQuery = '';
      this.activeNav = 'authors';
    }
    this.closeMobileSidebar();
    this.currentPage = 1;
    this.loadPosts();
  }

  onSortChange(): void {
    this.currentPage = 1;
    this.loadPosts();
  }

  toggleOrder(): void {
    this.order = this.order === 'asc' ? 'desc' : 'asc';
    this.currentPage = 1;
    this.loadPosts();
  }

  resetAllFilters(): void {
    this.searchQuery = '';
    this.selectedTag = '';
    this.selectedUser = null;
    this.sortBy = 'id';
    this.order = 'asc';
    this.activeNav = 'all';
    this.currentPage = 1;
    this.loadPosts();
  }

  // --- Post Details & Comments Modal ---
  openPostDetail(post: Post): void {
    this.selectedPost = post;
    this.comments = [];
    this.newCommentText = '';
    this.loadComments(post.id ?? 1);
  }

  closePostDetail(): void {
    this.selectedPost = null;
    this.comments = [];
  }

  loadComments(postId: number): void {
    this.commentsLoading = true;
    this.postService.getPostComments(postId).subscribe({
      next: res => {
        this.comments = res.comments;
        this.commentsLoading = false;
      },
      error: () => {
        this.commentsLoading = false;
        this.comments = [
          {
            id: 991,
            body: 'Insightful thoughts and very well structured!',
            postId: postId,
            likes: 5,
            user: { id: 14, username: 'sofia_dev', fullName: 'Sofia Chen' }
          }
        ];
      }
    });
  }

  addComment(): void {
    if (!this.newCommentText.trim() || !this.selectedPost) return;

    const newComment: Comment = {
      id: Date.now(),
      body: this.newCommentText.trim(),
      postId: this.selectedPost.id ?? 0,
      likes: 0,
      user: {
        id: 777,
        username: 'you_explorer',
        fullName: 'You (Author)'
      },
      createdAt: 'Just now'
    };

    this.comments = [newComment, ...this.comments];
    this.newCommentText = '';
    this.toastService.success('Comment Added', 'Your comment was posted successfully!');
  }

  // --- Like / Dislike Interaction ---
  toggleReaction(post: Post, type: 'like' | 'dislike', event?: Event): void {
    if (event) event.stopPropagation();
    const postId = post.id ?? 0;
    const currentReaction = this.userReactions[postId];

    const likes = typeof post.reactions === 'object' && post.reactions !== null ? post.reactions.likes : Number(post.reactions || 0);
    const dislikes = typeof post.reactions === 'object' && post.reactions !== null ? post.reactions.dislikes : 0;

    let newLikes = likes;
    let newDislikes = dislikes;

    if (currentReaction === type) {
      delete this.userReactions[postId];
      if (type === 'like') newLikes = Math.max(0, likes - 1);
      if (type === 'dislike') newDislikes = Math.max(0, dislikes - 1);
    } else {
      if (currentReaction === 'like') newLikes = Math.max(0, likes - 1);
      if (currentReaction === 'dislike') newDislikes = Math.max(0, dislikes - 1);

      if (type === 'like') newLikes += 1;
      if (type === 'dislike') newDislikes += 1;

      this.userReactions[postId] = type;
      this.toastService.info(type === 'like' ? '❤️ Liked!' : '👎 Disliked', `Feedback saved for post #${postId}`);
    }

    post.reactions = { likes: newLikes, dislikes: newDislikes };
  }

  getLikesCount(post: Post): number {
    if (typeof post.reactions === 'object' && post.reactions !== null) {
      return post.reactions.likes;
    }
    return Number(post.reactions || 0);
  }

  getDislikesCount(post: Post): number {
    if (typeof post.reactions === 'object' && post.reactions !== null) {
      return post.reactions.dislikes;
    }
    return 0;
  }

  // =========================================================
  // Payment Gateway Methods & Logic
  // =========================================================

  onNewPostClicked(): void {
    // ALWAYS open the payment checkout first when New Post is clicked
    this.openPaymentModal();
  }

  openPaymentModal(): void {
    this.paymentStep = 'select';
    this.otpInput = '';
    this.couponFeedback = null;
    this.showPaymentModal = true;
    this.startUpiTimer();
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.clearPaymentTimers();
  }

  setCurrency(curr: 'INR' | 'USD'): void {
    this.currency = curr;
  }

  setPricingMode(mode: 'plans' | 'custom'): void {
    this.pricingMode = mode;
  }

  selectPlan(plan: 'single' | 'creator' | 'unlimited'): void {
    this.selectedPlan = plan;
  }

  changeCustomCredits(delta: number): void {
    this.customCredits = Math.max(1, Math.min(50, this.customCredits + delta));
  }

  selectPaymentMethod(method: 'upi' | 'card' | 'netbanking' | 'wallet'): void {
    this.paymentMethod = method;
    if (method === 'upi') {
      this.startUpiTimer();
    }
  }

  setCardTheme(theme: 'cyber' | 'gold' | 'emerald' | 'rose'): void {
    this.cardTheme = theme;
  }

  onCardNumberInput(event: any): void {
    const raw = event.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    this.cardData.number = formatted;

    // Auto-detect brand
    if (raw.startsWith('4')) {
      this.cardBrand = 'visa';
    } else if (raw.startsWith('5') || raw.startsWith('2')) {
      this.cardBrand = 'mastercard';
    } else if (raw.startsWith('6') || raw.startsWith('508')) {
      this.cardBrand = 'rupay';
    } else if (raw.startsWith('34') || raw.startsWith('37')) {
      this.cardBrand = 'amex';
    } else {
      this.cardBrand = 'mastercard';
    }
  }

  onCardExpiryInput(event: any): void {
    let raw = event.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2, 4);
    }
    this.cardData.expiry = raw;
  }

  getFilteredBanks() {
    if (!this.bankSearchQuery.trim()) return this.bankList;
    const q = this.bankSearchQuery.toLowerCase();
    return this.bankList.filter(b => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q));
  }

  // Pricing calculations
  getBaseSubtotal(): number {
    if (this.pricingMode === 'plans') {
      switch (this.selectedPlan) {
        case 'single': return 49;
        case 'creator': return 149;
        case 'unlimited': return 399;
      }
    } else {
      // Custom quantity tiered pricing
      const qty = this.customCredits;
      if (qty === 1) return 49;
      if (qty < 5) return qty * 45;
      if (qty < 10) return qty * 35;
      return qty * 25; // 49% discount for 10+
    }
  }

  getPlanName(): string {
    if (this.pricingMode === 'plans') {
      switch (this.selectedPlan) {
        case 'single': return 'Single Post Pass (1 Credit)';
        case 'creator': return 'Creator Pro Pass (5 Credits)';
        case 'unlimited': return 'Lifetime VIP Author Pass (Unlimited)';
      }
    }
    return `Custom Pack (${this.customCredits} Post Credits)`;
  }

  getDiscountAmount(): number {
    if (!this.appliedCoupon) return 0;
    if (this.appliedCoupon.isFree) return this.getBaseSubtotal();
    if (this.appliedCoupon.discountPercent) {
      return Math.round((this.getBaseSubtotal() * this.appliedCoupon.discountPercent) / 100);
    }
    return 0;
  }

  getTaxAmount(): number {
    const discounted = Math.max(0, this.getBaseSubtotal() - this.getDiscountAmount());
    return Math.round(discounted * 0.18); // 18% GST / fee
  }

  getTotalPayable(): number {
    const discounted = Math.max(0, this.getBaseSubtotal() - this.getDiscountAmount());
    if (discounted === 0) return 0;
    return discounted + this.getTaxAmount();
  }

  formatAmount(inrAmount: number): string {
    if (this.currency === 'USD') {
      const usd = (inrAmount / 83.5).toFixed(2);
      return `$${usd}`;
    }
    return `₹${inrAmount}`;
  }

  // Coupon handling
  applyCoupon(): void {
    const code = this.couponInput.trim().toUpperCase();
    if (code === 'CREATOR50') {
      this.appliedCoupon = { code: 'CREATOR50', discountPercent: 50, desc: '50% Creator Discount Applied' };
      this.couponFeedback = { type: 'success', text: '🎉 50% discount successfully applied!' };
      this.toastService.success('Coupon Applied', '50% discount applied to your checkout!');
    } else if (code === 'SAVE20') {
      this.appliedCoupon = { code: 'SAVE20', discountPercent: 20, desc: '20% Launch Savings' };
      this.couponFeedback = { type: 'success', text: '✨ 20% discount applied!' };
      this.toastService.success('Coupon Applied', '20% discount applied!');
    } else if (code === 'FREEPASS') {
      this.appliedCoupon = { code: 'FREEPASS', isFree: true, desc: '100% Free Demo Creator Pass' };
      this.couponFeedback = { type: 'success', text: '🎁 100% Free Pass unlocked!' };
      this.toastService.success('Free Pass', 'Free publishing pass unlocked!');
    } else {
      this.couponFeedback = { type: 'error', text: 'Invalid coupon code. Try CREATOR50, SAVE20 or FREEPASS.' };
      this.toastService.error('Invalid Coupon', 'Please enter a valid coupon code.');
    }
  }

  removeCoupon(): void {
    this.appliedCoupon = null;
    this.couponInput = '';
    this.couponFeedback = null;
  }

  // UPI Timer & QR Session
  startUpiTimer(): void {
    if (this.upiTimerInterval) clearInterval(this.upiTimerInterval);
    this.upiTimerSeconds = 299;
    this.upiTimerInterval = setInterval(() => {
      if (this.upiTimerSeconds > 0) {
        this.upiTimerSeconds--;
      } else {
        clearInterval(this.upiTimerInterval);
      }
    }, 1000);
  }

  getUpiTimerFormatted(): string {
    const mins = Math.floor(this.upiTimerSeconds / 60);
    const secs = this.upiTimerSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  refreshQrSession(): void {
    this.startUpiTimer();
    this.toastService.info('QR Refreshed', 'New UPI payment QR generated.');
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard?.writeText(text);
    this.toastService.info('Copied', `${label} copied to clipboard!`);
  }

  // OTP Verification Flow
  requestOtpVerification(): void {
    if (!this.billingData.name.trim() || !this.billingData.email.trim() || !this.billingData.mobile.trim()) {
      this.toastService.warning('Billing Details Required', 'Please enter your Name, Email, and Mobile number.');
    }
    if (this.billingData.mobile.trim()) {
      this.otpPhoneNumber = '+91 ' + this.billingData.mobile.trim();
    }
    this.paymentStep = 'otp';
    this.otpInput = '';
    this.otpTimerSeconds = 30;
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    this.otpTimerInterval = setInterval(() => {
      if (this.otpTimerSeconds > 0) {
        this.otpTimerSeconds--;
      } else {
        clearInterval(this.otpTimerInterval);
      }
    }, 1000);
    this.toastService.info('OTP Sent', `6-digit authorization code dispatched to ${this.otpPhoneNumber}`);
  }

  autoFillTestOtp(): void {
    this.otpInput = '849201';
  }

  confirmOtpAndPay(): void {
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    this.processPayment(false);
  }

  onBillingNameInput(): void {
    if (this.billingData.name) {
      this.cardData.name = this.billingData.name.toUpperCase();
    }
  }

  // Execute Payment Simulation
  processPayment(isInstant = false): void {
    this.clearPaymentTimers();
    this.paymentStep = 'processing';
    this.processingProgress = 0;
    this.processingStatusText = 'Connecting to 256-bit secure gateway...';

    const creditsToAdd = this.pricingMode === 'plans' 
      ? (this.selectedPlan === 'single' ? 1 : (this.selectedPlan === 'creator' ? 5 : 999))
      : this.customCredits;

    const totalAmount = this.formatAmount(this.getTotalPayable());
    const txId = 'TXN_' + Math.random().toString(36).substring(2, 9).toUpperCase();

    const speed = isInstant ? 200 : 400;

    this.processingInterval = setInterval(() => {
      this.processingProgress += isInstant ? 25 : 15;

      if (this.processingProgress === 30 || this.processingProgress === 25) {
        this.processingStatusText = 'Authenticating 256-bit SSL transaction...';
      } else if (this.processingProgress === 60 || this.processingProgress === 50) {
        this.processingStatusText = 'Verifying bank authorization & clearing...';
      } else if (this.processingProgress === 85 || this.processingProgress === 75) {
        this.processingStatusText = 'Activating Creator Post Publishing Pass...';
      }

      if (this.processingProgress >= 100) {
        clearInterval(this.processingInterval);
        this.paymentStep = 'success';
        this.postCredits = creditsToAdd;

        this.lastTransaction = {
          id: txId,
          amount: totalAmount,
          planName: this.getPlanName(),
          method: this.paymentMethod.toUpperCase(),
          creditsAdded: creditsToAdd,
          date: new Date().toLocaleString(),
          customerName: this.billingData.name || 'Harshil Savaliya',
          customerEmail: this.billingData.email || 'harshil.savaliya@example.com',
          customerMobile: this.billingData.mobile || '9876543210',
          customerAddress: this.billingData.address || '402, Royal Heights, Ring Road',
          customerCity: this.billingData.city || 'Surat',
          customerPincode: this.billingData.pincode || '395007'
        };

        this.toastService.success('Payment Approved!', `Pass activated: +${creditsToAdd === 999 ? 'Unlimited VIP' : creditsToAdd + ' Posts'}`);
      }
    }, speed);
  }

  proceedToCreatePostFromPayment(): void {
    this.closePaymentModal();
    this.openCreateModal();
  }

  private clearPaymentTimers(): void {
    if (this.upiTimerInterval) clearInterval(this.upiTimerInterval);
    if (this.otpTimerInterval) clearInterval(this.otpTimerInterval);
    if (this.processingInterval) clearInterval(this.processingInterval);
  }

  toggleTagInForm(tag: string): void {
    const currentTags = this.postForm.tagsString
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    const index = currentTags.indexOf(tag.toLowerCase());
    if (index !== -1) {
      currentTags.splice(index, 1);
    } else {
      currentTags.push(tag.toLowerCase());
    }

    this.postForm.tagsString = currentTags.join(', ');
  }

  isTagSelectedInForm(tag: string): boolean {
    const currentTags = this.postForm.tagsString
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);
    return currentTags.includes(tag.toLowerCase());
  }

  getPostWordCount(): number {
    return this.postForm.body ? this.postForm.body.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  }

  // --- Create / Edit Post Modal ---
  openCreateModal(): void {
    this.isEditMode = false;
    this.postForm = {
      id: 0,
      title: '',
      body: '',
      tagsString: 'technology, inspiration, future',
      userId: 5
    };
    this.showPostModal = true;
  }

  openEditModal(post: Post, event?: Event): void {
    if (event) event.stopPropagation();
    this.isEditMode = true;
    this.postForm = {
      id: post.id ?? 0,
      title: post.title,
      body: post.body,
      tagsString: (post.tags || []).join(', '),
      userId: post.userId || 1
    };
    this.showPostModal = true;
  }

  closePostModal(): void {
    this.showPostModal = false;
  }

  savePost(): void {
    if (!this.postForm.title.trim() || !this.postForm.body.trim()) {
      this.toastService.warning('Validation', 'Please fill in both title and body content.');
      return;
    }

    const tagsArray = this.postForm.tagsString
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    this.saving = true;

    if (this.isEditMode) {
      const updatePayload: Partial<Post> = {
        title: this.postForm.title.trim(),
        body: this.postForm.body.trim(),
        tags: tagsArray,
        userId: Number(this.postForm.userId)
      };

      this.postService.updatePost(this.postForm.id, updatePayload).subscribe({
        next: updated => {
          this.saving = false;
          const index = this.posts.findIndex(p => p.id === this.postForm.id);
          if (index !== -1) {
            this.posts[index] = { ...this.posts[index], ...updated, tags: tagsArray };
          }
          if (this.selectedPost && this.selectedPost.id === this.postForm.id) {
            this.selectedPost = { ...this.selectedPost, ...updated, tags: tagsArray };
          }
          this.closePostModal();
          this.toastService.success('Success', `Post #${this.postForm.id} updated!`);
        },
        error: err => {
          this.saving = false;
          this.handleError('Failed to update post', err);
        }
      });
    } else {
      const createPayload = {
        title: this.postForm.title.trim(),
        body: this.postForm.body.trim(),
        tags: tagsArray,
        userId: Number(this.postForm.userId)
      };

      this.postService.createPost(createPayload).subscribe({
        next: created => {
          this.saving = false;
          const newPost: Post = {
            ...created,
            tags: tagsArray,
            reactions: { likes: 0, dislikes: 0 },
            views: 1
          };
          this.posts = [newPost, ...this.posts];
          this.total += 1;
          // Consume 1 post credit pass:
          this.postCredits = Math.max(0, this.postCredits - 1);
          this.closePostModal();
          this.toastService.success('Post Published', '🎉 Your post is live! Publishing pass consumed.');
        },
        error: err => {
          this.saving = false;
          this.handleError('Failed to create post', err);
        }
      });
    }
  }

  // --- Delete Post ---
  confirmDelete(post: Post, event?: Event): void {
    if (event) event.stopPropagation();
    this.postToDelete = post;
    this.showDeleteModal = true;
  }

  cancelDelete(): void {
    this.postToDelete = null;
    this.showDeleteModal = false;
  }

  executeDelete(): void {
    if (!this.postToDelete || !this.postToDelete.id) return;
    const id = this.postToDelete.id;
    this.deleting = true;

    this.postService.deletePost(id).subscribe({
      next: () => {
        this.deleting = false;
        this.posts = this.posts.filter(p => p.id !== id);
        this.total = Math.max(0, this.total - 1);
        if (this.selectedPost && this.selectedPost.id === id) {
          this.closePostDetail();
        }
        this.showDeleteModal = false;
        this.toastService.success('Deleted', `Post #${id} was deleted successfully.`);
      },
      error: err => {
        this.deleting = false;
        this.handleError('Failed to delete post', err);
      }
    });
  }

  // --- Helpers ---
  getEstimatedReadTime(body: string): string {
    const words = body ? body.trim().split(/\s+/).length : 0;
    const minutes = Math.max(1, Math.ceil(words / 40));
    return `${minutes} min read`;
  }

  getUserAvatarGradient(userId: number): string {
    if (this.avatarGradientCache.has(userId)) {
      return this.avatarGradientCache.get(userId)!;
    }
    const gradients = [
      'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
      'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
      'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)'
    ];
    const gradient = gradients[userId % gradients.length];
    this.avatarGradientCache.set(userId, gradient);
    return gradient;
  }

  copyPostLink(post: Post, event?: Event): void {
    if (event) event.stopPropagation();
    const url = `https://dummyjson.com/posts/${post.id}`;
    navigator.clipboard?.writeText(url);
    this.toastService.info('Copied', 'Post API URL copied to clipboard!');
  }
}