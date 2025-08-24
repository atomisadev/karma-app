"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useUserProfile() {
  const { getToken, isSignedIn } = useAuth();
  const qc = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      const res = await eden.api.user.me.get({
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    enabled: isSignedIn,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  const prevKarmaRef = useRef<number | null>(null);
  const prevChallengeRef = useRef(me?.activeChallenge ?? null);

  useEffect(() => {
    if (me) {
      const currentKarma = me.karmaScore ?? null;
      const currentChallenge = me.activeChallenge ?? null;

      const prevKarma = prevKarmaRef.current;
      const prevChallenge = prevChallengeRef.current;

      if (
        prevChallenge &&
        !currentChallenge &&
        prevKarma != null &&
        currentKarma != null &&
        currentKarma < prevKarma
      ) {
        toast.error("Challenge failed", {
          description: `You lost 25 karma points.`,
          duration: 6000,
        });
      }

      prevKarmaRef.current = currentKarma;
      prevChallengeRef.current = currentChallenge;
    }
  }, [me?.karmaScore, me?.activeChallenge]);

  const saveBudgets = useMutation({
    mutationFn: async (budgets: Record<string, number>) => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      return eden.api.user.budgets.patch(
        { budgets },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });

  const completeOnboarding = useMutation({
    mutationFn: async (budgets?: Record<string, number>) => {
      const token = await getToken();
      if (!token) throw new Error("No auth token");
      return eden.api.user.onboarding.complete.post(
        budgets ? { budgets } : undefined,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user", "me"] });
    },
  });

  return {
    me,
    loading: isLoading,
    saveBudgets,
    completeOnboarding,
  };
}
