# MinePlus Android

پروژه Android Studio برای نسخه موبایل سامانه MinePlus است. رابط اصلی از دامنه امن `https://list-mine.vercel.app` بارگذاری می‌شود و نشست ورود، آپلود تصویر، pull-to-refresh، deep link، مدیریت بازگشت و صفحه آفلاین را پشتیبانی می‌کند.

## پیش‌نیاز ساخت

- Android Studio جدید با JDK 17
- Android SDK 37 و Build Tools 36
- Gradle 9.5 (Android Studio هنگام Sync دریافت می‌کند)

پوشه `android` را در Android Studio باز کنید، Gradle Sync را اجرا کنید و برای تست از Build > Build APK استفاده کنید. برای انتشار، کلید امضای اختصاصی را خارج از مخزن بسازید و از Build > Generate Signed App Bundle خروجی AAB بگیرید.

هیچ کلید امضا، رمز یا اطلاعات Supabase داخل برنامه قرار نگرفته است.
