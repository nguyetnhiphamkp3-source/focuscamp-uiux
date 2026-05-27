import { LegalPage, legalStyles } from "@/components/legal/legal-page";

export const dynamic = "force-static";

export const metadata = {
  title: "MCP API — focus.camp Docs",
  description:
    "Kết nối agent từ goclaw.sh hoặc bất kỳ MCP client nào với community của bạn trên focus.camp",
};

const codeStyle: React.CSSProperties = {
  display: "block",
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
  padding: "12px 14px",
  fontFamily: "monospace",
  fontSize: "var(--text-sm)",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  marginBottom: "var(--space-3)",
  lineHeight: 1.5,
};

export default function McpDocsPage() {
  return (
    <LegalPage title="MCP API" updatedAt="2026-04-29">
      <p style={legalStyles.p}>
        focus.camp expose tối đa <strong>22 tools</strong> qua <a href="https://modelcontextprotocol.io" style={{ color: "var(--brand-green)" }}>MCP (Model Context Protocol)</a> để
        agent ngoài (vd <a href="https://goclaw.sh" style={{ color: "var(--brand-green)" }}>goclaw.sh</a>, Claude Desktop, custom agents)
        đọc data + thực thi action trên cộng đồng của bạn.
      </p>

      <h2 style={legalStyles.h2}>Quickstart</h2>
      <ol style={legalStyles.ul}>
        <li>Vào <code>Settings</code> của community → section <strong>API Keys (MCP)</strong></li>
        <li>Click <strong>+ Tạo API key mới</strong>, đặt tên (vd &quot;Goclaw production&quot;) và chọn scope tối thiểu cần dùng</li>
        <li>Copy plaintext key (chỉ hiện 1 lần — lưu chỗ an toàn)</li>
        <li>Trong goclaw / MCP client, thêm server với:
          <ul style={legalStyles.ul}>
            <li><strong>URL:</strong> <code>https://focus.camp/api/mcp</code></li>
            <li><strong>Transport:</strong> Streamable HTTP</li>
            <li><strong>Header:</strong> <code>Authorization: Bearer fc_live_…</code></li>
          </ul>
        </li>
        <li>Test bằng <code>npx @modelcontextprotocol/inspector</code> hoặc tool list trong goclaw</li>
      </ol>

      <h2 style={legalStyles.h2}>Authentication</h2>
      <p style={legalStyles.p}>
        Mỗi key gắn với <strong>1 community</strong>. Agent CANNOT truy cập community khác qua key đó —
        community ID được resolve server-side. Action ghi (createPost, createChallenge…) được thực hiện
        AS owner của community.
      </p>
      <pre style={codeStyle}>{`Authorization: Bearer fc_live_<32 ký tự>`}</pre>

      <h2 style={legalStyles.h2}>Scopes</h2>
      <ul style={legalStyles.ul}>
        <li><strong>read</strong> — xem dữ liệu community, posts, challenges, members, XP</li>
        <li><strong>write</strong> — tạo/sửa content, duyệt submission, gửi notification</li>
        <li><strong>admin</strong> — xoá post, quản lý member, course, community info</li>
      </ul>

      <h2 style={legalStyles.h2}>Rate limits</h2>
      <ul style={legalStyles.ul}>
        <li><strong>60 calls/phút</strong> per API key</li>
        <li>Ngoài quota → HTTP 429</li>
        <li>Plan hết hạn → write tools throw error (read tools vẫn chạy)</li>
      </ul>

      <h2 style={legalStyles.h2}>Tools</h2>

      <h3 style={legalStyles.h3}>Read (10)</h3>
      <ul style={legalStyles.ul}>
        <li><code>community_get_info</code> — name, plan, member count</li>
        <li><code>community_get_stats</code> — counts last N days (posts, checkins, new members)</li>
        <li><code>community_list_members</code> — paginated members + role/tier/level</li>
        <li><code>community_get_member</code> — full profile by userId</li>
        <li><code>posts_list</code> — feed (POST/QUESTION/SIGNAL), filter by pillar, sort latest/popular</li>
        <li><code>posts_get</code> — single post + comments</li>
        <li><code>challenges_list</code> — by status (OPEN/ACTIVE/COMPLETED)</li>
        <li><code>challenges_get</code> — challenge + tasks + member count</li>
        <li><code>challenges_list_pending_checkins</code> — for review</li>
        <li><code>xp_list_recent</code> — recent XP ledger (community or per-user)</li>
      </ul>

      <h3 style={legalStyles.h3}>Write (6)</h3>
      <ul style={legalStyles.ul}>
        <li><code>posts_create</code> — new POST/QUESTION/SIGNAL</li>
        <li><code>posts_update</code> — edit body/title/pillar</li>
        <li><code>challenges_create</code> — challenge + N tasks (software factory pattern: spec → instance)</li>
        <li><code>challenges_update</code> — settings + freeze + banner</li>
        <li><code>checkins_review</code> — APPROVE / REJECT</li>
        <li><code>notifications_send</code> — inbox notification to specific member</li>
      </ul>

      <h3 style={legalStyles.h3}>Admin (6)</h3>
      <ul style={legalStyles.ul}>
        <li><code>posts_delete</code></li>
        <li><code>members_update_role</code> — MEMBER / MOD / ADMIN</li>
        <li><code>members_remove</code></li>
        <li><code>courses_create</code></li>
        <li><code>courses_add_lesson</code></li>
        <li><code>community_update_info</code> — name/tagline/description</li>
      </ul>

      <h2 style={legalStyles.h2}>Goclaw setup</h2>
      <p style={legalStyles.p}>Trong goclaw web UI:</p>
      <ol style={legalStyles.ul}>
        <li>Tools → Custom MCP Server → Add</li>
        <li>Type: Streamable HTTP</li>
        <li>Endpoint: <code>https://focus.camp/api/mcp</code></li>
        <li>Auth header: <code>Authorization: Bearer fc_live_…</code></li>
        <li>Save → agent của bạn sẽ thấy các tools tương ứng với scope của key</li>
      </ol>

      <h2 style={legalStyles.h2}>System prompt mẫu cho agent</h2>
      <pre style={codeStyle}>{`Bạn là community manager của focus.camp.
Bạn có quyền truy cập các tools của community qua MCP, tuỳ theo scope của API key.

Khi user yêu cầu hành động trên community:
- Đọc state hiện tại trước (community_get_info, community_get_stats)
- Confirm với user trước khi gọi write tools
- Sau khi action xong, summarize kết quả ngắn gọn

Khi tạo challenge:
- Hỏi mục tiêu + audience trước
- Generate description + N tasks (1 task / ngày)
- Gọi challenges_create với tasks array
- Trả lại slug để user xem`}</pre>

      <h2 style={legalStyles.h2}>Activity log</h2>
      <p style={legalStyles.p}>
        Mọi tool call được log trong <code>Settings → Hoạt động Agent</code>. Bạn xem được tool nào
        agent gọi, thành công/lỗi, thời gian thực thi.
      </p>

      <h2 style={legalStyles.h2}>Security</h2>
      <ul style={legalStyles.ul}>
        <li>Plaintext key chỉ hiện 1 lần — sau đó chỉ lưu sha256 hash</li>
        <li>Tạo key theo quyền tối thiểu: dùng <code>read</code> trước, chỉ bật <code>write</code>/<code>admin</code> khi agent thật sự cần</li>
        <li>Revoke ngay lập tức tại Settings nếu nghi key leak</li>
        <li>Set expiresIn để key tự hết hạn</li>
        <li>Tool calls được log 30 ngày — owner audit được</li>
      </ul>

      <h2 style={legalStyles.h2}>Hỗ trợ</h2>
      <p style={legalStyles.p}>
        Câu hỏi / bug / request thêm tool: <strong>support@focus.camp</strong>
      </p>
    </LegalPage>
  );
}
