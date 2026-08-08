"use client";

import { useEffect, useState } from "react";

export function HomeGreeting({ username }: { username: string | null }) {
  const [period, setPeriod] = useState("morning");

  useEffect(() => {
    const hour = new Date().getHours();
    setPeriod(hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : hour >= 17 && hour < 21 ? "evening" : "night");
  }, []);

  return <>{username ? `Good ${period}, ${username}` : "Please sign in"}</>;
}
