'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import Image, { type StaticImageData } from 'next/image';
import { cn } from '@/lib/utils';

// Static imports for images to ensure reliable resolution
import logoIcon from '../../public/icon.png';
import heroScreenshot from '../../public/landing/gantt-print-screen.png';
import structureImg from '../../public/landing/hierarchical-structure.png';
import rollupImg from '../../public/landing/date-rollup.png';
import snapshotImg from '../../public/landing/snapshot-save.png';
import overdueImg from '../../public/landing/overdue.png';
import timelineImg from '../../public/landing/flexible-timelines.png';
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
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push('/projects');
    }
  }, [status, session, router]);

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

  const features = [
    {
      icon: <Layers className="w-6 h-6 text-primary" />,
      title: "Hierarchical Project Structure",
      description: "Organize your work into three clean levels: Epics, Features, and Tasks. Maintain perfect clarity on complex projects.",
      image: structureImg
    },
    {
      icon: <Zap className="w-6 h-6 text-primary" />,
      title: "Automated Date Rollups",
      description: "Save time as child tasks automatically update their parent dates and progress percentages. Syncing is effortless.",
      image: rollupImg
    },
    {
      icon: <History className="w-6 h-6 text-primary" />,
      title: "Version Snapshots",
      description: "Capture the entire state of your project at any moment. Browse history and restore previous versions with a single click.",
      image: snapshotImg
    },
    {
      icon: <Clock className="w-6 h-6 text-primary" />,
      title: "Proactive Delay Tracking",
      description: "Instantly see overdue items and delay counts. Our visual health indicators keep you ahead of every deadline.",
      image: overdueImg
    },
    {
      icon: <Settings className="w-6 h-6 text-primary" />,
      title: "Deep Customization",
      description: "Tailor your workspace with custom statuses, colors, and level naming to match your team's specific workflow.",
      images: [levelCustomImg, statusCustomImg, calendarCustomImg]
    },
    {
      icon: <Calendar className="w-6 h-6 text-primary" />,
      title: "Flexible Timelines",
      description: "Visualize your roadmap across multiple scales, from daily tasks to quarterly strategic goals.",
      image: timelineImg
    }
  ];

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
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <div className="flex items-center gap-4 ml-4">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Try for Free</Button>
              </Link>
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
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="px-4 py-2 text-sm font-medium">Features</a>
            <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="px-4 py-2 text-sm font-medium">Pricing</a>
            <hr className="border-border" />
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full">Log in</Button>
            </Link>
            <Link href="/register" className="w-full">
              <Button className="w-full">Try for Free</Button>
            </Link>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-40 overflow-hidden text-center">
          <div className="container mx-auto px-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 border border-primary/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Free 30-Day Trial Available Now</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              Master Your Timeline with
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
                GanttFlow
              </div>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-muted-foreground mb-10 leading-relaxed">
              The professional project management tool designed for teams who need more than just a list. Visualize, track, and deliver complex roadmaps with ease.
            </p>

            <div className="flex flex-col items-center gap-4 justify-center mb-16">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 text-base font-semibold gap-2">
                    Start 30-Day Free Trial <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="h-12 px-8 text-base font-semibold">
                    View Demo
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground font-medium italic">
                No credit card required. Setup in 2 minutes.
              </p>
            </div>

            {/* Product Screenshot Container */}
            <div className="relative max-w-5xl mx-auto">
              {/* Glow effect behind the image */}
              <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 to-blue-600/20 rounded-xl blur-2xl opacity-50"></div>

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
             <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]" />
          </div>
        </section>

        {/* Features Section - Zig Zag Layout */}
        <section id="features" className="py-24 bg-surface-1 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="text-center mb-24">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Built for Serious Project Delivery</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">Everything you need to manage complex hierarchies and strict deadlines in one powerful interface.</p>
            </div>

            <div className="space-y-32">
              {features.map((feature, index) => (
                <div
                  key={index}
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
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-500" />
                        Eliminate manual spreadsheet updates
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-emerald-500" />
                        Maintain single source of truth for the team
                      </li>
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

        {/* Pricing Section */}
        <section id="pricing" className="py-24 border-t border-border/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Choose the plan that fits your team. All plans include a 30-day free trial with no commitment.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Monthly Plan */}
              <div className="relative p-8 rounded-3xl border border-border bg-surface-2 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">Monthly Plan</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">R$ 20,00</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {[
                    "Unlimited Projects",
                    "30-day Free Trial",
                    "Version Snapshots",
                    "Full Hierarchical Support",
                    "Custom Statuses & Workflows",
                    "24/7 Priority Support"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/register">
                  <Button variant="outline" className="w-full h-12 text-base font-semibold">Start Free Trial</Button>
                </Link>
              </div>

              {/* Yearly Plan */}
              <div className="relative p-8 rounded-3xl border-2 border-primary bg-surface-2 flex flex-col shadow-xl shadow-primary/10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                  Best Value — Save 16%
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">Yearly Plan</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">R$ 200,00</span>
                    <span className="text-muted-foreground text-sm">/year</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {[
                    "Everything in Monthly Plan",
                    "30-day Free Trial",
                    "Significant Annual Savings",
                    "Priority Feature Access",
                    "Advanced Team Controls",
                    "Data Export & API Access"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/register">
                  <Button className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20">Get Started Yearly</Button>
                </Link>
              </div>
            </div>

            <p className="text-center mt-12 text-sm text-muted-foreground">
              Prices are in Brazilian Real (BRL). Cancel anytime during your 30-day trial.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-8 tracking-tight">Ready to Take Control of Your Projects?</h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto text-xl mb-12">
              Join thousands of teams who trust GanttFlow to visualize their success and meet their goals on time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold">
                  Start Your 30-Day Trial
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
            </Link>

            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact Us</a>
            </div>

            <p className="text-sm">
              © {new Date().getFullYear()} GanttFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
