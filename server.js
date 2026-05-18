const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/secret-admin-login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();
  const validEmail = String(process.env.SECRET_ADMIN_EMAIL || '').trim().toLowerCase();
  const validPassword = String(process.env.SECRET_ADMIN_PASSWORD || '').trim();

  if (!validEmail || !validPassword) {
    return res.status(500).json({ error: 'تكوين المدير غير جاهز. ضع SECRET_ADMIN_EMAIL و SECRET_ADMIN_PASSWORD على Railway.' });
  }
  if (!email || !password) {
    return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان.' });
  }
  if (email !== validEmail || password !== validPassword) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة.' });
  }
  return res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
