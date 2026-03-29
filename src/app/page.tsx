'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { trackEvent, trackConversion } from '@/lib/analytics';
import {
  Check,
  Layers,
  History,
  Settings,
  Calendar,
  ArrowRight,
  Menu,
  X,
  Zap,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  CreditCard,
  Users,
  Share2,
  ClipboardList,
  MessageSquare,
  FileUp,
  LayoutGrid,
} from 'lucide-react';
import Image, { type StaticImageData } from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LandingPricing } from '@/components/billing/LandingPricing';
import { OwnerAvatar } from '@/components/shared/OwnerAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Static imports for images to ensure reliable resolution
import logoIcon from '../../public/icon.png';
import heroScreenshot from '../../public/landing/gantt-print-screen.png';
import structureImg from '../../public/landing/hierarchical-structure.png';
import rollupImg from '../../public/landing/date-rollup.png';
import snapshotImg from '../../public/landing/snapshot-save.png';
import collaboratingImg from '../../public/landing/collaborating.png';
import overdueImg from '../../public/landing/overdue.png';
import levelCustomImg from '../../public/landing/level-customization.png';
import statusCustomImg from '../../public/landing/status-customization.png';
import calendarCustomImg from '../../public/landing/calendar-customization.png';

// ─── Sub-component: Image Carousel ───────────────────────────────────────────

