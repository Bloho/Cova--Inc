"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { ClassicSpinner } from "@/components/ui/classic-spinner";
import { fetchWithAlert } from "@/lib/action-alert";
import styles from "./ProfileConnections.module.css";

type Summary = { followers: number; following: number; isFollowing: boolean };
type Person = { id: string; username: string | null; display_name: string; avatar_url: string | null };

export function ProfileConnections({ profileId, isOwnProfile, isSignedIn }: { profileId: string; isOwnProfile: boolean; isSignedIn: boolean }) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [kind, setKind] = useState<"followers" | "following" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setSummary(null);
    setSummaryError(false);
    fetch(`/api/follows?id=${profileId}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(setSummary)
      .catch(() => { if (!controller.signal.aborted) setSummaryError(true); });
    return () => controller.abort();
  }, [profileId, retry]);

  async function toggle() {
    if (!isSignedIn) { router.push("/login"); return; }
    if (!summary || pending.current) return;
    const previous = summary;
    const next = !summary.isFollowing;
    pending.current = true;
    setBusy(true);
    setSummary({ ...summary, isFollowing: next, followers: Math.max(0, summary.followers + (next ? 1 : -1)) });
    try {
      const response = await fetchWithAlert("/api/follows", {
        method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: profileId })
      }, { loading: next ? "Following profile" : "Unfollowing profile", success: next ? "You are now following" : "Profile unfollowed", error: "Could not update follow. Try again." });
      if (!response.ok) setSummary(previous);
    } finally { pending.current = false; setBusy(false); }
  }

  return <div className={styles.connections}>
    {summaryError ? <button className={styles.count} onClick={() => setRetry(value => value + 1)}>Connections unavailable. Retry</button> : <>
      <button className={styles.count} disabled={!summary} onClick={() => setKind("following")}><strong>{summary?.following ?? "—"}</strong> Following</button>
      <button className={styles.count} disabled={!summary} onClick={() => setKind("followers")}><strong>{summary?.followers ?? "—"}</strong> Followers</button>
    </>}
    {!isOwnProfile ? <button className={styles.follow} disabled={busy || !summary} aria-pressed={summary?.isFollowing ?? false} onClick={() => void toggle()}>{summary?.isFollowing ? "Following" : "Follow"}</button> : null}
    <Dialog.Root open={Boolean(kind)} onOpenChange={open => { if (!open) setKind(null); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <header><Dialog.Title>{kind === "followers" ? "Followers" : "Following"}</Dialog.Title><Dialog.Close className={styles.close} aria-label="Close connections"><X size={20} /></Dialog.Close></header>
          {kind ? <ConnectionList key={`${profileId}-${kind}`} profileId={profileId} kind={kind} onNavigate={() => setKind(null)} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}

function ConnectionList({ profileId, kind, onNavigate }: { profileId: string; kind: string; onNavigate: () => void }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    fetch(`/api/follows?id=${profileId}&kind=${kind}&offset=${offset}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => {
        setPeople(current => [...new Map([...current, ...data.people.filter(Boolean)].map(person => [person.id, person])).values()]);
        setHasMore(data.hasMore);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [profileId, kind, offset, retry]);
  return <div className={styles.list}>
    {people.map(person => <div className={styles.person} key={person.id}>
      <img src={person.avatar_url || "/icons/profile.svg"} alt="" width={40} height={40} loading="lazy" decoding="async" />
      {person.username ? <Link href={`/${person.username}`} onClick={onNavigate}><strong>{person.display_name}</strong><span>@{person.username}</span></Link> : <span>{person.display_name}</span>}
    </div>)}
    {loading ? <div className={styles.feedback}><ClassicSpinner theme="dark" /></div> : error ? <button className={styles.load} onClick={() => setRetry(value => value + 1)}>Could not load. Retry</button> : hasMore ? <button className={styles.load} onClick={() => setOffset(value => value + 20)}>Load more</button> : !people.length ? <p className={styles.feedback}>{kind === "followers" ? "No followers yet." : "Not following anyone yet."}</p> : null}
  </div>;
}
