export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  isVerifiedSeller: boolean;
  sellerRating: number;
  sellerReviewsCount: number;
  totalSales: number;
  trustScore: number; // e.g. 98%
  savedCard?: SavedCard;
}

export interface SavedCard {
  cardNumber: string; // masked
  cardHolder: string;
  expiry: string;
  cardType: 'visa' | 'mastercard';
  last4: string;
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  author: {
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
  };
  title: string;
  description: string;
  media: MediaItem[];
  likesCount: number;
  likedByMe: boolean;
  sharesCount: number;
  comments: Comment[];
  createdAt: string;
  tags: string[];
}

export interface SellerReview {
  id: string;
  buyerUsername: string;
  buyerAvatar: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
  productTitle: string;
}

export interface Product {
  id: string;
  sellerId: string;
  seller: {
    username: string;
    displayName: string;
    avatar: string;
    isVerified: boolean;
    rating: number;
    reviewsCount: number;
    trustScore: number;
  };
  title: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  media: MediaItem[];
  fileUrl: string;
  downloadSize?: string;
  fileType?: string;
  salesCount: number;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
  escrowProtected: boolean;
  reviews: SellerReview[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  category: string;
  sellerUsername: string;
  sellerDisplayName: string;
  unitPrice: number;
  quantity: number;
  totalPaid: number;
  purchasedAt: string;
  downloadUrl: string;
  isEscrowReleased: boolean;
  escrowReleaseDate: string;
  status: 'completed' | 'refunded' | 'disputed';
  hasRatedSeller?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatar: string;
  text: string;
  media?: MediaItem[];
  createdAt: string;
  isMe: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantUsername: string;
  participantDisplayName: string;
  participantAvatar: string;
  isVerified: boolean;
  type: 'social' | 'market';
  relatedProductTitle?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'social' | 'market' | 'security';
  isRead: boolean;
  createdAt: string;
  linkTab?: string;
}

export interface DisputeReport {
  id: string;
  orderId?: string;
  sellerUsername: string;
  productTitle?: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'refunded';
  createdAt: string;
}
