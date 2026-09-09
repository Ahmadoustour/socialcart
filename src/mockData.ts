import { User, Post, Product, Order, Conversation, NotificationItem } from './types';

export const CURRENT_USER: User = {
  id: 'usr_me',
  username: 'ahmed_dev',
  displayName: 'أحمد التميمي',
  email: 'ahmed.dev@example.com',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  bio: 'مطور برمجيات ومصمم واجهات مستخدم. شغوف بالمنتجات الرقمية والمحتوى التقني.',
  joinedDate: 'يناير 2025',
  isVerifiedSeller: true,
  sellerRating: 4.9,
  sellerReviewsCount: 38,
  totalSales: 124,
  trustScore: 99,
  savedCard: {
    cardNumber: '•••• •••• •••• 4242',
    cardHolder: 'AHMED AL-TAMIMI',
    expiry: '12/28',
    cardType: 'visa',
    last4: '4242'
  }
};

export const SAMPLE_SELLERS: User[] = [
  {
    id: 'usr_sara',
    username: 'sara_design',
    displayName: 'سارة العتيبي (ستوديو سارة)',
    email: 'sara.studio@example.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'مصممة جرافيك وواجهات مستخدم بخبرة 7 سنوات. متخصصة في حزم التصميم الاحترافية.',
    joinedDate: 'مارس 2024',
    isVerifiedSeller: true,
    sellerRating: 4.95,
    sellerReviewsCount: 52,
    totalSales: 310,
    trustScore: 99
  },
  {
    id: 'usr_omar',
    username: 'omar_coder',
    displayName: 'عمر القحطاني',
    email: 'omar.tech@example.com',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    bio: 'مهندس حلول سحابية وقوالب Full-Stack متطورة. ضمان كود نظيف وتحديثات مدى الحياة.',
    joinedDate: 'مايو 2024',
    isVerifiedSeller: true,
    sellerRating: 4.85,
    sellerReviewsCount: 29,
    totalSales: 185,
    trustScore: 97
  },
  {
    id: 'usr_noura',
    username: 'noura_academy',
    displayName: 'أكاديمية نورة للرقميات',
    email: 'noura.academy@example.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    bio: 'كتب وأدلة رقمية متقدمة في التجارة والتسويق الإلكتروني بالذكاء الاصطناعي.',
    joinedDate: 'أغسطس 2024',
    isVerifiedSeller: true,
    sellerRating: 4.9,
    sellerReviewsCount: 44,
    totalSales: 220,
    trustScore: 98
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    sellerId: 'usr_sara',
    seller: {
      username: 'sara_design',
      displayName: 'سارة العتيبي (ستوديو سارة)',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      isVerified: true,
      rating: 4.95,
      reviewsCount: 52,
      trustScore: 99
    },
    title: 'حزمة قوالب Figma للواجهات الإدارية الشاملة (SaaS Dashboard Kit)',
    description: 'أكثر من 250 شاشة مصممة بدقة متناهية، تدعم النمطين الداكن والفاتح ونظام الألوان المتغير مع مكونات برمجية جاهزة للتنفيذ.',
    category: 'تصاميم وجرافيك',
    price: 29,
    originalPrice: 49,
    media: [
      {
        id: 'm_1_1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
        caption: 'لوحة التحكم الرئيسية Dashboard'
      },
      {
        id: 'm_1_2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        caption: 'مكتبة عناصر التصميم UI Kit'
      },
      {
        id: 'm_1_3',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-1728-large.mp4',
        caption: 'فيديو توضيحي لاستخدام القالب'
      }
    ],
    fileUrl: 'https://cloud-storage.socialcart.com/files/saas-dashboard-pro-v2.fig.zip',
    downloadSize: '142 MB',
    fileType: 'Figma + Assets ZIP',
    salesCount: 168,
    likesCount: 84,
    likedByMe: true,
    createdAt: 'منذ يومين',
    escrowProtected: true,
    reviews: [
      {
        id: 'rev_1',
        buyerUsername: 'khalid_tech',
        buyerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        rating: 5,
        comment: 'قالب استثنائي ومتقن للغاية وفر علي شهور من العمل. دعم البائعة سارة ممتاز وسريع.',
        date: 'منذ أسبوع',
        productTitle: 'حزمة قوالب Figma للواجهات الإدارية الشاملة'
      },
      {
        id: 'rev_2',
        buyerUsername: 'mona_ui',
        buyerAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
        rating: 5,
        comment: 'الأوتولايوت والنظام المتغير متقن بنسبة 100%. أنصح بالشراء وبقوة!',
        date: 'منذ أسبوعين',
        productTitle: 'حزمة قوالب Figma للواجهات الإدارية الشاملة'
      }
    ]
  },
  {
    id: 'prod_2',
    sellerId: 'usr_omar',
    seller: {
      username: 'omar_coder',
      displayName: 'عمر القحطاني',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      isVerified: true,
      rating: 4.85,
      reviewsCount: 29,
      trustScore: 97
    },
    title: 'سكربت متجر إلكتروني متكامل React 19 + Node.js + Stripe',
    description: 'كود مصدري كامل لتطبيق تجارة إلكترونية وسوق رقمي مع بوابة دفع وتأكيد تلقائي وبوابة بائعين وحماية ضد الهجمات.',
    category: 'برمجة وتطوير',
    price: 45,
    originalPrice: 75,
    media: [
      {
        id: 'm_2_1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
        caption: 'الشاشات البرمجية وهيكل الكود'
      },
      {
        id: 'm_2_2',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-keyboard-and-writing-code-41480-large.mp4',
        caption: 'معاينة حية للمتجر ونظام الدفع'
      }
    ],
    fileUrl: 'https://cloud-storage.socialcart.com/files/react-ecommerce-fullstack-v4.zip',
    downloadSize: '85 MB',
    fileType: 'TypeScript Source Code',
    salesCount: 92,
    likesCount: 65,
    likedByMe: false,
    createdAt: 'منذ 4 أيام',
    escrowProtected: true,
    reviews: [
      {
        id: 'rev_3',
        buyerUsername: 'faisal_dev',
        buyerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
        rating: 5,
        comment: 'الكود منظم ونظيف والتوثيق المرفق سهل جداً في الإعداد. شكراً عمر!',
        date: 'منذ 3 أيام',
        productTitle: 'سكربت متجر إلكتروني متكامل'
      }
    ]
  },
  {
    id: 'prod_3',
    sellerId: 'usr_noura',
    seller: {
      username: 'noura_academy',
      displayName: 'أكاديمية نورة للرقميات',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      isVerified: true,
      rating: 4.9,
      reviewsCount: 44,
      trustScore: 98
    },
    title: 'الدليل الاستراتيجي الشامل لإطلاق المنتجات الرقمية وتحقيق أول 10,000$',
    description: 'كتاب إلكتروني تفاعلي مع 15 ملف إكسل وجداول تسعير وقوالب تسويق بريدي مجربة حققت مبيعات قياسية.',
    category: 'كتب وأدلة رقمية',
    price: 19,
    originalPrice: 35,
    media: [
      {
        id: 'm_3_1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
        caption: 'غلاف الكتاب الرقمي وملحقاته'
      },
      {
        id: 'm_3_2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
        caption: 'عينة من صفحات ونماذج العمل'
      }
    ],
    fileUrl: 'https://cloud-storage.socialcart.com/files/digital-products-blueprint-2026.pdf',
    downloadSize: '32 MB',
    fileType: 'PDF + Notion Templates',
    salesCount: 240,
    likesCount: 112,
    likedByMe: true,
    createdAt: 'منذ أسبوع',
    escrowProtected: true,
    reviews: [
      {
        id: 'rev_4',
        buyerUsername: 'yasmeen_m',
        buyerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        rating: 5,
        comment: 'خطوات عملية بعيداً عن التنظير. استرجعت قيمة الكتاب في أول 48 ساعة بعد تطبيق استراتيجية التسعير.',
        date: 'منذ أسبوع',
        productTitle: 'الدليل الاستراتيجي الشامل لإطلاق المنتجات الرقمية'
      }
    ]
  }
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post_1',
    userId: 'usr_sara',
    author: {
      username: 'sara_design',
      displayName: 'سارة العتيبي',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      isVerified: true
    },
    title: 'أهم 5 نصائح لتسريع نمو مبيعات المنتجات الرقمية هذا العام 💡🚀',
    description: 'خلال الأشهر الستة الماضية قمت بتجربة أساليب تسعير مختلفة للمنتجات الرقمية. إليكم أهم ما تعلمته: ركز على القيمة وليس عدد الساعات، وفر معاينة فيديو حية وواضحة، واضمن استرجاع الأموال بصدق لبناء الثقة المطلقة.',
    media: [
      {
        id: 'pm_1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
        caption: 'جلسة التخطيط الاستراتيجي'
      },
      {
        id: 'pm_2',
        type: 'video',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-working-on-laptop-with-coffee-41584-large.mp4',
        caption: 'مقطع قصير من الورشة التفاعلية'
      }
    ],
    likesCount: 47,
    likedByMe: true,
    sharesCount: 15,
    createdAt: 'منذ 3 ساعات',
    tags: ['تجارة_رقمية', 'نصائح_تصميم', 'ريادة_الأعمال'],
    comments: [
      {
        id: 'c_1',
        userId: 'usr_omar',
        username: 'omar_coder',
        userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        text: 'كلام من ذهب يا سارة، المعاينة بالفيديو ترفع معدل التحويل أكثر من 40% بالتجربة.',
        createdAt: 'منذ ساعتين'
      }
    ]
  },
  {
    id: 'post_2',
    userId: 'usr_omar',
    author: {
      username: 'omar_coder',
      displayName: 'عمر القحطاني',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      isVerified: true
    },
    title: 'تحديثات أمنية جديدة في منصات الويب وكيف تحمي كودك من الثغرات 🛡️',
    description: 'شاركنا اليوم مكتبة مفتوحة المصدر للتحقق من أمان الروابط ومصادقة بطاقات الدفع عبر خوارزمية Luhn العالمية مع حماية كاملة ضد هجمات الـ XSS و CSRF.',
    media: [
      {
        id: 'pm_3',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
        caption: 'جدار الحماية وتحليل الحزم الأمنية'
      }
    ],
    likesCount: 38,
    likedByMe: false,
    sharesCount: 8,
    createdAt: 'منذ 6 ساعات',
    tags: ['أمن_المعلومات', 'برمجة', 'ويب_سكيوريتي'],
    comments: [
      {
        id: 'c_2',
        userId: 'usr_noura',
        username: 'noura_academy',
        userAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        text: 'موضوع حيوي جداً في عصر التسوق الإلكتروني السريع، بارك الله فيك.',
        createdAt: 'منذ 4 ساعات'
      }
    ]
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_101',
    productId: 'prod_1',
    productTitle: 'حزمة قوالب Figma للواجهات الإدارية الشاملة (SaaS Dashboard Kit)',
    productImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    category: 'تصاميم وجرافيك',
    sellerUsername: 'sara_design',
    sellerDisplayName: 'سارة العتيبي (ستوديو سارة)',
    unitPrice: 29,
    quantity: 2,
    totalPaid: 58, // 2 * 29
    purchasedAt: '2026-03-05',
    downloadUrl: 'https://cloud-storage.socialcart.com/files/saas-dashboard-pro-v2.fig.zip',
    isEscrowReleased: false,
    escrowReleaseDate: '2026-03-19 (متبقي 10 أيام بحماية الضمان)',
    status: 'completed',
    hasRatedSeller: false
  },
  {
    id: 'ord_102',
    productId: 'prod_3',
    productTitle: 'الدليل الاستراتيجي الشامل لإطلاق المنتجات الرقمية وتحقيق أول 10,000$',
    productImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    category: 'كتب وأدلة رقمية',
    sellerUsername: 'noura_academy',
    sellerDisplayName: 'أكاديمية نورة للرقميات',
    unitPrice: 19,
    quantity: 1,
    totalPaid: 19,
    purchasedAt: '2026-02-28',
    downloadUrl: 'https://cloud-storage.socialcart.com/files/digital-products-blueprint-2026.pdf',
    isEscrowReleased: true,
    escrowReleaseDate: 'تم تحرير الأموال للبائعة بنجاح',
    status: 'completed',
    hasRatedSeller: true
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_omar',
    participantId: 'usr_omar',
    participantUsername: 'omar_coder',
    participantDisplayName: 'عمر القحطاني',
    participantAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    type: 'social',
    lastMessage: 'شكراً لمشاركتك المنشور الأخير، مقال ممتاز ومفيد جداً!',
    lastMessageTime: 'أمس',
    unreadCount: 0,
    messages: [
      {
        id: 'm_o1',
        senderId: 'usr_omar',
        senderUsername: 'omar_coder',
        senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        text: 'مرحباً أحمد، كيف حال مشروعك الجديد في البرمجة والتطوير؟',
        createdAt: 'أمس 04:15 م',
        isMe: false
      },
      {
        id: 'm_o2',
        senderId: 'usr_me',
        senderUsername: 'ahmed_dev',
        senderAvatar: CURRENT_USER.avatar,
        text: 'أهلاً عمر! الأمور تسير بروعة، شكراً لسؤالك وسعيد بتبادل الخبرات معك دائماً.',
        createdAt: 'أمس 04:20 م',
        isMe: true
      },
      {
        id: 'm_o3',
        senderId: 'usr_omar',
        senderUsername: 'omar_coder',
        senderAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        text: 'شكراً لمشاركتك المنشور الأخير، مقال ممتاز ومفيد جداً!',
        createdAt: 'أمس 04:25 م',
        isMe: false
      }
    ]
  },
  {
    id: 'conv_tariq',
    participantId: 'usr_tariq',
    participantUsername: 'tariq_ui',
    participantDisplayName: 'طارق السعيد (مطور واجهات)',
    participantAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    type: 'social',
    lastMessage: 'مرحباً أحمد! أعجبني أسلوبك في منشور الأمان الأخير، بالتوفيق دائماً ✨',
    lastMessageTime: 'منذ ساعتين',
    unreadCount: 1,
    messages: [
      {
        id: 'm_t1',
        senderId: 'usr_tariq',
        senderUsername: 'tariq_ui',
        senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        text: 'مرحباً أحمد! أعجبني أسلوبك في منشور الأمان الأخير، بالتوفيق دائماً ✨',
        createdAt: 'منذ ساعتين',
        isMe: false
      }
    ]
  },
  {
    id: 'conv_sara',
    participantId: 'usr_sara',
    participantUsername: 'sara_design',
    participantDisplayName: 'سارة العتيبي (ستوديو سارة)',
    participantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    type: 'market',
    relatedProductTitle: 'حزمة قوالب Figma للواجهات الإدارية الشاملة',
    lastMessage: 'أهلاً بك يا أحمد! نعم القالب متوافق تماماً مع آخر تحديثات Figma مع التحديث المجاني وتضمين الجداول التفاعلية.',
    lastMessageTime: '10:45 ص',
    unreadCount: 1,
    messages: [
      {
        id: 'm_s1',
        senderId: 'usr_me',
        senderUsername: 'ahmed_dev',
        senderAvatar: CURRENT_USER.avatar,
        text: 'مرحباً سارة، هل تتضمن حزمة قوالب فيجما مكونات الجداول المتجاوبة Responsive Tables؟',
        createdAt: '10:30 ص',
        isMe: true
      },
      {
        id: 'm_s2',
        senderId: 'usr_sara',
        senderUsername: 'sara_design',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        text: 'أهلاً بك يا أحمد! نعم القالب متوافق تماماً مع آخر تحديثات Figma مع التحديث المجاني وتضمين الجداول التفاعلية.',
        createdAt: '10:45 ص',
        isMe: false,
        media: [
          {
            id: 'cm_1',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
            caption: 'معاينة مكونات الجداول المتجاوبة'
          }
        ]
      }
    ]
  },
  {
    id: 'conv_noura',
    participantId: 'usr_noura',
    participantUsername: 'noura_academy',
    participantDisplayName: 'أكاديمية نورة للرقميات',
    participantAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    type: 'market',
    relatedProductTitle: 'الدليل الاستراتيجي الشامل لإطلاق المنتجات الرقمية',
    lastMessage: 'تم إرسال رابط التحديث الإضافي لجداول الإكسل في البريد، قراءة ممتعة!',
    lastMessageTime: 'منذ يومين',
    unreadCount: 0,
    messages: [
      {
        id: 'm_n1',
        senderId: 'usr_me',
        senderUsername: 'ahmed_dev',
        senderAvatar: CURRENT_USER.avatar,
        text: 'السلام عليكم أستاذة نورة، اشتريت الدليل وحالياً أطبق استراتيجية التسعير، هل هناك نماذج جاهزة لحساب تكلفة الاستحواذ؟',
        createdAt: 'منذ يومين',
        isMe: true
      },
      {
        id: 'm_n2',
        senderId: 'usr_noura',
        senderUsername: 'noura_academy',
        senderAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        text: 'تم إرسال رابط التحديث الإضافي لجداول الإكسل في البريد، قراءة ممتعة!',
        createdAt: 'منذ يومين',
        isMe: false
      }
    ]
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'تأكيد أمان وحماية الضمان 🛡️',
    message: 'أموال طلبك (#ord_101) محفوظة بأمان في محفظة الضمان Escrow وسيتم تسليمها للبائع بعد تأكيد رضاك التام.',
    type: 'security',
    isRead: false,
    createdAt: 'منذ ساعة',
    linkTab: 'purchases'
  },
  {
    id: 'notif_2',
    title: 'رسالة جديدة في استفسارات المتجر 💬',
    message: 'قامت البائعة @sara_design بالرد على استفسارك بخصوص حزمة قوالب Figma.',
    type: 'market',
    isRead: false,
    createdAt: 'منذ ساعتين',
    linkTab: 'messages'
  },
  {
    id: 'notif_3',
    title: 'إعجاب جديد بمنشورك ❤️',
    message: 'أعجب @omar_coder بمنشورك الأخير في مجتمع السوشيال.',
    type: 'social',
    isRead: true,
    createdAt: 'منذ 5 ساعات',
    linkTab: 'social'
  }
];
