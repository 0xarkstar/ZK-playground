"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ConceptCardProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  badges?: string[];
  className?: string;
  children?: React.ReactNode;
}

export function ConceptCard({
  title,
  description,
  icon: Icon,
  badges,
  className,
  children,
}: ConceptCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {badges.map((badge) => (
                  <Badge key={badge} variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  details?: string[];
}

export function StepCard({ step, title, description, details }: StepCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
            {step}
          </div>
          <div className="flex-1">
            <h4 className="font-semibold mb-1">{title}</h4>
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            {details && details.length > 0 && (
              <ul className="text-sm space-y-1 text-muted-foreground">
                {details.map((detail, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">-</span>
                    {detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ComparisonRowProps {
  label: string;
  snark: string;
  stark: string;
  highlight?: "snark" | "stark" | "none";
}

export function ComparisonRow({
  label,
  snark,
  stark,
  highlight = "none",
}: ComparisonRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b last:border-0">
      <div className="font-medium">{label}</div>
      <div
        className={cn(
          "text-center",
          highlight === "snark" && "text-green-600 dark:text-green-400 font-medium"
        )}
      >
        {snark}
      </div>
      <div
        className={cn(
          "text-center",
          highlight === "stark" && "text-green-600 dark:text-green-400 font-medium"
        )}
      >
        {stark}
      </div>
    </div>
  );
}
