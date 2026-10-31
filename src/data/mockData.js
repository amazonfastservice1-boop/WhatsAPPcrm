// WhatsApp CRM Mock Data - Multi-Country (Dubai, Saudi, Pak) & Multi-Agent

export const CHANNELS = [
  {
    id: 'all',
    name: 'All Numbers',
    flag: '🌐',
    country: 'Global',
    number: '3 Active Numbers',
    currency: 'USD',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  {
    id: 'dubai',
    name: 'Dubai / UAE Branch',
    flag: '🇦🇪',
    country: 'United Arab Emirates',
    number: '+971 50 492 8812',
    currency: 'AED',
    activeChats: 142,
    todayLeads: 38,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'saudi',
    name: 'Saudi Arabia Branch',
    flag: '🇸🇦',
    country: 'Saudi Arabia',
    number: '+966 54 810 9931',
    currency: 'SAR',
    activeChats: 118,
    todayLeads: 29,
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    id: 'pakistan',
    name: 'Meta Cloud API (+92 332 2568950)',
    flag: '🇵🇰',
    country: 'Pakistan',
    number: '+92 332 2568950',
    currency: 'PKR',
    activeChats: 84,
    todayLeads: 21,
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
  },
];

export const AGENTS = [
  {
    id: 'agent-1',
    name: 'Ali Husni',
    role: 'Admin & Team Lead',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'Available',
    assignedCount: 45,
    country: 'Global',
    isOnline: true,
  },
  {
    id: 'agent-2',
    name: 'Hamza Tariq',
    role: 'Dubai Sales Executive',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'Available',
    assignedCount: 38,
    country: '🇦🇪 UAE',
    isOnline: true,
  },
  {
    id: 'agent-3',
    name: 'Sara Al-Mansoor',
    role: 'Saudi Branch Specialist',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'Busy',
    assignedCount: 32,
    country: '🇸🇦 KSA',
    isOnline: true,
  },
  {
    id: 'agent-4',
    name: 'Bilal Khan',
    role: 'Pakistan Support Lead',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'Available',
    assignedCount: 26,
    country: '🇵🇰 PK',
    isOnline: true,
  },
  {
    id: 'agent-5',
    name: 'Fatima Zahra',
    role: 'Customer Success',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    status: 'Offline',
    assignedCount: 14,
    country: 'Global',
    isOnline: false,
  },
];

export const INITIAL_LEADS = [
  {
    id: 'lead-1',
    name: 'Sheikh Rashid Al-Nuaimi',
    phone: '+971 52 918 3401',
    channel: 'dubai',
    channelName: 'Dubai Branch (+971)',
    flag: '🇦🇪',
    currency: 'AED',
    dealValue: '28,500',
    stage: 'Proposal Sent',
    assignedTo: 'Hamza Tariq',
    assignedAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    unreadCount: 1,
    lastTime: '10:45 AM',
    tags: ['VIP Client', 'Bulk Order', 'Retail'],
    notes: [
      { id: 'n1', author: 'Hamza Tariq', text: 'Offered 10% volume discount for 50 enterprise seats. Follow-up meeting scheduled for tomorrow.', time: 'Today 10:15 AM' }
    ],
    messages: [
      { id: 'm1', sender: 'customer', text: 'Assalam o Alaikum! We are looking for custom software integration for our Dubai retail locations.', time: '10:30 AM', status: 'read' },
      { id: 'm2', sender: 'agent', agentName: 'Hamza Tariq', text: 'Wa Alaikum Assalam Sheikh Rashid! It is a pleasure. We have ready solutions for multi-store retail.', time: '10:35 AM', status: 'read' },
      { id: 'm3', sender: 'customer', text: 'Can you send the official quotation and feature brochure on WhatsApp?', time: '10:45 AM', status: 'delivered' }
    ]
  },
  {
    id: 'lead-2',
    name: 'Engr. Tariq Al-Ghamdi',
    phone: '+966 56 312 8872',
    channel: 'saudi',
    channelName: 'Saudi Branch (+966)',
    flag: '🇸🇦',
    currency: 'SAR',
    dealValue: '19,200',
    stage: 'Qualified',
    assignedTo: 'Sara Al-Mansoor',
    assignedAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    unreadCount: 2,
    lastTime: '11:15 AM',
    tags: ['Hot Lead', 'Riyadh', 'B2B'],
    notes: [
      { id: 'n2', author: 'Sara Al-Mansoor', text: 'Client requested invoice with ZATCA QR compliance.', time: '11:00 AM' }
    ],
    messages: [
      { id: 'm4', sender: 'customer', text: 'السلام عليكم ورحمة الله، هل النظام يدعم الفاتورة الإلكترونية المعتمدة؟', time: '11:10 AM', status: 'read' },
      { id: 'm5', sender: 'customer', text: 'نحتاج تفعيل في فرع الرياض وجدة خلال هذا الشهر.', time: '11:15 AM', status: 'delivered' }
    ]
  },
  {
    id: 'lead-3',
    name: 'Muhammad Usman Khan',
    phone: '+92 321 445 9012',
    channel: 'pakistan',
    channelName: 'Pakistan Branch (+92)',
    flag: '🇵🇰',
    currency: 'PKR',
    dealValue: '350,000',
    stage: 'Contacted',
    assignedTo: 'Bilal Khan',
    assignedAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastTime: '11:40 AM',
    tags: ['Follow Up', 'Lahore', 'E-commerce'],
    notes: [],
    messages: [
      { id: 'm6', sender: 'customer', text: 'Assalam o Alaikum, humara e-commerce store hai Shopify pe. WhatsApp CRM integration ki pricing share karein.', time: '11:20 AM', status: 'read' },
      { id: 'm7', sender: 'agent', agentName: 'Bilal Khan', text: 'Walaikum Assalam Usman bhai! Bilkul, Shopify integration ke sath direct WhatsApp cart recovery aur lead assignment available hai.', time: '11:40 AM', status: 'read' }
    ]
  },
  {
    id: 'lead-4',
    name: 'Elena Rostova (Apex Luxury Group)',
    phone: '+971 55 771 9023',
    channel: 'dubai',
    channelName: 'Dubai Branch (+971)',
    flag: '🇦🇪',
    currency: 'AED',
    dealValue: '45,000',
    stage: 'New Lead',
    assignedTo: 'Unassigned',
    assignedAvatar: null,
    unreadCount: 1,
    lastTime: '12:05 PM',
    tags: ['New Lead', 'High Priority', 'Luxury Real Estate'],
    notes: [],
    messages: [
      { id: 'm8', sender: 'customer', text: 'Hello, saw your WhatsApp CRM ad on Instagram. We have 15 property brokers in Dubai Marina and need auto lead assignment.', time: '12:05 PM', status: 'read' }
    ]
  },
  {
    id: 'lead-5',
    name: 'Dr. Faisal Al-Otaibi',
    phone: '+966 50 118 7643',
    channel: 'saudi',
    channelName: 'Saudi Branch (+966)',
    flag: '🇸🇦',
    currency: 'SAR',
    dealValue: '34,000',
    stage: 'Deal Won',
    assignedTo: 'Sara Al-Mansoor',
    assignedAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastTime: 'Yesterday',
    tags: ['Deal Closed', 'Medical Center', 'Annual Contract'],
    notes: [
      { id: 'n3', author: 'Sara Al-Mansoor', text: 'Payment received via bank transfer. Onboarding call scheduled.', time: 'Yesterday' }
    ],
    messages: [
      { id: 'm9', sender: 'customer', text: 'تم تحويل الدفعة الأولى، شكراً لتعاونكم.', time: 'Yesterday', status: 'read' },
      { id: 'm10', sender: 'agent', agentName: 'Sara Al-Mansoor', text: 'ألف مبروك دكتور فيصل، يسعدنا خدمتكم دائماً.', time: 'Yesterday', status: 'read' }
    ]
  },
  {
    id: 'lead-6',
    name: 'Zeeshan Ahmed',
    phone: '+92 333 519 2201',
    channel: 'pakistan',
    channelName: 'Pakistan Branch (+92)',
    flag: '🇵🇰',
    currency: 'PKR',
    dealValue: '180,000',
    stage: 'New Lead',
    assignedTo: 'Unassigned',
    assignedAvatar: null,
    unreadCount: 1,
    lastTime: '12:20 PM',
    tags: ['New Lead', 'Islamabad'],
    notes: [],
    messages: [
      { id: 'm11', sender: 'customer', text: 'Hi, can multiple agents reply to the same WhatsApp number at the same time?', time: '12:20 PM', status: 'delivered' }
    ]
  }
];

export const PIPELINE_STAGES = [
  { id: 'New Lead', title: 'New Leads', color: 'bg-amber-500', count: 2 },
  { id: 'Contacted', title: 'Contacted', color: 'bg-blue-500', count: 1 },
  { id: 'Qualified', title: 'Qualified', color: 'bg-indigo-500', count: 1 },
  { id: 'Proposal Sent', title: 'Proposal Sent', color: 'bg-orange-500', count: 1 },
  { id: 'Deal Won', title: 'Deal Won / Closed', color: 'bg-emerald-500', count: 1 },
  { id: 'Lost', title: 'Lost / Inactive', color: 'bg-slate-400', count: 0 }
];

export const QUICK_REPLIES = [
  {
    shortcut: '/pricing-dubai',
    title: 'Dubai Pricing (AED)',
    content: 'Hi! Here is our Dubai CRM package: Starter (5 Agents): 499 AED/mo | Pro (15 Agents): 1,299 AED/mo | Enterprise: Custom.'
  },
  {
    shortcut: '/pricing-saudi',
    title: 'Saudi Pricing (SAR)',
    content: 'أهلاً بك! باقات الاشتراك في السعودية: باقة البداية: 550 ريال/شهرياً | باقة الأعمال: 1,450 ريال/شهرياً شاملة الفوترة المعتمدة.'
  },
  {
    shortcut: '/pricing-pak',
    title: 'Pakistan Pricing (PKR)',
    content: 'Assalam o Alaikum! Pakistan packages: Starter (5 Agents): Rs. 25,000/month | Business (15 Agents): Rs. 65,000/month.'
  },
  {
    shortcut: '/brochure',
    title: 'Product Brochure Link',
    content: 'Please find our complete product features PDF and video demo at: https://crm-whatsapp.app/demo'
  },
  {
    shortcut: '/bank-details',
    title: 'Official Bank Accounts',
    content: 'Official accounts available in: Emirates NBD (Dubai), Al-Rajhi (KSA), and Meezan Bank (Pakistan). Please let us know your preferred method.'
  }
];

export const UPCOMING_SCHEDULE = [
  {
    id: 'sch-1',
    title: 'Sheikh Rashid Demo Call',
    channel: '🇦🇪 Dubai',
    time: '11:00 AM',
    agent: 'Hamza Tariq',
    color: 'bg-orange-500'
  },
  {
    id: 'sch-2',
    title: 'Riyadh ZATCA Onboarding',
    channel: '🇸🇦 Saudi',
    time: '02:30 PM',
    agent: 'Sara Al-Mansoor',
    color: 'bg-teal-500'
  },
  {
    id: 'sch-3',
    title: 'Karachi Wholesale Follow-up',
    channel: '🇵🇰 Pakistan',
    time: '04:00 PM',
    agent: 'Bilal Khan',
    color: 'bg-blue-500'
  }
];