function ImageCarousel({ images }: { images: StaticImageData[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative group rounded-xl border border-border/60 shadow-2xl overflow-hidden bg-background ring-1 ring-white/10">
      <div className="relative aspect-video">
        {images.map((img, idx) => (
          <div
            key={idx}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              idx === current ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            <Image
              src={img}
              alt={`Slide ${idx + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              idx === current ? "bg-primary w-6" : "bg-white/40 hover:bg-white/60"
            )}
          />
        ))}
      </div>

      {/* Arrows */}
      <button
        onClick={() => setCurrent((prev) => (prev - 1 + images.length) % images.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/20 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => setCurrent((prev) => (prev + 1) % images.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/20 backdrop-blur-md border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

export default function LandingPage() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations('landing');
  const tNav = useTranslations('layout.navbar');
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  const pricingRef = useRef<HTMLDivElement>(null);
  const featuresContainerRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      icon: <Layers className="w-6 h-6 text-primary" />,
      title: t('features.hierarchicalStructure.title'),
      description: t('features.hierarchicalStructure.description'),
      bullets: [t('features.hierarchicalStructure.bullet1'), t('features.hierarchicalStructure.bullet2')],
      image: structureImg
    },
    {
      icon: <Clock className="w-6 h-6 text-primary" />,
      title: t('features.delayTracking.title'),
      description: t('features.delayTracking.description'),
      bullets: [t('features.delayTracking.bullet1'), t('features.delayTracking.bullet2')],
      image: overdueImg
    },
    {
      icon: <Zap className="w-6 h-6 text-primary" />,
      title: t('features.automatedRollups.title'),
      description: t('features.automatedRollups.description'),
      bullets: [t('features.automatedRollups.bullet1'), t('features.automatedRollups.bullet2')],
      image: rollupImg
    },
    {
      icon: <Settings className="w-6 h-6 text-primary" />,
      title: t('features.customization.title'),
      description: t('features.customization.description'),
      bullets: [t('features.customization.bullet1'), t('features.customization.bullet2')],
      images: [levelCustomImg, statusCustomImg, calendarCustomImg]
    },
    {
      icon: <History className="w-6 h-6 text-primary" />,
      title: t('features.versionSnapshots.title'),
      description: t('features.versionSnapshots.description'),
      bullets: [t('features.versionSnapshots.bullet1'), t('features.versionSnapshots.bullet2')],
      image: snapshotImg
    },
    {
      icon: <Users className="w-6 h-6 text-primary" />,
      title: t('features.realTimeCollab.title'),
      description: t('features.realTimeCollab.description'),
      bullets: [t('features.realTimeCollab.bullet1'), t('features.realTimeCollab.bullet2')],
      image: collaboratingImg
    }
  ];

  useEffect(() => {
    const el = pricingRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { trackEvent('pricing_section_view'); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const container = featuresContainerRef.current;
    if (!container) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-feature-index'));
            trackEvent('feature_view', { feature_title: features[idx]?.title });
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    container.querySelectorAll('[data-feature-index]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-12 w-12 bg-primary/20 rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Image
              src={logoIcon}
              alt="GanttFlow Logo"
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
            <span className="flex flex-col leading-tight">
              <span className="font-bold text-sm">GanttFlow</span>
              <span className="text-[9px] text-muted-foreground">by SeveroTech</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('nav.features')}</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('nav.pricing')}</a>
            <div className="flex items-center gap-3 ml-4">
              <ThemeToggle />
              <LanguageSwitcher />
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-accent transition-colors focus:outline-none text-left">
                      <OwnerAvatar
                        name={session.user?.name || 'User'}
                        avatar={session.user?.image ?? undefined}
                        size={28}
                        className="shrink-0"
                      />
                      <div className="flex flex-col pr-1">
                        <p className="text-[13px] font-medium leading-none text-foreground truncate max-w-[120px]">
                          {session.user?.name}
                        </p>
                        <p className="text-[11px] leading-none text-muted-foreground truncate max-w-[120px] mt-1">
                          {session.user?.email}
                        </p>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <Link href="/settings?section=profile">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>{tNav('myProfile')}</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings?section=billing">
                      <DropdownMenuItem className="cursor-pointer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        <span>{tNav('billing')}</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{tNav('settings')}</span>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                      onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{tNav('logOut')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">{t('nav.login')}</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">{t('nav.tryForFree')}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Nav Toggle */}
          <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-b border-border bg-background p-4 flex flex-col gap-4">
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="px-4 py-2 text-sm font-medium">{t('nav.features')}</a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="px-4 py-2 text-sm font-medium">{t('nav.pricing')}</a>
            <hr className="border-border" />
            <div className="flex justify-center items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher variant="pills" />
            </div>
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-3 px-2 py-2">
                  <OwnerAvatar
                    name={session.user?.name || 'User'}
                    avatar={session.user?.image ?? undefined}
                    size={32}
                    className="shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-medium truncate">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                  </div>
                </div>
                <Link href="/settings?section=profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent rounded-md">
                  <User size={16} className="text-muted-foreground" /> {tNav('myProfile')}
                </Link>
                <Link href="/settings?section=billing" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent rounded-md">
                  <CreditCard size={16} className="text-muted-foreground" /> {tNav('billing')}
                </Link>
                <Link href="/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent rounded-md">
                  <Settings size={16} className="text-muted-foreground" /> {tNav('settings')}
                </Link>
                <hr className="border-border" />
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-md w-full"
                >
                  <LogOut size={16} /> {tNav('logOut')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="w-full">
                  <Button variant="outline" className="w-full">{t('nav.login')}</Button>
                </Link>
                <Link
                  href="/register"
                  className="w-full"
                  onClick={() => { trackEvent('trial_signup_click', { location: 'mobile_nav' }); trackConversion(); }}
                >
                  <Button className="w-full">{t('nav.tryForFree')}</Button>
                </Link>
              </>
            )}
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-40 overflow-hidden text-center">
          <div className="container mx-auto px-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 border border-primary/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              {t('hero.headline')}
              <br className="hidden md:block" />
              <div className="mb-8 flex justify-center items-center gap-4">
                <div className="relative group">
                  <Image
                    src={logoIcon}
                    alt="GanttFlow Icon"
                    width={64}
                    height={64}
                    className="relative rounded-2xl shadow-2xl"
                  />
                </div>
                <span className="flex flex-col leading-tight">
                  <span>GanttFlow</span>
                  <span className="text-sm font-normal text-muted-foreground bg-none [-webkit-text-fill-color:unset]">by SeveroTech</span>
                </span>
              </div>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-muted-foreground mb-10 leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col items-center gap-4 justify-center mb-16">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={isLoggedIn ? '/projects' : '/register'}
                  onClick={() => { if (!isLoggedIn) { trackEvent('trial_signup_click', { location: 'hero' }); trackConversion(); } }}
                >
                  <Button size="lg" className="h-12 px-8 text-base font-semibold gap-2">
                    {isLoggedIn ? t('hero.goToProjects') : t('hero.cta')} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              {!isLoggedIn && (
                <p className="text-xs text-muted-foreground font-medium italic">
                  {t('hero.noCreditCard')}
                </p>
              )}
            </div>

            {/* Product Screenshot Container */}
            <div className="relative max-w-5xl mx-auto">
              {/* Glow effect behind the image */}
              <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-primary/5 rounded-xl blur-2xl opacity-50"></div>

              {/* The actual image */}
              <div className="relative rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm shadow-2xl overflow-hidden ring-1 ring-white/10">
                <Image
                  src={heroScreenshot}
                  alt="GanttFlow Dashboard Interface"
                  width={1200}
                  height={800}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Hero Decorative Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 opacity-10 pointer-events-none">
             <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary rounded-full blur-[120px]" />
             <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-primary rounded-full blur-[120px]" />
          </div>
        </section>

        {/* Features Section - Zig Zag Layout */}
        <section id="features" className="py-24 bg-surface-1 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">{t('features.sectionTitle')}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">{t('features.sectionSubtitle')}</p>
            </div>

            <div className="space-y-32" ref={featuresContainerRef}>
              {features.map((feature, index) => (
                <div
                  key={index}
                  data-feature-index={index}
                  className={cn(
                    "flex flex-col gap-12 lg:gap-24 items-center",
                    index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  )}
                >
                  {/* Text Content */}
                  <div className="flex-1 space-y-6">
                    <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary mb-2">
                      {feature.icon}
                    </div>
                    <h3 className="text-3xl font-bold tracking-tight">{feature.title}</h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-primary shrink-0" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Visual: Image or Carousel */}
                  <div className="flex-1 w-full relative">
                    <div className="absolute -inset-4 bg-primary/5 rounded-3xl blur-2xl lg:opacity-100 opacity-0" />

                    {feature.images ? (
                      <ImageCarousel images={feature.images} />
                    ) : (
                      <div className="relative rounded-xl border border-border/60 shadow-2xl overflow-hidden bg-background ring-1 ring-white/10 group">
                        {feature.image && (
                          <Image
                            src={feature.image}
                            alt={feature.title}
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* More Features Grid */}
        <section className="py-24 bg-background overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">{t('features.moreTitle')}</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">{t('features.moreSubtitle')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: <LayoutGrid className="w-6 h-6" />, title: t('features.kanbanBoard.title'), description: t('features.kanbanBoard.description') },
                { icon: <Share2 className="w-6 h-6" />, title: t('features.projectSharing.title'), description: t('features.projectSharing.description') },
                { icon: <ClipboardList className="w-6 h-6" />, title: t('features.changeHistory.title'), description: t('features.changeHistory.description') },
                { icon: <Calendar className="w-6 h-6" />, title: t('features.flexibleTimelines.title'), description: t('features.flexibleTimelines.description') },
                { icon: <MessageSquare className="w-6 h-6" />, title: t('features.teamComments.title'), description: t('features.teamComments.description') },
                { icon: <FileUp className="w-6 h-6" />, title: t('features.projectImport.title'), description: t('features.projectImport.description') },
              ].map((card, idx) => (
                <div
                  key={idx}
                  className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface-1 p-6 hover:border-primary/40 hover:shadow-lg transition-all duration-200"
                >
                  <div className="inline-flex w-12 h-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    {card.icon}
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div ref={pricingRef}>
          <LandingPricing />
        </div>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-8 tracking-tight">{t('cta.title')}</h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-xl mb-12">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={isLoggedIn ? '/projects' : '/register'}
                onClick={() => { if (!isLoggedIn) { trackEvent('trial_signup_click', { location: 'cta_section' }); trackConversion(); } }}
              >
                <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold">
                  {isLoggedIn ? t('hero.goToProjects') : t('cta.button')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Decorative shapes for CTA */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40 bg-surface-2 text-muted-foreground">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image
                src={logoIcon}
                alt="GanttFlow Logo"
                height={28}
                className="h-7 w-auto object-contain"
              />
              <span className="flex flex-col leading-tight">
                <span className="font-bold text-sm">GanttFlow</span>
                <span className="text-[9px] text-muted-foreground">by SeveroTech</span>
              </span>
            </Link>

            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-foreground transition-colors">{t('footer.privacyPolicy')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('footer.termsOfService')}</a>
              <a href="#" className="hover:text-foreground transition-colors">{t('footer.contactUs')}</a>
            </div>

            <p className="text-sm">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
