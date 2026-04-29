import { LegalPage, legalStyles } from "@/components/legal/legal-page";

export const dynamic = "force-static";

export const metadata = {
  title: "Chính sách bảo mật | focus.camp",
  description: "Cách focus.camp thu thập và sử dụng dữ liệu cá nhân",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Chính sách bảo mật" updatedAt="2026-04-29">
      <p style={legalStyles.p}>
        focus.camp tôn trọng quyền riêng tư của bạn. Tài liệu này mô tả
        chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân như thế nào.
      </p>

      <h2 style={legalStyles.h2}>1. Dữ liệu thu thập</h2>
      <ul style={legalStyles.ul}>
        <li>
          <strong>Từ Google OAuth:</strong> email, tên hiển thị, ảnh đại
          diện công khai (do bạn cấp quyền khi đăng nhập).
        </li>
        <li>
          <strong>Bạn cung cấp:</strong> handle, bio, location, ảnh
          upload, nội dung post/comment/check-in.
        </li>
        <li>
          <strong>Tự động ghi nhận:</strong> địa chỉ IP, thời gian truy
          cập, user agent, log lỗi (Sentry), số liệu sử dụng tính năng.
        </li>
        <li>
          <strong>Thanh toán:</strong> mã giao dịch SePay, số tiền, thời
          gian. Chúng tôi KHÔNG lưu số tài khoản ngân hàng của bạn.
        </li>
      </ul>

      <h2 style={legalStyles.h2}>2. Mục đích sử dụng</h2>
      <ul style={legalStyles.ul}>
        <li>Cung cấp và vận hành Dịch vụ.</li>
        <li>Xác thực tài khoản, ngăn chặn lạm dụng.</li>
        <li>
          Gửi email thông báo (welcome, biên nhận thanh toán, gia hạn sắp
          tới hạn).
        </li>
        <li>Phân tích và cải thiện sản phẩm (anonymized).</li>
        <li>Tuân thủ nghĩa vụ pháp lý.</li>
      </ul>

      <h2 style={legalStyles.h2}>3. Chia sẻ với bên thứ ba</h2>
      <p style={legalStyles.p}>
        Chúng tôi KHÔNG bán dữ liệu cá nhân. Một số nhà cung cấp được sử
        dụng để vận hành dịch vụ:
      </p>
      <ul style={legalStyles.ul}>
        <li>
          <strong>Google</strong> — OAuth đăng nhập
        </li>
        <li>
          <strong>SePay</strong> — xử lý thanh toán VietQR
        </li>
        <li>
          <strong>Cloudflare R2</strong> — lưu trữ ảnh upload (S3-compatible)
        </li>
        <li>
          <strong>Resend</strong> — gửi email transactional
        </li>
        <li>
          <strong>Sentry</strong> — error monitoring
        </li>
        <li>
          <strong>VPS hosting</strong> — vận hành ứng dụng và database
          (PostgreSQL)
        </li>
      </ul>

      <h2 style={legalStyles.h2}>4. Lưu trữ và xoá dữ liệu</h2>
      <ul style={legalStyles.ul}>
        <li>
          Dữ liệu được lưu trên máy chủ tại Việt Nam/Singapore (tuỳ
          provider) trong suốt thời gian tài khoản còn hoạt động.
        </li>
        <li>
          Khi xoá tài khoản, dữ liệu cá nhân được xoá vĩnh viễn trong 30
          ngày, trừ phần buộc lưu theo luật (ví dụ hoá đơn thanh toán).
        </li>
        <li>Backup database được giữ tối đa 7 ngày.</li>
      </ul>

      <h2 style={legalStyles.h2}>5. Quyền của bạn</h2>
      <ul style={legalStyles.ul}>
        <li>Truy cập, chỉnh sửa profile từ trong app.</li>
        <li>Yêu cầu export dữ liệu cá nhân (gửi email request).</li>
        <li>Yêu cầu xoá tài khoản và dữ liệu liên quan.</li>
        <li>Phản đối việc xử lý vì mục đích marketing (chúng tôi hiện không gửi marketing email).</li>
      </ul>

      <h2 style={legalStyles.h2}>6. Cookies</h2>
      <p style={legalStyles.p}>
        focus.camp dùng cookie session NextAuth để giữ trạng thái đăng
        nhập. Không dùng cookie quảng cáo bên thứ ba. Tắt cookie có thể
        khiến bạn không đăng nhập được.
      </p>

      <h2 style={legalStyles.h2}>7. Trẻ em</h2>
      <p style={legalStyles.p}>
        Dịch vụ không dành cho trẻ dưới 13 tuổi. Nếu phát hiện tài khoản
        thuộc đối tượng này, chúng tôi sẽ xoá ngay.
      </p>

      <h2 style={legalStyles.h2}>8. Thay đổi chính sách</h2>
      <p style={legalStyles.p}>
        Khi cập nhật chính sách, chúng tôi sẽ thông báo trong app và/hoặc
        qua email cho thay đổi quan trọng.
      </p>

      <h2 style={legalStyles.h2}>9. Liên hệ</h2>
      <p style={legalStyles.p}>
        Email phụ trách dữ liệu cá nhân: <strong>support@focus.camp</strong>
      </p>
    </LegalPage>
  );
}
