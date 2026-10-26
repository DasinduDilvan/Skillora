/**
 * ================================================================
 *  DUMMY DATA - Replace with API calls when backend is ready.
 *
 *  Each export mirrors the shape the backend should return.
 *  When you integrate a real API, swap the imports in each
 *  component to call `api.getXxx()` from `../services/api.js`.
 * ================================================================
 */

// ──────────────────────────────────────────────
// NAV LINKS
// ──────────────────────────────────────────────
export const navLinks = [
  { id: 1, label: 'Home', path: '/' },
  { id: 1, label: 'Browse Projects', path: '/browse' },
  { id: 2, label: 'Find Freelancers', path: '/find-freelancers' },
  { id: 3, label: 'How It Works', path: '#how-it-works' },
];

// ──────────────────────────────────────────────
// HERO
// ──────────────────────────────────────────────
export const heroData = {
  badgeCount: '2,400+',
  badgeText: 'freelancers ready to work',
  titleLine1: 'Find the Perfect',
  titleHighlight: 'Freelancer',
  titleLine2: 'for Your Next Project',
  description:
    'Skillora connects businesses with skilled freelancers worldwide. Post your project, discover top talent, and get quality work delivered - fast and reliably.',
  primaryCta: { label: 'Find a Freelancer →', path: '/freelancers' },
  secondaryCta: { label: 'Browse Projects', path: '/projects' },
  stats: [
    { id: 1, value: '12K+', label: 'Projects Completed' },
    { id: 2, value: '98%', label: 'Client Satisfaction' },
    { id: 3, value: '150+', label: 'Skill Categories' },
  ],
  profileCard: {
    initials: 'AK',
    name: 'Alex Kim',
    role: 'Full-Stack Developer',
    skills: [
      { label: 'React', highlight: true },
      { label: 'Node.js', highlight: true },
      { label: 'TypeScript', highlight: false },
      { label: 'PostgreSQL', highlight: false },
      { label: 'AWS', highlight: false },
    ],
    jobSuccess: 92,
  },
  floatingCards: {
    topRight: { icon: '✓', title: 'Project Hired', subtitle: 'Just now' },
    bottomLeft: { icon: '★', title: '4.9 Rating', subtitle: '142 reviews' },
  },
};

// ──────────────────────────────────────────────
// CATEGORIES
// ──────────────────────────────────────────────
export const categoriesData = {
  label: '📁 Categories',
  title: 'Explore Project Categories',
  subtitle:
    'Find the perfect category for your project or discover new opportunities in your field of expertise.',
  items: [
    {
      id: 1,
      icon: '💻',
      iconClass: 'web',
      title: 'Web Development',
      description: 'Full-stack, frontend, backend, CMS, and more',
      count: '2,340 projects',
    },
    {
      id: 2,
      icon: '🎨',
      iconClass: 'design',
      title: 'Graphic Design',
      description: 'Logos, branding, illustrations, and print design',
      count: '1,856 projects',
    },
    {
      id: 3,
      icon: '🎬',
      iconClass: 'video',
      title: 'Video & Animation',
      description: 'Motion graphics, editing, 3D, and VFX',
      count: '1,124 projects',
    },
    {
      id: 4,
      icon: '✏️',
      iconClass: 'uiux',
      title: 'UI/UX Design',
      description: 'User interfaces, wireframes, prototypes',
      count: '1,678 projects',
    },
  ],
};

// ──────────────────────────────────────────────
// FEATURED PROJECTS
// ──────────────────────────────────────────────
export const featuredProjectsData = {
  label: '🚀 Featured',
  title: 'Featured Projects',
  subtitle:
    'Explore trending projects from clients looking for talented freelancers like you.',
  projects: [
    {
      id: 1,
      category: 'Graphic Design',
      categoryClass: 'tag-design',
      budget: '$1,500',
      title: 'Modern Logo Design for Tech Startup',
      description:
        'We need a clean, modern logo that represents innovation and technology. Should include icon and wordmark.',
      deadline: '14 days',
      proposals: '12 proposals',
      client: { initials: 'JD', name: 'John Davis' },
    },
    {
      id: 2,
      category: 'Web Development',
      categoryClass: 'tag-dev',
      budget: '$5,000',
      title: 'E-Commerce Website with React',
      description:
        'Build a fully responsive e-commerce website with payment integration, admin panel, and user accounts.',
      deadline: '30 days',
      proposals: '24 proposals',
      client: { initials: 'SM', name: 'Sarah Mitchell' },
    },
    {
      id: 3,
      category: 'Video & Animation',
      categoryClass: 'tag-video',
      budget: '$3,000',
      title: 'Product Launch Video Campaign',
      description:
        'Create a 60-second animated explainer video for our new SaaS product launch with voiceover.',
      deadline: '21 days',
      proposals: '18 proposals',
      client: { initials: 'AK', name: 'Alex Kim' },
    },
  ],
};

