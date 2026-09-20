"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchWithAlert } from "@/lib/action-alert";
import styles from "./ProfileSettings.module.css";

type Kind = "avatar" | "banner";
type ImageEdit = { file?: Blob; url: string | null; removed?: boolean };

export function ProfileSettings({ displayName, username, avatarUrl, bannerUrl }: { displayName: string; username: string; avatarUrl: string | null; bannerUrl: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [images, setImages] = useState<Record<Kind, ImageEdit>>({ avatar: { url: avatarUrl }, banner: { url: bannerUrl } });
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), []);

  async function choose(kind: Kind, file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError("Choose a JPG, PNG or WebP image under 8 MB."); return;
    }
    setPreparing(true);
    try {
      const image = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = kind === "avatar" ? 512 : 1600;
        canvas.height = kind === "avatar" ? 512 : 372;
        const context = canvas.getContext("2d");
        if (!context) throw new Error();
        const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
        context.drawImage(image, (canvas.width - image.width * scale) / 2, (canvas.height - image.height * scale) / 2, image.width * scale, image.height * scale);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error()), "image/jpeg", .82));
        const url = URL.createObjectURL(blob);
        objectUrls.current.push(url);
        setImages(current => ({ ...current, [kind]: { url, file: blob } }));
      } finally { image.close(); }
    } catch { setError("Could not read that image. Try another file."); }
    finally { setPreparing(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || preparing) return;
    const form = new FormData();
    form.set("displayName", name.trim());
    for (const kind of ["avatar", "banner"] as const) {
      if (images[kind].file) form.set(kind, images[kind].file!, `${kind}.jpg`);
      if (images[kind].removed) form.set(`remove${kind}`, "true");
    }
    setBusy(true); setError("");
    const response = await fetchWithAlert("/api/profile/settings", { method: "POST", body: form }, { loading: "Saving profile", success: "Profile updated", error: "Could not update profile" });
    if (response.ok) {
      const data = await response.json();
      setImages({ avatar: { url: data.avatarUrl }, banner: { url: data.bannerUrl } });
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Could not update your profile. Please try again.");
    }
    setBusy(false);
  }

  return <form className={styles.form} onSubmit={save}>
    <fieldset disabled={busy || preparing}>
      <section className={styles.media}>
        <div className={styles.banner}>{images.banner.url ? <img src={images.banner.url} alt="Banner preview" /> : null}</div>
        <div className={styles.bannerButtons}>
          <button type="button" className={styles.icon} aria-label="Change banner" title="Change banner" onClick={() => bannerInput.current?.click()}><Camera size={20} /></button>
          {images.banner.url ? <button type="button" className={styles.icon} aria-label="Remove banner" title="Remove banner" onClick={() => setImages(current => ({ ...current, banner: { url: null, removed: true } }))}><Trash2 size={18} /></button> : null}
        </div>
        <button type="button" className={styles.avatar} aria-label="Change profile picture" title="Change profile picture" onClick={() => avatarInput.current?.click()}><img src={images.avatar.url || "/icons/profile.svg"} alt="Profile picture preview" /><span><Camera size={20} /></span></button>
      </section>
      <div className={styles.fields}>
        <label htmlFor="profile-name">Name</label>
        <input id="profile-name" required maxLength={16} value={name} onChange={event => setName(event.target.value)} autoComplete="name" />
        <span className={styles.handle}>@{username}</span>
        <label>Profile picture</label>
        <div className={styles.row}><button type="button" onClick={() => avatarInput.current?.click()}><Camera size={18} />Change picture</button>{images.avatar.url ? <button type="button" onClick={() => setImages(current => ({ ...current, avatar: { url: null, removed: true } }))}><Trash2 size={18} />Remove</button> : null}</div>
        <label>Banner</label>
        <button type="button" onClick={() => bannerInput.current?.click()}><Camera size={18} />Change banner</button>
        <input ref={avatarInput} className={styles.hidden} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload profile picture" onChange={event => { void choose("avatar", event.target.files?.[0]); event.target.value = ""; }} />
        <input ref={bannerInput} className={styles.hidden} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload banner" onChange={event => { void choose("banner", event.target.files?.[0]); event.target.value = ""; }} />
      </div>
    </fieldset>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <footer className={styles.footer}><button type="submit" disabled={busy || preparing || !name.trim()}><Save size={18} />{preparing ? "Preparing image" : "Save changes"}</button></footer>
  </form>;
}
