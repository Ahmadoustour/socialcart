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
export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_sarah_welcome',
    participantId: 'usr_sarah_art',
    participantUsername: 'sarah_art',
    participantDisplayName: 'سارة أحمد',
    participantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    participants: ['sarah_art'],
    isVerified: true,
    type: 'social',
    lastMessage: 'مرحباً بك في المجتمع! يسعدني تواصلك ونتطلع لمشاركاتك وإبداعاتك معنا.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    unreadCount: 0,
    messages: [
      {
        id: 'msg_sarah_welcome_1',
        senderId: 'usr_sarah_art',
        senderUsername: 'sarah_art',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'مرحباً بك في المجتمع! يسعدني تواصلك ونتطلع لمشاركاتك وإبداعاتك معنا.',
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        isMe: false
      }
    ]
  },
  {
    id: 'conv_ahmed_inquiry',
    participantId: 'usr_ahmed_tech',
    participantUsername: 'ahmed_tech',
    participantDisplayName: 'أحمد محمود',
    participantAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    participants: ['ahmed_tech'],
    isVerified: true,
    type: 'market',
    relatedProductTitle: 'سماعات سوني اللاسلكية WH-1000XM5',
    lastMessage: 'أهلاً بك! المنتج متوفر حالياً مع ضمان سنتين وتوصيل مجاني خلال 24 ساعة.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    unreadCount: 0,
    messages: [
      {
        id: 'msg_ahmed_inquiry_1',
        senderId: 'usr_ahmed_tech',
        senderUsername: 'ahmed_tech',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'أهلاً بك عزيزي المشتري! يسعدنا استفسارك عن منتجاتنا التقنية.',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        isMe: false
      },
      {
        id: 'msg_ahmed_inquiry_2',
        senderId: 'usr_ahmed_tech',
        senderUsername: 'ahmed_tech',
        senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        text: 'المنتج متوفر حالياً مع ضمان سنتين وتوصيل مجاني خلال 24 ساعة. هل تود تأكيد حجز طلبك؟',
        createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        isMe: false
      }
    ]
  }
];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
