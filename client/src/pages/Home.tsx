import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  ShieldCheck,
  FileText,
  Wind,
  MapPin,
  Menu,
  X,
  ArrowRight,
  Plane,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// --- Schema Definition ---
const formSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Address is required." }),
  cityStateZip: z.string().min(5, { message: "City, State, ZIP is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  phone: z.string().min(10, { message: "Phone number is required." }),
  promoCode: z.string().optional(),
  roofAge: z.string().optional(),
  roofConcerns: z.string().optional(),
  handsOnInspection: z.boolean().optional(),
  disclaimer: z.boolean().refine((val) => val === true, {
    message: "You must acknowledge the disclaimer.",
  }),
});

export default function Home() {
  const { user, loading, error, isAuthenticated, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [isPromoValid, setIsPromoValid] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();

  // Check URL params for success/cancelled
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Payment successful! Your report request has been received. We will contact you shortly.");
      // Clear the URL params
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (params.get("cancelled") === "true") {
      toast.error("Payment was cancelled. Please try again when you're ready.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // tRPC mutations
  const validatePromoMutation = trpc.report.validatePromo.useMutation();
  const submitReportMutation = trpc.report.submit.useMutation();

  // Form handling
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      address: "",
      cityStateZip: "",
      email: "",
      phone: "",
      promoCode: "",
      roofAge: "",
      roofConcerns: "",
      handsOnInspection: false,
      disclaimer: false,
    },
  });

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle promo code validation
  const handleValidatePromo = async (code: string) => {
    if (code.trim().length === 0) {
      setIsPromoApplied(false);
      setIsPromoValid(false);
      return;
    }

    try {
      const result = await validatePromoMutation.mutateAsync({ code: code.trim() });
      if (result.valid) {
        setIsPromoApplied(true);
        setIsPromoValid(true);
        form.setValue("promoCode", code.toUpperCase());
        toast.success("Promo code applied! Fee will be waived.");
      } else {
        setIsPromoApplied(false);
        setIsPromoValid(false);
        toast.error("Invalid promo code. Standard $199 fee applies.");
      }
    } catch (err) {
      console.error("Error validating promo:", err);
      setIsPromoApplied(false);
      setIsPromoValid(false);
    }
  };

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await submitReportMutation.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        address: values.address,
        cityStateZip: values.cityStateZip,
        roofAge: values.roofAge,
        roofConcerns: values.roofConcerns,
        handsOnInspection: values.handsOnInspection,
        promoCode: values.promoCode,
      });

      if (result.requiresPayment && result.checkoutUrl) {
        // Redirect to Stripe checkout
        toast.info("Redirecting to secure payment...");
        window.open(result.checkoutUrl, "_blank");
      } else {
        // Free submission successful - store data and redirect to thank you page
        sessionStorage.setItem("submissionName", values.fullName);
        sessionStorage.setItem("submissionEmail", values.email);
        sessionStorage.setItem("submissionPaid", "false");
        sessionStorage.setItem("submissionHandsOn", values.handsOnInspection ? "true" : "false");
        
        form.reset();
        setPromoCode("");
        setIsPromoApplied(false);
        setIsPromoValid(false);
        
        // Redirect to thank you page
        setLocation("/thank-you");
      }
    } catch (err: any) {
      console.error("Error submitting form:", err);
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* --- Navigation --- */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-border py-3"
            : "bg-transparent border-transparent py-5"
        }`}
      >
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 overflow-hidden rounded-full border border-primary/50 shadow-[0_0_15px_rgba(0,255,240,0.3)]">
              <img src="/images/logo.jpg" alt="NextDoor Logo" className="object-cover w-full h-full" />
            </div>
            <span className="font-heading font-bold text-xl tracking-wider uppercase text-white">
              NextDoor <span className="text-primary">Exterior</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection("features")} className="text-sm font-medium hover:text-primary transition-colors">
              What's Included
            </button>
            <button onClick={() => scrollToSection("how-it-works")} className="text-sm font-medium hover:text-primary transition-colors">
              Process
            </button>
            <button onClick={() => scrollToSection("faq")} className="text-sm font-medium hover:text-primary transition-colors">
              FAQ
            </button>
            <a href="/portal" className="text-sm font-medium hover:text-primary transition-colors">
              Check Job Status
            </a>
            <Button 
              onClick={() => scrollToSection("request-form")}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold tracking-wide"
            >
              Get Report
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
            <button onClick={() => scrollToSection("features")} className="text-left py-2 hover:text-primary">
              What's Included
            </button>
            <button onClick={() => scrollToSection("how-it-works")} className="text-left py-2 hover:text-primary">
              Process
            </button>
            <button onClick={() => scrollToSection("faq")} className="text-left py-2 hover:text-primary">
              FAQ
            </button>
            <a href="/portal" className="text-left py-2 hover:text-primary block">
              Check Job Status
            </a>
            <Button onClick={() => scrollToSection("request-form")} className="w-full font-heading font-bold">
              Get Report
            </Button>
          </div>
        )}
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-drone-scan.jpg"
            alt="Drone scanning roof"
            className="w-full h-full object-cover opacity-60"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          
          {/* Grid Overlay Effect */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        </div>

        <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-in slide-in-from-left-10 duration-700 fade-in">
            <Badge variant="outline" className="border-primary text-primary px-4 py-1 text-sm font-mono tracking-widest uppercase bg-primary/10 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Professional Inspection
            </Badge>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight text-white">
              PREMIUM <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-600">
                STORM REPORT
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Secure your property with documentation. Includes high-resolution drone imagery, official NOAA storm data, and a certified contractor's condition summary.
              <span className="text-white font-medium block mt-2">
                Don't wait for a claim denial, get the proof you need today.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => scrollToSection("request-form")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold text-lg px-8 h-14 shadow-[0_0_20px_rgba(0,255,240,0.3)] hover:shadow-[0_0_30px_rgba(0,255,240,0.5)] transition-all"
              >
                Get My Storm Report <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => scrollToSection("how-it-works")}
                className="border-white/20 text-white hover:bg-white/10 h-14 font-heading"
              >
                How It Works
              </Button>
            </div>
            
            <div className="flex items-center gap-4 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Licensed Contractor</span>
              </div>
              <Separator orientation="vertical" className="h-4 bg-white/20" />
              <div className="flex items-center gap-1">
                <Plane className="w-4 h-4 text-primary" />
                <span>FAA Compliant</span>
              </div>
            </div>
          </div>

          {/* Right Side Visual - "Scanner" Card */}
          <div className="hidden lg:block relative animate-in slide-in-from-right-10 duration-1000 fade-in delay-200">
            <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
              
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="font-mono text-xs text-primary tracking-widest">LIVE FEED // DRONE-01</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">LAT: 28.5383 N | LON: 81.3792 W</span>
              </div>
              
              <div className="relative aspect-video bg-black">
                <img src="/images/noaa-data-viz.jpg" alt="Data Viz" className="w-full h-full object-cover opacity-80" loading="lazy" decoding="async" />
                
                {/* Data Points Overlay */}
                <div className="absolute top-1/4 left-1/4 p-2 border border-primary/50 bg-black/60 backdrop-blur text-[10px] font-mono text-primary">
                  WIND: 45 MPH
                </div>
                <div className="absolute bottom-1/3 right-1/4 p-2 border border-primary/50 bg-black/60 backdrop-blur text-[10px] font-mono text-primary">
                  HAIL: DETECTED
                </div>
              </div>
              
              <div className="p-4 grid grid-cols-3 gap-4 text-center border-t border-white/10 bg-white/5">
                <div>
                  <div className="text-xs text-muted-foreground font-mono uppercase">Wind Speed</div>
                  <div className="text-xl font-heading font-bold text-white">High</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono uppercase">Hail Risk</div>
                  <div className="text-xl font-heading font-bold text-primary">Elevated</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono uppercase">Status</div>
                  <div className="text-xl font-heading font-bold text-white">Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="py-24 bg-background relative">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Comprehensive <span className="text-primary">Storm Intelligence</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              We combine advanced aerial technology with official meteorological data to provide a complete picture of your property's condition.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <Card className="bg-card border-white/5 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-heading text-xl">Drone Imagery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  High-resolution 4K aerial photos of your entire roof system, captured safely using FAA-compliant drone operations.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="bg-card border-white/5 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Wind className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-heading text-xl">NOAA Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Verified storm event history for your specific location, including wind speeds, storm paths, and hail signatures.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="bg-card border-white/5 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-heading text-xl">Expert Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Visual condition notes from a licensed Florida roofing contractor (CCC-1334600) for maintenance planning.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="bg-card border-white/5 hover:border-primary/50 transition-all duration-300 group">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-heading text-xl">Digital Report</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A complete, time-stamped PDF documentation packet delivered directly to your email inbox for your records.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* --- Pricing Section --- */}
      <section className="py-20 bg-secondary/30 border-y border-white/5">
        <div className="container">
          <div className="bg-gradient-to-br from-card to-background border border-white/10 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
                  <ShieldCheck className="w-3 h-3" /> Premium Package
                </div>
                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
                  Complete Documentation <br/> <span className="text-primary">$199.00</span>
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Don't rely on guesswork. Our professional storm documentation package provides the indisputable evidence you need for maintenance planning or insurance discussions.
                </p>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-white">Drone Inspection</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-white">Official NOAA Storm History Report</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    <span className="text-white">Certified Contractor Condition Summary</span>
                  </li>
                </ul>

                <Button 
                  onClick={() => scrollToSection("request-form")}
                  className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-heading font-bold text-lg"
                >
                  Order Report Now
                </Button>
              </div>
              
              <div className="relative">
                <img 
                  src="/images/report-mockup.jpg" 
                  alt="Report Preview" 
                  className="rounded-lg shadow-2xl border border-white/10 transform rotate-2 hover:rotate-0 transition-transform duration-500"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute -bottom-6 -left-6 bg-background border border-white/10 p-4 rounded-lg shadow-xl flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase font-mono">Package Value</div>
                    <div className="text-lg font-bold text-muted-foreground">$450.00</div>
                  </div>
                  <div className="h-8 w-px bg-white/20"></div>
                  <div>
                    <div className="text-xs text-primary uppercase font-mono font-bold">Your Price</div>
                    <div className="text-2xl font-bold text-white">$199.00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- How It Works --- */}
      <section id="how-it-works" className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Streamlined Process</h2>
            <p className="text-muted-foreground">Four simple steps to secure your property documentation.</p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2 z-0"></div>

            <div className="grid md:grid-cols-4 gap-8 relative z-10">
              {[
                { 
                  step: "01", 
                  title: "Request Report", 
                  desc: "Submit your address and promo code through our secure form." 
                },
                { 
                  step: "02", 
                  title: "Tech Review", 
                  desc: "We confirm your address and add you to the flight plan." 
                },
                { 
                  step: "03", 
                  title: "Drone Capture", 
                  desc: "Our team gathers aerial images and aligns them with NOAA data." 
                },
                { 
                  step: "04", 
                  title: "Delivery", 
                  desc: "Your PDF report arrives in your inbox within 48 hours." 
                }
              ].map((item, index) => (
                <div key={index} className="bg-card border border-white/5 p-6 rounded-xl relative group hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-10 h-10 rounded-full bg-secondary border border-white/10 flex items-center justify-center font-mono font-bold text-primary mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                    {item.step}
                  </div>
                  <h3 className="font-heading font-bold text-xl mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-sm text-muted-foreground bg-secondary/50 inline-block px-4 py-2 rounded-full border border-white/5">
              <ShieldCheck className="w-4 h-4 inline mr-2 text-primary" />
              No obligation. This documentation is for your information and maintenance planning.
            </p>
          </div>
        </div>
      </section>

      {/* --- Form Section --- */}
      <section id="request-form" className="py-24 bg-secondary/20 relative">
        <div className="absolute inset-0 bg-[url('/images/drone-operator.jpg')] bg-cover bg-center opacity-10 mix-blend-overlay fixed-bg"></div>
        
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-primary/10 p-6 border-b border-white/10 text-center">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-white">Order Your Report</h2>
              <p className="text-sm text-muted-foreground mt-2">Complete the form below to schedule your inspection.</p>
              <div className="mt-3 text-lg font-heading font-bold text-primary">
                {isPromoValid ? "FREE (Promo Applied)" : "$199.00"}
              </div>
            </div>
            
            <div className="p-6 md:p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Palm Ave" {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="cityStateZip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City, State, ZIP</FormLabel>
                          <FormControl>
                            <Input placeholder="Orlando, FL 32801" {...field} className="bg-background/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="roofAge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Approx. Roof Age (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select age range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0-5">0-5 Years</SelectItem>
                              <SelectItem value="6-10">6-10 Years</SelectItem>
                              <SelectItem value="11-15">11-15 Years</SelectItem>
                              <SelectItem value="15+">15+ Years</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john@example.com" {...field} className="bg-background/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} className="bg-background/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Roof Concerns */}
                  <FormField
                    control={form.control}
                    name="roofConcerns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specific Roof Concerns (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe any known issues, e.g., 'Active leak on south side', 'Missing shingles near chimney', 'Water stains in attic'..." 
                            {...field} 
                            className="bg-background/50 min-h-[80px] resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Hands-On Inspection Option */}
                  <FormField
                    control={form.control}
                    name="handsOnInspection"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-primary/30 p-4 bg-primary/5">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-2 border-primary bg-background/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-heading font-bold text-white cursor-pointer">
                            Add Hands-On Inspection
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Request an in-person inspection with one of our certified technicians in addition to the drone survey.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {/* Neighborhood Promo Section */}
                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-start gap-3 mb-4">
                      <MapPin className="w-5 h-5 text-primary mt-1" />
                      <div>
                        <h4 className="font-heading font-bold text-white">Neighborhood Survey In Progress?</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          If we are currently working in your neighborhood, you may have received a door hanger with a code to waive the $199 fee.
                        </p>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="promoCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs uppercase tracking-wider text-primary">Enter Promo Code</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                placeholder="Enter code" 
                                {...field} 
                                value={promoCode}
                                onChange={(e) => {
                                  const value = e.target.value.toUpperCase();
                                  setPromoCode(value);
                                  field.onChange(value);
                                }}
                                className={`bg-background/50 font-mono uppercase ${isPromoValid ? "border-primary text-primary" : ""}`}
                              />
                            </FormControl>
                            <Button 
                              type="button"
                              variant="outline"
                              onClick={() => handleValidatePromo(promoCode)}
                              disabled={validatePromoMutation.isPending || promoCode.length === 0}
                              className="border-primary text-primary hover:bg-primary/10"
                            >
                              {validatePromoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                            </Button>
                          </div>
                          {isPromoValid && (
                            <div className="text-primary flex items-center gap-1 text-xs font-bold mt-2">
                              <CheckCircle2 className="w-4 h-4" /> FEE WAIVED - $0.00
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="disclaimer"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-white/10 p-4 bg-secondary/30">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-2 border-primary bg-background/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-xs text-muted-foreground font-normal leading-relaxed block">
                            I understand this report is for documentation and maintenance purposes only and does not constitute an insurance claim or coverage decision.
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-12 text-lg font-heading font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,240,0.2)]"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                    ) : isPromoValid ? (
                      "Submit Free Request"
                    ) : (
                      "Pay $199 & Schedule Report"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ Section --- */}
      <section id="faq" className="py-24 bg-background">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {[
              {
                q: "Is this report really free with a promo code?",
                a: "Yes, if you received a door hanger with a promo code during our neighborhood survey period, the $199 Storm Documentation Report is completely free. The code waives the fee while we are conducting inspections in your area."
              },
              {
                q: "Does this start an insurance claim?",
                a: "No. This report is for your personal documentation and maintenance planning only. It is not an insurance claim, nor does it constitute insurance advice."
              },
              {
                q: "Do I need to be home during the inspection?",
                a: "Yes, for insurance purposes you must be home during the inspection. If you used a promo code, your inspection is scheduled when we are already in your neighborhood. Call 727-318-0006 for exact scheduling information."
              },
              {
                q: "How long does it take to get my report?",
                a: "Paid customers receive their PDF report within 48 hours. If you used a promo code, your report timing is subject to when we complete the neighborhood survey. Call 727-318-0006 if you're curious about the schedule."
              },
              {
                q: "Will a drone fly over my home?",
                a: "A drone will only fly over your home if you opt-in by submitting a request. If you do not want to be included in the survey or have a drone near your home, please call 727-318-0006 to request exclusion."
              }
            ].map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-white/10 bg-card px-4 rounded-lg">
                <AccordionTrigger className="hover:text-primary text-left font-medium">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* --- Trust Strip --- */}
      <section className="py-8 bg-secondary border-t border-white/5">
        <div className="container flex flex-wrap justify-center gap-8 md:gap-16 text-muted-foreground text-sm font-medium uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Licensed & Insured
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            CCC-1334600
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Serving Central Florida
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full border border-primary/50 overflow-hidden">
                   <img src="/images/logo.jpg" alt="Logo" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                </div>
                <span className="font-heading font-bold text-lg text-white">NextDoor Exterior Solutions</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs">
                Providing professional storm documentation and roofing services to Florida homeowners using advanced technology.
              </p>
            </div>
            
            <div>
              <h4 className="font-heading font-bold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://nextdoorextroofing.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Nextdoorextroofing.com</a></li>
                <li>info@nextdoorextroofing.com</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-heading font-bold text-white mb-4">About Us</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => toast.info("Visit nextdoorextroofing.com for our full story")} className="hover:text-primary transition-colors text-left">Our Story</button></li>
                <li><button onClick={() => toast.info("Visit nextdoorextroofing.com for our full services")} className="hover:text-primary transition-colors text-left">Full Services</button></li>
                <li><button onClick={() => scrollToSection("request-form")} className="hover:text-primary transition-colors text-left">Contact Us</button></li>
                <li><a href="/portal" className="hover:text-primary transition-colors">Check Job Status</a></li>
              </ul>
            </div>
          </div>
          
          <Separator className="bg-white/10 mb-8" />
          
          <div className="text-xs text-muted-foreground space-y-4">
            <div className="flex items-start gap-2 p-4 bg-secondary/20 rounded-lg border border-white/5">
              <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p>
                <strong>Compliance Disclaimer:</strong> Storm documentation services are provided by Next Door Exterior Solutions, a licensed Florida roofing contractor. All observations are visual and based on publicly available NOAA data. This report is for informational and maintenance purposes only and does not constitute insurance advice, a coverage determination, or public adjusting services.
              </p>
            </div>
            
            <div className="text-center pt-4 space-y-2">
              <p>&copy; {new Date().getFullYear()} Next Door Exterior Solutions. All Rights Reserved.</p>
              <p>
                <a href="https://nextdoorextroofing.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                  Visit our main website: Nextdoorextroofing.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
