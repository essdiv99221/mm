# Mahdypaperus

متجر ثابت مع دعم Railway لتسجيل دخول المدير المخفي باستخدام متغيرات بيئة.

## ما تم تغييره
- تم إزالة بيانات مدير `secret-admin` الثابتة من `script.js`.
- تم إضافة سيرفر Node/Express في `server.js` للتحقق من بيانات المدير عبر env vars.
- الصفحة المخفية `secret-admin.html` ترسل طلبًا إلى endpoint آمن بدلًا من تخزين بيانات الاعتماد في المتصفح.

## إعداد Railway
1. أضف متغيري البيئة التاليين:
   - `SECRET_ADMIN_EMAIL`
   - `SECRET_ADMIN_PASSWORD`
2. استخدم الأمر `npm start` أو دع Railway تشغّل `node server.js`.

## تشغيل محليًا
1. افتح Terminal في مجلد المشروع.
2. نفّذ:
   ```powershell
   npm install
   npm start
   ```
3. افتح `http://localhost:3000`.

## ملاحظة
صفحة `secret-admin.html` تستخدم السيرفر للتحقق من بيانات المدير، لذلك لن تبقى بيانات الاعتماد مرئية في قاعدة الكود العميلية.
