# Cheat sheet: Architect – Foundations

Mọi thứ đáng nhớ trong một giờ trước khi thi, gói trong một trang. Số liệu lấy từ exam guide chính thức; các quy tắc kinh nghiệm do tác giả rút ra từ phần giải thích đáp án chính thức.

## Kỳ thi

| | |
| --- | --- |
| Mã thi | CCAR-F |
| Số câu | 60, gắn với 4 tình huống rút từ bộ 6 tình huống đã công bố |
| Thời gian | 120 phút, khoảng 2 phút mỗi câu |
| Điểm đậu | 720/1.000 (thang quy đổi) |
| Lệ phí | 125 USD trước chiết khấu đối tác, tăng từ 99 USD kể từ 30/6/2026 |
| Hiệu lực | 12 tháng, gia hạn bằng bài đánh giá miễn phí |

## Điểm nằm ở đâu

```text
Agentic Architecture & Orchestration   27%  ██████████████████████████
Claude Code Configuration & Workflows  20%  ███████████████████
Prompt Engineering & Structured Output 20%  ███████████████████
Tool Design & MCP Integration          18%  █████████████████
Context Management & Reliability       15%  ██████████████
```

## Sáu tình huống, bạn sẽ gặp bốn

| Tình huống | Cần luyện |
| --- | --- |
| Agent giải quyết ticket hỗ trợ (tool MCP, mục tiêu 80% xử lý ngay lần đầu) | Điều kiện dừng vòng lặp, khi nào escalate, giới hạn tool, lỗi có cấu trúc |
| Claude Code cho đội lập trình | Phân cấp CLAUDE.md, rule theo đường dẫn, plan mode, command và skill |
| Nghiên cứu đa agent có báo cáo trích nguồn | Chuyển giao coordinator ↔ subagent, nguồn gốc thông tin, lan truyền lỗi |
| Công cụ năng suất cho lập trình viên | Chọn built-in tool, tích hợp MCP, context cho codebase lớn |
| Claude Code trong CI/CD | Gọi headless, output JSON, tiêu chí review, báo sai (false positive) |
| Trích xuất dữ liệu có cấu trúc | Thiết kế JSON schema, retry theo lỗi validation, xử lý theo lô, độ tin cậy |

## Nếu chỉ nhớ được một thứ

1. **Vòng lặp agent cần điều kiện dừng được thiết kế.** Trần số vòng, phát hiện lời gọi lặp, đường escalate. Ngân sách token không phải điều kiện dừng.
2. **Escalate khi ngoài chính sách hoặc hết tiến triển.** Không phải theo số lượt, tuổi đơn hàng hay giọng điệu khách.
3. **Lỗi có cấu trúc gồm loại lỗi và cờ retryable.** Agent chỉ phục hồi được từ lỗi nó hiểu được. Dùng cờ `isError`.
4. **Mô tả tool là cơ chế để model chọn tool.** Phân biệt rõ các tool giống nhau, hoặc gộp lại.
5. **Giới hạn cứng đặt ở tầng tool.** Ngưỡng chính sách nằm trong code hoặc hook, không bao giờ là lời đề nghị gửi model.
6. **Phân cấp CLAUDE.md: user, project, thư mục.** Quy ước có điều kiện đặt trong `.claude/rules/` có giới hạn đường dẫn, để context chỉ tốn ở chỗ cần.
7. **Plan mode là cổng duyệt.** Dùng khi cần người duyệt cách làm, không dùng cho mọi việc.
8. **CI nghĩa là headless.** `-p` hoặc `--print`, `--output-format json`, `--json-schema`. Không bao giờ đọc lén transcript.
9. **Báo sai được chữa bằng tiêu chí rõ ràng.** Nêu gắn cờ gì, bỏ qua gì, ngưỡng mức độ, và cho ví dụ.
10. **Subagent trả về phát hiện đã chắt lọc, không trả tài liệu thô.** Dữ liệu khối lớn ở lại ngoài rìa; đó là mục đích của việc giao việc.
11. **Nguồn gốc thông tin phải sống qua các lần chuyển giao.** Mang nhận định và nguồn đi cùng nhau, nếu không trích dẫn sẽ lệch khỏi nhận định.
12. **Lỗi được truyền lên kèm context** để coordinator chọn: thử lại, loại bỏ và ghi chú khoảng trống, hoặc dừng.
13. **Nullable cho trường hợp vắng mặt hợp lệ.** Bắt buộc mọi trường thì ép model bịa; optional mọi trường thì che lỗi thiếu thật.
14. **Validate rồi retry kèm lỗi validation.** Cho model biết sai chỗ nào.
15. **Đo trên mẫu có nhãn lấy từ toàn bộ.** Độ chính xác chỉ tính trên bản ghi đã qua validation là con số bị lệch.

