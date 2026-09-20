import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });

  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2_200_000) { await reader.cancel(); return NextResponse.json({ error: "Images are too large." }, { status: 413 }); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    form = await new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: bytes }).formData();
  } catch { return NextResponse.json({ error: "Invalid profile form." }, { status: 400 }); }
  const name = form.get("displayName");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 16) return NextResponse.json({ error: "Name should be 1-16 characters." }, { status: 400 });

  const files: Partial<Record<"avatar" | "banner", Uint8Array>> = {};
  for (const kind of ["avatar", "banner"] as const) {
    const file = form.get(kind);
    if (!file) continue;
    if (typeof file === "string" || file.type !== "image/jpeg" || file.size > 1048576) return NextResponse.json({ error: "Use JPEG images under 1 MB after resizing." }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return NextResponse.json({ error: "Invalid image." }, { status: 400 });
    files[kind] = bytes;
  }
  const { data: profile, error: readError } = await supabase.from("profiles").select("avatar_url, banner_url").eq("id", user.id).single();
  if (readError || !profile) return NextResponse.json({ error: "Profile settings are not available yet. Please try again later." }, { status: 503 });
  const update = { display_name: name.trim(), avatar_url: profile.avatar_url as string | null, banner_url: profile.banner_url as string | null };
  const uploaded: string[] = [];
  try {
    for (const kind of ["avatar", "banner"] as const) {
      const column = `${kind}_url` as const;
      if (form.get(`remove${kind}`) === "true") update[column] = null;
      if (files[kind]) {
        const path = `${user.id}/${kind}-${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("profile-media").upload(path, files[kind]!, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
        if (error) throw error;
        uploaded.push(path);
        update[column] = supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl;
      }
    }
    const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
    if (error) throw error;
  } catch {
    if (uploaded.length) await supabase.storage.from("profile-media").remove(uploaded);
    return NextResponse.json({ error: "Could not save your profile. Your changes are still here to retry." }, { status: 500 });
  }
  return NextResponse.json({ avatarUrl: update.avatar_url, bannerUrl: update.banner_url }, { headers: { "Cache-Control": "no-store" } });
}
