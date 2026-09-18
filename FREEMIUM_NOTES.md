# Freemium AB Store Noor

## Plans
| | Free | Pro Monthly | Pro Yearly |
|--|--|--|--|
| Price | 0 دج | 1,500 دج | 15,000 دج |
| Platform logo | Yes | Hidden | Hidden |
| Merchant logo | No | Yes | Yes |
| Products | 10 | Unlimited | Unlimited |

## SQL
Run `FREEMIUM_PLANS_MIGRATION.sql` in Supabase.

## Activate Pro manually (admin)
```sql
UPDATE public.stores
SET plan = 'pro',
    plan_expires_at = now() + interval '30 days',
    hide_platform_brand = true
WHERE slug = 'adelt86';
```
Yearly: use `interval '365 days'`.

## After merchant pays
1. Review `plan_upgrade_requests` (status pending)
2. Run UPDATE above
3. SET request status = 'approved'