## Mục trong phụ lục cần thuộc lòng

Các giá trị `stop_reason`, hook PostToolUse, `allowedTools`, Task tool để gọi subagent, `.mcp.json` với mở rộng biến môi trường, `isError`, frontmatter của `.claude/skills/SKILL.md` (`context: fork`, `allowed-tools`, `argument-hint`), `/memory`, `/compact`, `--resume`, `fork_session`, subagent Explore, `tool_choice`, Message Batches (giảm 50%, cửa sổ 24 giờ, `custom_id`, không gọi tool nhiều lượt), hiệu ứng lost-in-the-middle, file scratchpad, hiệu chỉnh độ tin cậy.

## Quản lý thời gian

60 câu chia theo 4 tình huống trong 120 phút. Mỗi tình huống có một khối câu hỏi, nên hãy chia nhịp theo khối chứ không theo từng câu.

- **Đọc kỹ tình huống một lần trước khi vào câu hỏi.** Bỏ 2 phút hiểu hệ thống sẽ được lợi hơn nhiều, vì mọi câu trong khối đều dựa vào nó.
- **Lượt đầu, khoảng 70 phút.** Làm lần lượt từng khối. Đánh dấu câu nào cần hơn 90 giây.
- **Lượt hai, khoảng 30 phút.** Quay lại các câu đánh dấu khi đã quen toàn bộ tình huống.
- **20 phút cuối.** Đọc lại câu nhiều đáp án và kiểm số lượng đã chọn.

## Đọc câu hỏi đúng như nó được viết

Vì sáu tình huống được công bố trước, bạn có thể bước vào phòng thi và biết trước mỗi tình huống sẽ kiểm tra gì. Hãy tận dụng: khi một khối mở ra, nhớ lại các domain chính của tình huống đó và chờ câu hỏi rơi vào đó.

Trong một câu, tìm ràng buộc (độ tin cậy, chi phí, giới hạn context, an toàn, khả năng bảo trì) và loại mọi thứ không giải quyết nó. Phương án thắng gần như luôn **loại bỏ một điểm yếu cấu trúc**; các phương án nhiễu thì **thêm năng lực, thêm giám sát, hoặc bảo model cẩn thận**.

## Buổi sáng ngày thi

- Chạy lại system test trên máy thi, kể cả khi tuần trước đã qua
- Tắt mọi thứ trong danh sách cần tắt trước khi check-in, kể cả app Claude desktop
- Chuẩn bị giấy tờ tuỳ thân, phòng trống, bàn trống, rút màn hình thứ hai
- Check-in lâu hơn bạn nghĩ; bắt đầu sớm
- Ngồi tổng cộng 135 phút; ăn trước

## Nếu bị "đứng hình"

Chuyển sang câu khác trong khối rồi quay lại. Các câu cùng tình huống bổ trợ nhau: câu sau thường làm rõ câu trước đang hỏi gì.

## Hậu cần ngày thi

- Tên trên giấy tờ phải khớp chính xác với tên đăng ký
- Không được xem tài liệu. Không ghi chú, không tài liệu, không công cụ dịch
- Trả lời hết; câu bỏ trống tính 0 điểm
- Đọc kỹ tình huống một lần, rồi trả lời các câu dựa trên bối cảnh đó
- Nếu bạn từng thi trước 30/6/2026 và trượt, lần thi đó đã được xoá: không phải chờ
