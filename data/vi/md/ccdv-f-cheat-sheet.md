# Cheat sheet: Developer – Foundations

Mọi thứ đáng nhớ trong một giờ trước khi thi, gói trong một trang. Số liệu lấy từ exam guide chính thức; các quy tắc kinh nghiệm do tác giả rút ra từ phần giải thích đáp án chính thức.

## Kỳ thi

| | |
| --- | --- |
| Mã thi | CCDV-F |
| Số câu | 53, trắc nghiệm một đáp án và nhiều đáp án |
| Thời gian | 120 phút, khoảng 2 phút mỗi câu |
| Điểm đậu | 720/1.000 (thang quy đổi) |
| Lệ phí | 125 USD trước chiết khấu đối tác |
| Hiệu lực | 12 tháng, gia hạn bằng bài đánh giá miễn phí |

## Điểm nằm ở đâu

```text
Applications and Integration        33.1%  ████████████████████████████████
Model Selection and Optimization    16.8%  ████████████████
Agents and Workflows                14.7%  ██████████████
Prompt and Context Engineering      11.0%  ███████████
Tools and MCPs                      10.6%  ██████████
Security and Safety                  8.1%  ████████
Claude Code                          3.1%  ███
Eval, Testing, and Debugging         2.6%  ██
```

Một domain chiếm một phần ba đề. Claude Code và Eval cộng lại chưa tới 6%, nên đừng ôn quá nhiều chỉ vì thấy quen.

## Nếu chỉ nhớ được một thứ

1. **stop_reason điều khiển vòng lặp.** `tool_use` nghĩa là chạy tool, thêm kết quả, gọi lại. `end_turn` nghĩa là xong.
2. **Batches cho khối lượng lớn chịu được trễ.** 50% chi phí, cửa sổ 24 giờ, khớp bằng `custom_id`, không gọi tool nhiều lượt bên trong batch.
3. **Cache phần tiền tố ổn định.** System prompt và chính sách tĩnh lên trước, nội dung thay đổi để sau, bật caching. Giảm cả độ trễ lẫn chi phí.
4. **Ép cấu trúc, rồi validate, rồi retry kèm lỗi.** Tool use cộng JSON schema. Đừng tin model tự trả JSON hợp lệ chỉ vì bạn dặn mạnh.
5. **Đường đi biết trước → workflow. Chưa biết → agent.** Tự hành chỉ đáng độ phức tạp khi model phải tự chọn đường.
6. **Subagent cô lập context.** Giao việc giữ phần việc trung gian dài dòng ngoài cửa sổ của agent cha.
7. **Ghim phiên bản model trên production.** Nâng cấp khi đó là thay đổi có đánh giá, không phải bất ngờ qua đêm.
8. **Injection được đánh bại bằng cấu trúc.** Tách nội dung không tin cậy khỏi chỉ dẫn và chặn nó khỏi các tool có hệ quả. Không phải bằng cách bảo model phớt lờ, cũng không bằng model lớn hơn.
9. **Least privilege cho tool.** Năng lực agent không có thì không thể bị lạm dụng. Gỡ bỏ tốt hơn hộp xác nhận và log.
10. **MCP server để dùng lại giữa nhiều ứng dụng.** Custom tool cho một app, Skill cho chỉ dẫn, built-in cho file và shell cơ bản.
11. **Mô tả tool là cơ chế chọn tool.** Mô tả chồng chéo, mơ hồ gây chọn sai. Phân biệt rõ hoặc gộp lại.
12. **Vệ sinh context tốt hơn cửa sổ lớn hơn.** Tỉa output tool, nén lịch sử, cô lập việc con. Cửa sổ lớn hơn chỉ hoãn cùng thất bại với giá cao hơn.
13. **Few-shot sửa định dạng và ca biên.** Thêm chỉ dẫn thì không.
14. **Trace khoanh được lỗi.** Suy luận đúng trên tài liệu sai là lỗi truy xuất, không phải lỗi model.

