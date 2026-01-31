"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Eye,
  Vote,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigation = [
    {
      name: t("education"),
      href: "/education/snark",
      icon: BookOpen,
      children: [
        { name: t("snark"), href: "/education/snark" },
        { name: t("stark"), href: "/education/stark" },
        { name: t("comparison"), href: "/education/comparison" },
      ],
    },
    {
      name: t("visualization"),
      href: "/visualization/circuit",
      icon: Eye,
      children: [
        { name: t("circuit"), href: "/visualization/circuit" },
        { name: t("proofProcess"), href: "/visualization/proof" },
      ],
    },
    {
      name: t("demo"),
      href: "/demo/voting",
      icon: Vote,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname === "/en" || pathname === "/ko";
    // Handle locale prefixes in pathname
    const cleanPathname = pathname.replace(/^\/(en|ko)/, "");
    return cleanPathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            ZK
          </div>
          <span className="font-bold text-xl">Playground</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navigation.map((item) => (
            <div key={item.name} className="relative group">
              <Link href={item.href}>
                <Button
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
              {item.children && (
                <div className="absolute left-0 top-full pt-2 hidden group-hover:block">
                  <div className="bg-popover border rounded-lg shadow-lg p-2 min-w-[160px]">
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href}>
                        <div
                          className={cn(
                            "px-3 py-2 rounded-md text-sm hover:bg-accent",
                            isActive(child.href) && "bg-accent"
                          )}
                        >
                          {child.name}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <LanguageSwitcher />

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4 space-y-2">
          {navigation.map((item) => (
            <div key={item.name}>
              <Link
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                    isActive(item.href)
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
              </Link>
              {item.children && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div
                        className={cn(
                          "px-3 py-2 rounded-md text-sm",
                          isActive(child.href)
                            ? "bg-accent"
                            : "hover:bg-accent"
                        )}
                      >
                        {child.name}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
