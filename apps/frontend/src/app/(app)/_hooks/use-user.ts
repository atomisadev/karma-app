"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eden } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";

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
  });

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