## Các quyết định đề liên tục kiểm tra

| Yêu cầu | Đáp án |
| --- | --- |
| Việc khối lượng lớn, cần rẻ, mai có kết quả | Message Batches API |
| Cùng một đoạn mở đầu dài ở mọi lời gọi | Sắp xếp lại để có tiền tố ổn định, bật caching |
| Output phải parse được bằng máy | Tool use với JSON schema cộng validate-retry |
| Năng lực dùng chung cho nhiều app | MCP server |
| Agent không bao giờ được làm X | Không cấp tool đó |
| Quy trình 5 bước cố định | Workflow, dùng model bên trong |
| Phiên dài đang xuống cấp | Tỉa, nén, giao việc cho subagent |

## Quản lý thời gian

53 câu trong 120 phút là nhịp thoải mái, hơn 2 phút mỗi câu một chút. Cách làm của tác giả:

- **Lượt đầu, khoảng 65 phút.** Trả lời câu đã biết. Câu có code đọc chậm; đừng để một đoạn code dài ngốn 5 phút. Đánh dấu rồi đi tiếp.
- **Lượt hai, khoảng 35 phút.** Làm các câu đã đánh dấu. Câu về cơ chế API thường tự rõ sau khi đã gặp vài câu: đề nhất quán về thế nào là thực hành tốt.
- **20 phút cuối.** Đọc lại mọi câu nhiều đáp án và kiểm số lượng đã chọn.

## Đọc câu hỏi đúng như nó được viết

Mỗi tình huống nêu một ràng buộc: chi phí, độ trễ, độ tin cậy, bảo mật, hoặc khả năng bảo trì. Xác định nó ngay câu đầu, rồi loại trừ. Mẫu chung ở gần như mọi câu: phương án đúng **thay đổi cấu trúc hệ thống**, còn các phương án nhiễu **chỉnh một tham số, dùng model lớn hơn, hoặc nhờ model một cách lịch sự**.

Cụ thể, hãy nghi ngờ mọi phương án có "tăng max_tokens", "tăng temperature", "dùng model lớn hơn", hoặc "thêm chỉ dẫn vào prompt" khi vấn đề là tính đúng, chi phí, định dạng hay bảo mật. Đó là những đáp án sai "chuẩn" của đề.

## Buổi sáng ngày thi

- Chạy lại system test trên máy thi, kể cả khi tuần trước đã qua
- Tắt mọi thứ trong danh sách cần tắt trước khi check-in, kể cả app Claude desktop
- Chuẩn bị giấy tờ tuỳ thân, phòng trống, bàn trống, rút màn hình thứ hai
- Check-in lâu hơn bạn nghĩ; bắt đầu sớm
- Ngồi tổng cộng 135 phút; ăn trước

## Nếu bị "đứng hình"

Bỏ qua và đi tiếp. Một câu khó mất một điểm; sa lầy mất nhiều điểm. Riêng đề này, câu sau thường gợi lại khái niệm bạn cần cho câu trước.

## Hậu cần ngày thi

- Tên trên giấy tờ phải khớp chính xác với tên đăng ký
- Không được xem tài liệu. Không ghi chú, không tài liệu, không công cụ dịch
- Trả lời hết; câu bỏ trống tính 0 điểm
- Câu nhiều đáp án có ghi rõ chọn bao nhiêu
- Khoảng 2 phút mỗi câu; đánh dấu rồi quay lại thay vì sa lầy

## Bẫy

- Model mạnh nhất hiếm khi là đáp án cho câu hỏi về chi phí hay độ trễ
- Temperature gần như không bao giờ là cách sửa cho lỗi tính đúng, định dạng hay bảo mật
- try/catch nuốt lỗi âm thầm không bao giờ là mẫu chắc chắn
- Cách viết prompt không phải biện pháp bảo mật, và hộp xác nhận không phải least privilege
