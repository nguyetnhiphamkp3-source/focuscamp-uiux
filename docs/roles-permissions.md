# Community Roles & Permissions

_Updated: 2026-05-18. Source of truth for community role behavior._

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
| Community settings | ✅ | ✅ | ❌ | ❌ |
| View member list | ✅ | ✅ | ❌ | ❌ |
| Member role changes / remove member | ✅ | ✅ | ❌ | ❌ |
| Billing / plan / renewal | ✅ | ✅ | ❌ | ❌ |
| API keys / integrations / AI Agent config | ✅ | ✅ | ❌ | ❌ |
| Courses: create/edit/lesson CRUD/drafts | ✅ | ✅ | ❌ | ❌ |
| Challenges: create/edit/task CRUD/settings | ✅ | ✅ | ❌ | ❌ |
| Challenge join request approval | ✅ | ✅ | ❌ | ❌ |
| Submission/check-in review | ✅ | ✅ | ✅ | ❌ |
| Content moderation: delete post/comment, pin, CỐT | ✅ | ✅ | ✅ | ❌ |
| Publish Signals | ✅ | ✅ | ❌ | ❌ |
| Events: create/manage/meeting URL/attendees | ✅ | ✅ | ❌ | ❌ |
| Marketplace products | ✅ | ✅ | ❌ | ❌ |
| Orders dashboard / manual payment approval | ✅ | ✅ | ❌ | ❌ |

## Notes

- Admins have full community settings view/edit access, except destructive community deletion.
- Keep marketplace product CRUD aligned with `manage_marketplace`.
- Admins can manage member roles, but cannot alter the owner row or their own role through the member table.
- If a UI hides a button, the matching service/action must still enforce the same permission.
- `MASTER` is not a valid community role. Do not introduce it without updating this doc, validation, and the permission helper.
