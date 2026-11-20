# Cheat sheet: Architect – Professional

Mọi thứ đáng nhớ trong một giờ trước khi thi, gói trong một trang. Số liệu lấy từ exam guide chính thức; các quy tắc kinh nghiệm do tác giả rút ra từ phần giải thích đáp án chính thức.

## Kỳ thi

| | |
| --- | --- |
| Mã thi | CCAR-P |
| Số câu | 63, trắc nghiệm một đáp án và nhiều đáp án |
| Thời gian | 120 phút, khoảng 2 phút mỗi câu |
| Điểm đậu | 720/1.000 (thang quy đổi) |
| Lệ phí | 175 USD trước chiết khấu đối tác |
| Hiệu lực | 12 tháng, gia hạn bằng bài đánh giá miễn phí |
| Điều kiện | Không có. Không cần Foundations, và Foundations cũng không nâng cấp lên chứng chỉ này |

## Điểm nằm ở đâu

```text
Integration                                19%  ██████████████████
Solution Design & Architecture             17%  ████████████████
Evaluation, Testing & Optimization         16%  ███████████████
Governance, Safety & Risk Management       14%  █████████████
Stakeholder Communication & Lifecycle      14%  █████████████
Claude Models, Prompting & Context         13%  ████████████
Developer Productivity & Enablement         7%  ███████
```

Governance và giao tiếp với stakeholder cộng lại chiếm 28%. Người thiên về kỹ thuật thường mất điểm ở đây chứ không phải ở Integration.

## Nếu chỉ nhớ được một thứ

1. **Chỉ leo thang khi bị buộc phải leo.** Gọi model đơn thuần → augmented LLM (có retrieval, tool) → workflow → agent → multi-agent. Mỗi bậc đều phải có lý do.
2. **Least privilege nghĩa là gỡ bỏ.** Lấy năng lực đó đi. Ghi log, hộp xác nhận, giới hạn giờ hành chính chỉ là biện pháp bù trừ, không phải cách sửa.
3. **RAG xuống cấp sau khi dữ liệu thay đổi là lỗi truy xuất.** Xem chunking, embedding và độ nhất quán của index trước khi đụng tới prompt hay model.
4. **Kiến thức thay đổi thường xuyên thuộc về retrieval,** không bao giờ nằm trong trọng số, cũng không dán vào system prompt.
5. **Khi có nhiều tool, giới hạn theo vai trò và nạp dần.** Đừng rút ngắn mô tả, đừng dựng mega-tool.
6. **Chất lượng chủ quan đo bằng rubric.** Định nghĩa các kiểu lỗi, dựng bộ dữ liệu có nhãn, dùng model chấm có người kiểm. Exact match và độ dài không đo được gì.
7. **Thay đổi prompt là thay đổi production.** Regression suite → A/B theo chỉ số định trước → rollout.
8. **Tuân thủ được thực thi trước ranh giới.** Khử định danh hoặc token hoá trước lời gọi, ghép lại tại chỗ, kiểm toán ranh giới. Dặn model thì đã quá muộn.
9. **Định tuyến người duyệt theo độ tin cậy và hệ quả.** Duyệt tất cả không mở rộng được; không duyệt gì là cẩu thả; lấy mẫu ngẫu nhiên bỏ sót ca rủi ro.
10. **Observability ghi trace, không chỉ output.** Lời gọi tool, context truy xuất, điểm quyết định. Không có thì không khoanh được sự cố.
11. **Đặt nội dung tĩnh lên đầu và cache nó.** Tối ưu duy nhất cải thiện cả độ trễ lẫn chi phí cùng lúc.
12. **Trình bày số liệu trung thực, có phân tách.** Tách hiệu năng theo loại ca, nêu phương pháp, đưa kết quả đầu-cuối kể cả bước người duyệt. Không bao giờ một con số trung bình làm đẹp.
13. **Decision record (ADR) ghi phương án thay thế và đánh đổi,** không chỉ thiết kế được chọn.
14. **Enablement phải có phiên bản và dùng chung.** Cấu hình cho cả đội, skill và command chung, lộ trình onboarding.

