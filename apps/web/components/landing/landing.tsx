"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { RepoUrlForm } from "./repo-url-form";
import { DashboardPreview } from "./dashboard-preview";
import { FEATURES, STEPS, fadeUp, stagger } from "./content";

export function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-hero-glow" />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(60%_50%_at_50%_0%,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="flex flex-col items-start"
          >
            <motion.div variants={fadeUp}>
              <Badge variant="primary" className="mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary-2)]" />
                AI onboarding for any repository
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="max-w-3xl text-2xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-[52px]"
            >
              Understand any codebase. <span className="text-gradient">Ship your first PR.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-2xl text-base text-muted">
              Paste a GitHub URL. CodeCompass maps the architecture, answers your questions with
              cited sources, ranks open issues by difficulty, and walks you through a reviewable
              first contribution.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 w-full">
              <RepoUrlForm />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps from URL to pull request"
          subtitle="Every step is inspectable and reversible. You stay in the driver's seat."
        />
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((step, i) => (
            <motion.div key={step.title} variants={fadeUp}>
              <Card className="h-full p-5 transition-transform hover:-translate-y-1">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevated text-[var(--primary-2)]">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-muted">0{i + 1}</span>
                </div>
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{step.body}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Demo / preview */}
      <section id="demo" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="The product"
          title="Everything you need for a confident first contribution"
          subtitle="Built for students, new hires, and maintainers who want better first-time PRs."
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mt-10"
        >
          <DashboardPreview />
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-5">
              <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-elevated text-[var(--primary-2)]">
                <feature.icon className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{feature.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary-2)]">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold tracking-[-0.02em] sm:text-[28px]">{title}</h2>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>
    </div>
  );
}
