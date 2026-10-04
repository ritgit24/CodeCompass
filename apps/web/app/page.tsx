import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Landing } from "@/components/landing/landing";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <Landing />
      <SiteFooter />
    </div>
  );
}