## Quy định, mỗi cái một dòng

| | |
| --- | --- |
| GDPR | Dữ liệu cá nhân của người ở EU: tối thiểu hoá, giới hạn mục đích, xoá khi được yêu cầu |
| HIPAA | Thông tin sức khoẻ được bảo vệ ở Mỹ: khử định danh trước khi rời ranh giới |
| FedRAMP | Triển khai cloud cho chính phủ liên bang Mỹ: môi trường và kiểm soát được cấp phép |

## Quản lý thời gian

63 câu trong 120 phút, chưa tới 2 phút mỗi câu, và tình huống dài hơn đề Foundations.

- **Lượt đầu, khoảng 75 phút.** Trả lời câu chắc chắn, đánh dấu phần còn lại. Câu thiết kế có nhiều phương án đều bảo vệ được là loại nên đánh dấu, vì nhìn lại lần hai có lợi nhất.
- **Lượt hai, khoảng 30 phút.** Làm các câu đã đánh dấu. Lúc này bạn đã "thấm" được đề coi thế nào là kiến trúc tốt, và các câu mơ hồ thường tự rõ ra.
- **15 phút cuối.** Đọc lại câu nhiều đáp án và kiểm số lượng đã chọn.

## Đọc câu hỏi đúng như nó được viết

Ở cấp này, đa số phương án đều bảo vệ được, chỉ có một là tốt nhất. Hai câu hỏi giải quyết gần như mọi câu:

1. **Tình huống thực sự nêu ràng buộc gì?** Chi phí, độ trễ, tuân thủ, quy mô, khả năng kiểm toán, hay lòng tin của stakeholder. Phương án tốt nhất giải quyết đúng ràng buộc đó, không phải những cái khác.
2. **Phương án nào qua được một buổi design review?** Đề luôn ưu tiên lựa chọn **loại bỏ** rủi ro hơn lựa chọn **giám sát** rủi ro, và lựa chọn **đo được** hơn lựa chọn chỉ **nghe hợp lý**.

Câu về governance và stakeholder sẽ có cảm giác "mềm" hơn câu kỹ thuật. Chúng không dễ hơn, và chiếm 28% đề: trả lời với cùng sự chặt chẽ, chọn phương án trung thực, có phân tách và bảo vệ được, chứ không phải phương án nghe cho yên tâm.

## Buổi sáng ngày thi

- Chạy lại system test trên máy thi, kể cả khi tuần trước đã qua
- Tắt mọi thứ trong danh sách cần tắt trước khi check-in, kể cả app Claude desktop
- Chuẩn bị giấy tờ tuỳ thân, phòng trống, bàn trống, rút màn hình thứ hai
- Check-in lâu hơn bạn nghĩ; bắt đầu sớm
- Ngồi tổng cộng 135 phút; ăn trước

## Nếu bị "đứng hình"

Bỏ qua rồi quay lại. Tình huống dài được lợi khi đọc lại bằng con mắt mới, hơn nhiều so với ngồi nhìn chằm chằm.

## Hậu cần ngày thi

- Tên trên giấy tờ phải khớp chính xác với tên đăng ký
- Không được xem tài liệu. Không ghi chú, không tài liệu, không công cụ dịch
- Trả lời hết; câu bỏ trống tính 0 điểm
- Sẽ có câu tình huống mà nhiều phương án đều bảo vệ được: chọn cái thoả ràng buộc đã nêu
- Khoảng 2 phút mỗi câu; đánh dấu rồi quay lại thay vì sa lầy

## Bẫy

- Thêm agent, thêm tool, model lớn hơn hiếm khi là đáp án cho câu thiết kế
- Từ chối định lượng sai ngang với thổi phồng con số; phân tách là câu trả lời chuyên nghiệp
- Fine-tune là đáp án đắt tiền cho những vấn đề retrieval và template đã giải quyết được
- Giám sát một năng lực nguy hiểm không giống với gỡ bỏ nó
