import { LegalPage, legalStyles } from "@/components/legal/legal-page";

export const dynamic = "force-static";

export const metadata = {
  title: "Điều khoản dịch vụ | focus.camp",
  description: "Điều khoản sử dụng nền tảng cộng đồng focus.camp",
};

export default function TermsPage() {
  return (
    <LegalPage title="Điều khoản dịch vụ" updatedAt="2026-04-29">
      <p style={legalStyles.p}>
        Khi bạn sử dụng focus.camp (sau đây gọi là &quot;Dịch vụ&quot;), bạn
        đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi sử dụng.
      </p>

      <h2 style={legalStyles.h2}>1. Phạm vi dịch vụ</h2>
      <p style={legalStyles.p}>
        focus.camp là nền tảng SaaS giúp creator/coach xây dựng cộng đồng
        challenge-first với các tính năng: tạo cộng đồng, đăng bài, mở thử
        thách (challenge), bán khoá học, marketplace, quản lý thành viên.
      </p>

      <h2 style={legalStyles.h2}>2. Tài khoản</h2>
      <ul style={legalStyles.ul}>
        <li>
          Đăng ký bằng tài khoản Google. Bạn chịu trách nhiệm bảo mật tài
          khoản và mọi hoạt động dưới tài khoản đó.
        </li>
        <li>Một người chỉ nên có một tài khoản duy nhất.</li>
        <li>Tuổi tối thiểu: 13 (theo chính sách Google OAuth).</li>
      </ul>

      <h2 style={legalStyles.h2}>3. Gói trả phí (Subscription)</h2>
      <p style={legalStyles.p}>
        Mỗi cộng đồng cần được gắn 1 gói trả phí hàng tháng để hoạt động:
      </p>
      <ul style={legalStyles.ul}>
        <li>
          <strong>Solo</strong> — 99.000đ/tháng
        </li>
        <li>
          <strong>Pro</strong> — 299.000đ/tháng
        </li>
        <li>
          <strong>Agency</strong> — 799.000đ/tháng
        </li>
      </ul>
      <p style={legalStyles.p}>
        Thanh toán qua chuyển khoản VietQR (SePay). Sau khi giao dịch hoàn
        tất, cộng đồng được kích hoạt 30 ngày kể từ thời điểm match. Hết
        hạn, owner có 7 ngày grace để gia hạn; sau đó cộng đồng chuyển
        sang trạng thái read-only cho tới khi gia hạn.
      </p>

      <h2 style={legalStyles.h2}>4. Nội dung do người dùng đăng</h2>
      <ul style={legalStyles.ul}>
        <li>
          Bạn giữ quyền sở hữu nội dung mình đăng. Bạn cấp cho focus.camp
          giấy phép không độc quyền để hiển thị, lưu trữ, sao chép kỹ
          thuật phục vụ hoạt động Dịch vụ.
        </li>
        <li>
          Cấm: nội dung vi phạm pháp luật Việt Nam, vi phạm bản quyền,
          spam, lừa đảo, kích động bạo lực, tấn công cá nhân, nội dung
          18+ không phù hợp ngữ cảnh.
        </li>
        <li>
          focus.camp có quyền gỡ bỏ nội dung vi phạm và đình chỉ tài khoản
          tương ứng.
        </li>
      </ul>

      <h2 style={legalStyles.h2}>5. Trách nhiệm của owner cộng đồng</h2>
      <ul style={legalStyles.ul}>
        <li>
          Owner chịu trách nhiệm chính về nội dung trong cộng đồng mình
          tạo, bao gồm cả nội dung do thành viên đăng.
        </li>
        <li>
          Owner phải tuân thủ luật bảo vệ người tiêu dùng khi bán sản phẩm
          (khoá học, gói tư vấn) qua marketplace.
        </li>
      </ul>

      <h2 style={legalStyles.h2}>6. Hoàn tiền</h2>
      <p style={legalStyles.p}>
        Xem chi tiết tại{" "}
        <a
          href="/refund"
          style={{ color: "var(--brand-green)", textDecoration: "underline" }}
        >
          Chính sách hoàn tiền
        </a>
        .
      </p>

      <h2 style={legalStyles.h2}>7. Giới hạn trách nhiệm</h2>
      <p style={legalStyles.p}>
        Dịch vụ được cung cấp &quot;như hiện tại&quot;. focus.camp không
        đảm bảo dịch vụ luôn không gián đoạn, không lỗi. Trong phạm vi
        pháp luật cho phép, focus.camp không chịu trách nhiệm thiệt hại
        gián tiếp phát sinh từ việc sử dụng Dịch vụ.
      </p>

      <h2 style={legalStyles.h2}>8. Chấm dứt</h2>
      <p style={legalStyles.p}>
        Bạn có thể ngừng sử dụng Dịch vụ bất kỳ lúc nào. focus.camp có
        quyền đình chỉ hoặc xoá tài khoản nếu bạn vi phạm điều khoản này.
        Khi tài khoản bị xoá, dữ liệu liên quan sẽ bị xoá vĩnh viễn trong
        vòng 30 ngày.
      </p>

      <h2 style={legalStyles.h2}>9. Thay đổi điều khoản</h2>
      <p style={legalStyles.p}>
        focus.camp có thể cập nhật điều khoản. Thay đổi quan trọng sẽ
        được thông báo qua email hoặc trong app. Tiếp tục sử dụng sau
        thay đổi đồng nghĩa bạn chấp nhận điều khoản mới.
      </p>

      <h2 style={legalStyles.h2}>10. Liên hệ</h2>
      <p style={legalStyles.p}>
        Mọi câu hỏi/khiếu nại: <strong>support@focus.camp</strong>
      </p>
    </LegalPage>
  );
}
