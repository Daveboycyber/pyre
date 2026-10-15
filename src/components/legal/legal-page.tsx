import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export type LegalSection = { title: string; body: ReactNode };

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 lg:py-20">
        <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">{eyebrow}</p>
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
        <p className="mt-6 max-w-xl text-base text-muted-foreground">{intro}</p>

        <div className="mt-12 divide-y divide-border border-t border-border">
          {sections.map((section, i) => (
            <section
              key={section.title}
              className="grid gap-3 py-8 sm:grid-cols-[3rem_minmax(0,1fr)]"
            >
              <p className="font-display text-xl text-primary italic">
                {String(i + 1).padStart(2, "0")}
              </p>
              <div>
                <h2 className="text-lg font-medium">{section.title}</h2>
                <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                  {section.body}
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
