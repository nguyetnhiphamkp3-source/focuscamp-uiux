# Community Roles & Permissions

_Updated: 2026-05-15. Source of truth for community role behavior._

## Roles

`OWNER` is not stored in `Membership.role`. Owner status comes from `Community.ownerId`.

`Membership.role` is only for delegated operators:
- `ADMIN`
- `MOD`
- `MEMBER`

Do not add ad-hoc role checks in pages/actions/services. Use `lib/community-permissions.ts`.

## Permission Matrix

| Permission | OWNER | ADMIN | MOD | MEMBER |
|---|---:|---:|---:|---:|
| Community settings | ✅ | ❌ | ❌ | ❌ |
| Member role changes / remove member | ✅ | ❌ | ❌ | ❌ |
| Billing / plan / renewal | ✅ | ❌ | ❌ | ❌ |
| API keys / integrations / AI Agent config | ✅ | ❌ | ❌ | ❌ |
| Courses: create/edit/lesson CRUD/drafts | ✅ | ✅ | ❌ | ❌ |
| Challenges: create/edit/task CRUD/settings | ✅ | ✅ | ❌ | ❌ |
| Challenge join request approval | ✅ | ✅ | ❌ | ❌ |
| Submission/check-in review | ✅ | ✅ | ✅ | ❌ |
| Content moderation: delete post/comment, pin, CỐT | ✅ | ✅ | ✅ | ❌ |
| Publish Signals | ✅ | ✅ | ❌ | ❌ |
| Events: create/manage/meeting URL/attendees | ✅ | ✅ | ❌ | ❌ |
| Marketplace products / orders / manual payment approval | ✅ | ❌ | ❌ | ❌ |

## Notes

- Keep marketplace/order/payment owner-only unless product policy changes.
- Keep role management owner-only. Admins must not grant admin/mod or remove other members.
- If a UI hides a button, the matching service/action must still enforce the same permission.
- `MASTER` is not a valid community role. Do not introduce it without updating this doc, validation, and the permission helper.
