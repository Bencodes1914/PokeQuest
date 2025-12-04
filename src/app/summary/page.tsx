"use client";

import { useGameState } from "@/hooks/use-game-state";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { DailySummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PixelatedCard } from "@/components/game/PixelatedCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, ChevronsUp, Flame, TrendingUp } from "lucide-react";

export default function SummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearSummary } = useGameState();
  const [summary, setSummary] = useState<DailySummary | null>(null);

  useEffect(() => {
    const summaryData = searchParams.get('data');
    if (summaryData) {
      try {
        setSummary(JSON.parse(summaryData));
      } catch (error) {
        router.replace('/');
      }
    } else {
        router.replace('/');
    }
  }, [searchParams, router]);

  const handleContinue = () => {
    clearSummary();
    router.replace('/');
  };
  
  const getOutcomeMessage = () => {
    if (!summary) return { message: "", icon: null };
    switch (summary.outcome) {
      case 'win':
        return { message: "You beat your rivals!", icon: <Award className="w-8 h-8 text-primary" /> };
      case 'loss':
        return { message: "Your rivals outpaced you!", icon: <TrendingUp className="w-8 h-8 text-destructive" /> };
      case 'tie':
        return { message: "It was a close call!", icon: <ChevronsUp className="w-8 h-8 text-muted-foreground" /> };
    }
  };

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-4 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const { message, icon } = getOutcomeMessage();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <PixelatedCard className="w-full max-w-md p-6 text-center">
        <h1 className="text-3xl font-bold font-headline mb-2">Daily Summary</h1>
        <p className="text-muted-foreground mb-6">For {new Date(summary.date).toLocaleDateString()}</p>

        <div className="flex justify-center items-center gap-2 text-2xl font-bold mb-6">
            {icon}
            <span>{message}</span>
        </div>

        <div className="space-y-4 text-left mb-8">
            <div className="flex justify-between items-center text-lg">
                <span className="font-bold">Your XP Gained:</span>
                <span className="font-bold text-primary">+{summary.userXpGained.toFixed(0)} XP</span>
            </div>
            <div className="flex justify-between items-center text-lg">
                <div className="font-bold flex items-center gap-2"><Flame className="w-5 h-5 text-destructive" /> Streak:</div>
                <span className="font-bold">{summary.streak} Days</span>
            </div>

            <div>
                <h3 className="font-bold text-lg mb-2">Rival Activity:</h3>
                <div className="space-y-2 text-sm max-h-40 overflow-y-auto pr-2">
                {summary.rivalsXpGained.map(r => (
                    <div key={r.rivalId} className="p-2 border-2 border-foreground/20">
                        <div className="flex justify-between font-bold">
                            <span>{r.rivalId}</span>
                            <span className="text-primary">+{r.xpGained.toFixed(0)} XP</span>
                        </div>
                        <p className="text-muted-foreground italic">"{r.reason}"</p>
                    </div>
                ))}
                </div>
            </div>
        </div>

        <Button onClick={handleContinue} size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          Start New Day
        </Button>
      </PixelatedCard>
    </div>
  );
}
