import { User, Post, Product, Order, Conversation, NotificationItem } from './types';

export const CURRENT_USER: User = {
  id: '',
  username: '',
  displayName: 'زائر',
  email: '',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  joinedDate: '2026',
  isVerifiedSeller: false,
  sellerRating: 5.0,
  sellerReviewsCount: 0,
  totalSales: 0,
  trustScore: 100,
  isEmailVerified: false,
  twoFactorEnabled: false
};

export const SAMPLE_SELLERS: User[] = [];
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_POSTS: Post[] = [];

export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_CONVERSATIONS: Conversation[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
