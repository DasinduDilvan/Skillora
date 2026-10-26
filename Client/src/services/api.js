// Change this to your backend URL when ready
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Dummy imports (remove when backend is live) ──
import {
  navLinks,
  heroData,
  categoriesData,
  featuredProjectsData,
  analyticsData,
  howItWorksData,
  finalCtaData,
  footerData,
} from '../data/dummyData';


/** Navbar links */
export async function getNavLinks() {
  // return fetcher('/nav-links');
  return navLinks;
}

/** Hero section content */
export async function getHeroData() {
  // return fetcher('/hero');
  return heroData;
}

/** Categories */
export async function getCategories() {
  // return fetcher('/categories');
  return categoriesData;
}

/** Featured projects */
export async function getFeaturedProjects() {
  // return fetcher('/projects/featured');
  return featuredProjectsData;
}

/** Analytics / stats */
export async function getAnalytics() {
  // return fetcher('/analytics');
  return analyticsData;
}

/** How-it-works content */
export async function getHowItWorks() {
  // return fetcher('/how-it-works');
  return howItWorksData;
}

/** Final CTA content */
export async function getFinalCta() {
  // return fetcher('/cta');
  return finalCtaData;
}

/** Footer content */
export async function getFooterData() {
  // return fetcher('/footer');
  return footerData;
}