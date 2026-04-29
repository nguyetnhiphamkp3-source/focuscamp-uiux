import { LegalPage, legalStyles } from "@/components/legal/legal-page";

export const dynamic = "force-static";

export const metadata = {
  title: "Chính sách hoàn tiền | focus.camp",
  description: "Quy định hoàn tiền cho gói cộng đồng và sản phẩm marketplace",
};

export default function RefundPage() {
  return (
    <LegalPage title="Chính sách hoàn tiền" updatedAt="2026-04-29">
      <p style={legalStyles.p}>
        Chính sách này áp dụng cho hai loại giao dịch trên focus.camp:
        (A) gói trả phí cộng đồng (community plan) và (B) sản phẩm
        marketplace (khoá học, template, gói tư vấn…).
      </p>

      <h2 style={legalStyles.h2}>A. Gói trả phí cộng đồng</h2>

      <h3 style={legalStyles.h3}>1. Hoàn tiền 100% trong 7 ngày</h3>
      <p style={legalStyles.p}>
        Nếu kể từ thời điểm thanh toán bạn <strong>chưa đăng bài, chưa
        tạo challenge, chưa có thành viên thứ hai tham gia</strong>, bạn
        có quyền yêu cầu hoàn tiền 100% trong vòng 7 ngày.
      </p>

      <h3 style={legalStyles.h3}>2. Không hoàn tiền sau khi sử dụng</h3>
      <p style={legalStyles.p}>
        Sau khi cộng đồng đã có hoạt động (post/challenge/member), khoản
        thanh toán không hoàn lại. Bạn có thể không gia hạn ở chu kỳ
        tiếp theo nếu không muốn tiếp tục.
      </p>

      <h3 style={legalStyles.h3}>3. Pro-rata khi nâng cấp giữa kỳ</h3>
      <p style={legalStyles.p}>
        focus.camp hiện chưa hỗ trợ tự động pro-rata. Khi nâng cấp Solo
        → Pro/Agency giữa kỳ, vui lòng liên hệ support để được tính
        chênh lệch và xử lý thủ công.
      </p>

      <h2 style={legalStyles.h2}>B. Sản phẩm marketplace</h2>

      <h3 style={legalStyles.h3}>1. Hoàn tiền do owner quyết định</h3>
      <p style={legalStyles.p}>
        Vì sản phẩm trên marketplace do từng owner cộng đồng tạo và bán,
        chính sách hoàn tiền do owner đặt. Vui lòng đọc mô tả sản phẩm
        trước khi mua.
      </p>

      <h3 style={legalStyles.h3}>2. Trường hợp ngoại lệ</h3>
      <p style={legalStyles.p}>
        focus.camp có thể can thiệp hoàn tiền nếu:
      </p>
      <ul style={legalStyles.ul}>
        <li>Sản phẩm bị xoá / không tồn tại sau khi thanh toán xong.</li>
        <li>
          Owner cộng đồng vi phạm điều khoản và bị đình chỉ trước khi
          giao hàng.
        </li>
        <li>Lỗi kỹ thuật khiến giao dịch bị nhân đôi.</li>
      </ul>

      <h2 style={legalStyles.h2}>Cách yêu cầu hoàn tiền</h2>
      <ol style={legalStyles.ul}>
        <li>
          Gửi email đến <strong>support@focus.camp</strong> kèm:
        </li>
        <ul style={legalStyles.ul}>
          <li>Mã giao dịch (paymentCode bắt đầu bằng FC…)</li>
          <li>Số tiền, ngày giờ chuyển khoản</li>
          <li>Lý do yêu cầu hoàn</li>
          <li>Số tài khoản nhận tiền hoàn (cùng tên người chuyển ban đầu)</li>
        </ul>
        <li>focus.camp phản hồi trong vòng 3 ngày làm việc.</li>
        <li>
          Nếu duyệt: tiền được chuyển trả về tài khoản gốc trong vòng
          5-10 ngày làm việc.
        </li>
      </ol>

      <h2 style={legalStyles.h2}>Tranh chấp</h2>
      <p style={legalStyles.p}>
        Nếu không đồng ý với quyết định hoàn tiền, bạn có thể khiếu nại
        bằng văn bản gửi support@focus.camp. Mọi tranh chấp được xử lý
        trên cơ sở thiện chí, ưu tiên thương lượng. Nếu không đạt thoả
        thuận, tranh chấp được giải quyết theo pháp luật Việt Nam tại
        toà án có thẩm quyền nơi focus.camp đặt trụ sở.
      </p>
    </LegalPage>
  );
}
