# MinePlus Android

پروژه Android Studio برای نسخه موبایل سامانه MinePlus است. رابط اصلی از دامنه امن `https://list-mine.vercel.app` بارگذاری می‌شود و نشست ورود، آپلود تصویر، pull-to-refresh، deep link، مدیریت بازگشت و صفحه آفلاین را پشتیبانی می‌کند.

## خروجی آماده

نسخه `1.0.0` با شناسه `app.mineplus` ساخته و با کلید اختصاصی انتشار امضا شده است:

- `releases/MinePlus-1.0.0-release.apk` برای نصب مستقیم
- `releases/MinePlus-1.0.0-release.aab` برای انتشار در Google Play

فایل‌های خروجی و کلید امضا عمداً در Git قرار نمی‌گیرند. کلید دائمی در مسیر `/Users/ben/.mineplus-signing/mineplus-release.jks` با alias برابر `mineplus-release` نگهداری می‌شود. رمزهای کلید در Keychain مک با سرویس‌های `MinePlus Release Store Password` و `MinePlus Release Key Password` ذخیره شده‌اند.

## پیش‌نیاز ساخت مجدد

- Android Studio جدید با JDK 17
- Android SDK 37 و Build Tools 36
- Gradle 9.5 (Android Studio هنگام Sync دریافت می‌کند)

پوشه `android` را در Android Studio باز کنید و Gradle Sync را اجرا کنید. Gradle Wrapper نسخه صحیح را به‌صورت خودکار دریافت می‌کند.

برای بازیابی امن رمزهای امضا در همین مک می‌توان از Keychain Access یا این فرمان‌ها استفاده کرد:

```bash
security find-generic-password -a mineplus -s "MinePlus Release Store Password" -w
security find-generic-password -a mineplus -s "MinePlus Release Key Password" -w
```

هیچ کلید امضا، رمز یا اطلاعات Supabase داخل سورس برنامه قرار نگرفته است.