// ──────────────────────────────────────────────
// ANALYTICS / STATS
// ──────────────────────────────────────────────
export const analyticsData = [
  { id: 1, target: 12000, suffix: '+', prefix: '', label: 'Active Freelancers' },
  { id: 2, target: 8500, suffix: '+', prefix: '', label: 'Projects Completed' },
  { id: 3, target: 15, suffix: 'M+', prefix: '$', label: 'Total Paid Out' },
  { id: 4, target: 98, suffix: '%', prefix: '', label: 'Client Satisfaction' },
];

// ──────────────────────────────────────────────
// HOW IT WORKS
// ──────────────────────────────────────────────
export const howItWorksData = {
  label: '💡 How It Works',
  title: 'Simple Steps to Get Started',
  subtitle:
    'Whether you\'re hiring or freelancing, Skillora makes the process seamless from start to finish.',
  tabs: [
    { id: 'clients', label: 'For Clients' },
    { id: 'freelancers', label: 'For Freelancers' },
  ],
  panels: {
    clients: {
      sectionTitle: 'Hire talent in',
      sectionHighlight: '4 simple steps',
      steps: [
        {
          id: 1,
          numberClass: 'client',
          icon: '📝',
          title: 'Post Your Project',
          description:
            'Describe your project requirements, budget, and timeline in minutes.',
        },
        {
          id: 2,
          numberClass: 'client',
          icon: '🔍',
          title: 'Find a Freelancer',
          description:
            'Browse proposals from skilled freelancers or search by expertise and reviews.',
        },
        {
          id: 3,
          numberClass: 'client',
          icon: '🤝',
          title: 'Hire & Pay Securely',
          description:
            'Choose your freelancer and pay safely through Skillora\'s escrow system.',
        },
        {
          id: 4,
          numberClass: 'client',
          icon: '🏆',
          title: 'Get Work Done',
          description:
            'Collaborate, review milestones, and receive your completed project on time.',
        },
      ],
    },
    freelancers: {
      sectionTitle: 'Start freelancing in',
      sectionHighlight: '4 easy steps',
      steps: [
        {
          id: 1,
          numberClass: 'freelancer',
          icon: '👤',
          title: 'Create Your Profile',
          description:
            'Showcase your skills, experience, and portfolio to attract potential clients.',
        },
        {
          id: 2,
          numberClass: 'freelancer',
          icon: '📌',
          title: 'Find Projects',
          description:
            'Browse projects that match your skills and interests across many categories.',
        },
        {
          id: 3,
          numberClass: 'freelancer',
          icon: '🚀',
          title: 'Apply & Deliver',
          description:
            'Submit proposals, get hired, and deliver outstanding work to your clients.',
        },
        {
          id: 4,
          numberClass: 'freelancer',
          icon: '💰',
          title: 'Earn & Grow',
          description:
            'Get paid securely and build your reputation with reviews and ratings.',
        },
      ],
    },
  },
};

// ──────────────────────────────────────────────
// FINAL CTA
// ──────────────────────────────────────────────
export const finalCtaData = {
  title: 'Ready to Build Something Amazing?',
  description:
    'Join thousands of clients and freelancers on Skillora. Whether you need talent or want to showcase yours - your journey starts here.',
  primaryCta: { label: 'Get Started →', path: '/signup' },
  secondaryCta: { label: 'Explore Projects', path: '/projects' },
};

// ──────────────────────────────────────────────
// FOOTER
// ──────────────────────────────────────────────
export const footerData = {
  brand: {
    name: 'Skillora',
    description:
      'Connecting businesses with world-class freelance talent. Build better products, faster - with the right people by your side.',
  },
  columns: [
    {
      id: 1,
      title: 'Quick Links',
      links: [
        { label: 'Browse Projects', path: '/projects' },
        { label: 'Find Freelancers', path: '/freelancers' },
        { label: 'How It Works', path: '/how-it-works' },
        { label: 'Pricing', path: '#' },
      ],
    },
    {
      id: 2,
      title: 'About',
      links: [
        { label: 'About Skillora', path: '#' },
        { label: 'Careers', path: '#' },
        { label: 'Blog', path: '#' },
      ],
    },
    {
      id: 3,
      title: 'Contact',
      links: [
        { label: 'Help Center', path: '#' },
        { label: 'Support', path: '#' },
        { label: 'Contact', path: '#' },
      ],
    },
  ],
  bottomLinks: [
    { label: 'Privacy Policy', path: '#' },
    { label: 'Terms of Service', path: '#' },
    { label: 'Cookie Policy', path: '#' },
  ],
  copyright: '© 2025 Skillora. All rights reserved.',
};