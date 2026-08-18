import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const actorId = claimsData?.claims?.sub;
  if (!actorId) return NextResponse.json({ message: "نشست معتبر نیست." }, { status: 401 });
  const formData = await request.formData().catch(() => null);
  const image = formData?.get("avatar");
  if (!(image instanceof File) || image.size === 0) return NextResponse.json({ message: "تصویر پروفایل را انتخاب کنید." }, { status: 400 });
  const extension = allowedTypes.get(image.type);
  if (!extension || image.size > 3 * 1024 * 1024) return NextResponse.json({ message: "تصویر باید JPG، PNG یا WEBP و حداکثر ۳ مگابایت باشد." }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("avatar_path, is_active").eq("id", actorId).maybeSingle();
  if (!profile?.is_active) return NextResponse.json({ message: "حساب کاربری فعال نیست." }, { status: 403 });
  const path = `${actorId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from("profile-avatars").upload(path, image, { contentType: image.type, upsert: false });
  if (uploadError) return NextResponse.json({ message: "بارگذاری تصویر انجام نشد." }, { status: 500 });
  const { error: updateError } = await admin.from("profiles").update({ avatar_path: path }).eq("id", actorId);
  if (updateError) {
    await admin.storage.from("profile-avatars").remove([path]);
    return NextResponse.json({ message: "ذخیره تصویر پروفایل انجام نشد." }, { status: 500 });
  }
  if (profile.avatar_path) await admin.storage.from("profile-avatars").remove([profile.avatar_path]);
  const { data } = admin.storage.from("profile-avatars").getPublicUrl(path);
  return NextResponse.json({ avatarPath: path, avatarUrl: data.publicUrl, message: "تصویر پروفایل به‌روزرسانی شد." });
}
