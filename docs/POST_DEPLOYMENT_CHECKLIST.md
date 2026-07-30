# Post-Deployment Verification Checklist — FYLEX

- [ ] Check NestJS logs for zero runtime exceptions (`pm2 logs`).
- [ ] Inspect network tab on `http://187.127.131.26/shop` to verify 200 OK WebP responses.
- [ ] Test order creation & PDF invoice generation.
