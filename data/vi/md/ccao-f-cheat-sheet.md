# Cheat sheet: Associate – Foundations

Mọi thứ đáng nhớ trong một giờ trước khi thi, gói trong một trang. Số liệu lấy từ exam guide chính thức; các quy tắc kinh nghiệm do tác giả rút ra từ phần giải thích đáp án chính thức.

## Kỳ thi

| | |
| --- | --- |
| Mã thi | CCAO-F |
| Số câu | 60, trắc nghiệm một đáp án và nhiều đáp án |
| Thời gian | 120 phút, khoảng 2 phút mỗi câu |
| Điểm đậu | 720/1.000 (thang quy đổi) |
| Lệ phí | 99 USD trước chiết khấu đối tác |
| Hiệu lực | 12 tháng, gia hạn bằng bài đánh giá miễn phí |

## Điểm nằm ở đâu

```text
Output Evaluation and Validation      21%  ████████████████████
Workflow Integration and Design       16%  ███████████████
Governance, Risk, Responsible Use     15%  ██████████████
Prompting and Task Execution          14%  █████████████
Product and Model Selection           12%  ███████████
Configuration and Knowledge Mgmt      12%  ███████████
Troubleshooting and Optimization      10%  █████████
```

Đánh giá output đáng giá gấp rưỡi viết prompt. Hãy ôn theo đúng tỷ lệ đó.

## Nếu chỉ nhớ được một thứ

1. **Kiểm chứng mọi thứ cụ thể và có hệ quả.** Trích dẫn, con số, ngày tháng, số mục là nơi model hay bịa. Tự tin không phải bằng chứng.
2. **Mức tự tin model tự báo không chứng minh gì.** Hỏi model chắc đến đâu không bao giờ xác nhận được một nhận định.
3. **Bỏ sót cũng là lỗi.** Bản tóm tắt bỏ mất một lưu ý quan trọng là sai, dù từng chữ trong nó đều đúng. Đọc nguồn, đừng chỉ đọc output.
4. **Ẩn danh hoá rồi mới phân tích.** Xoá các định danh bị quản lý trước khi tải lên. Mục đích, chức vụ của người yêu cầu, hay "bảo nó bỏ qua cột đó" đều không phải biện pháp kiểm soát.
5. **Chọn model khớp với việc.** Nhanh và rẻ cho việc thường lệ khối lượng lớn, mạnh cho việc thực sự cần suy luận. Mặc định chọn model lớn nhất là sai; dùng model nhỏ nhất cho việc khó cũng sai.
6. **Cấu trúc thắng từ nhấn mạnh.** Vai trò, người đọc, các mục, ràng buộc và ví dụ sửa được output kém. "Chi tiết và kỹ lưỡng" thì không.
7. **Chia nhỏ yêu cầu gộp.** Xin danh sách phân loại, rồi ba mục hàng đầu, rồi hành động. Một prompt khổng lồ mơ hồ cho ra output mơ hồ.
8. **Project chứa những gì lặp lại.** Chỉ dẫn và tài liệu lâu dài nằm trong Project; chi tiết từng tin nhắn nằm trong prompt.
9. **Knowledge của Project do bạn duy trì.** Tài liệu cũ đã tải lên cho ra câu trả lời lỗi thời một cách tự tin. Thay thế, đừng chất thêm.
10. **Chẩn đoán thay đổi.** Khi chất lượng giảm, hỏi cái gì đã đổi (knowledge mới, nguồn mới, prompt mới) trước khi viết lại bất cứ thứ gì.
11. **Chuyển việc tích hợp cho người khác.** Kết nối Claude với hệ thống nội bộ là việc của Developer và Architect. Biết ranh giới đó là nội dung được kiểm tra.
12. **Trả lời câu hỏi kinh doanh.** "Claude làm được X không?" được trả lời bằng sự phân công: Claude soạn gì, người phán đoán gì, và bước duyệt nằm ở đâu.

## Các mẫu phán đoán đề hay thưởng điểm

| Tình huống | Phản xạ đúng |
| --- | --- |
| Output gửi cho khách hàng, lãnh đạo, hoặc cơ quan quản lý | Kiểm chứng nhận định, rồi để người duyệt |
| Khối lượng lớn, độ phức tạp thấp | Model rẻ hơn, nhanh hơn |
| Có dữ liệu nhạy cảm trong đầu vào | Xoá hoặc thay bằng bí danh trước |
| Cùng một việc mỗi tháng | Project có chỉ dẫn và knowledge |
| Định dạng output cứ sai | Nêu định dạng rõ ràng, kèm ví dụ |
| Trước chạy được, giờ thì không | Tìm thứ đã thay đổi trước khi thay đổi gì |

## Quản lý thời gian

60 câu trong 120 phút là 2 phút mỗi câu, và đa số câu bạn sẽ không cần tới 2 phút. Cách làm của tác giả:

- **Lượt đầu, khoảng 70 phút.** Trả lời mọi câu đã biết. Câu nào cần nghĩ hơn 90 giây thì chọn phương án tốt nhất, đánh dấu, rồi đi tiếp. Câu bỏ trống được 0 điểm; một câu đoán có đánh dấu là cơ hội miễn phí để đổi ý.
- **Lượt hai, khoảng 30 phút.** Chỉ làm câu đã đánh dấu. Bạn sẽ thấy vài câu giờ đã rõ, vì các câu sau gợi lại cách đặt vấn đề.
- **20 phút cuối.** Đọc lại riêng các câu nhiều đáp án. Đó là nơi mất điểm vì bất cẩn, vì rất dễ chọn hai trong khi đề yêu cầu ba.

## Đọc câu hỏi đúng như nó được viết

Mỗi tình huống đều nêu một ràng buộc: chi phí, quyền riêng tư, tốc độ, chính sách, hoặc quy mô. Tìm ràng buộc đó trước, rồi loại mọi phương án không giải quyết nó. Thường còn lại hai phương án; cái tốt hơn là cái **thay đổi hệ thống** thay vì **bù trừ xung quanh nó**.

Khi hai phương án đều có vẻ đúng, hãy hỏi: một người làm nghề cẩn thận sẽ bảo vệ phương án nào trước mặt người chịu rủi ro? Đó gần như luôn là đáp án đề muốn.

## Buổi sáng ngày thi

- Chạy lại system test trên máy thi, kể cả khi tuần trước đã qua
- Tắt mọi thứ trong danh sách cần tắt trước khi check-in, không phải trong lúc check-in
- Chuẩn bị sẵn giấy tờ tuỳ thân, phòng trống, bàn trống, rút màn hình thứ hai
- Check-in lâu hơn bạn nghĩ; bắt đầu sớm
- Ăn chút gì đó. Ngồi 135 phút lâu hơn bạn tưởng

## Nếu bị "đứng hình"

Bỏ qua và đi tiếp. Nội dung đề có giới hạn và các câu độc lập với nhau; một câu khó mất một điểm, sa lầy vào nó mất năm điểm. Quay lại ở lượt hai, đáp án thường đã rõ.

## Hậu cần ngày thi

- Tên trên giấy tờ phải khớp chính xác với tên đăng ký
- Không được xem tài liệu. Không ghi chú, không tài liệu, không công cụ dịch, không màn hình thứ hai
- Trả lời hết; câu bỏ trống tính 0 điểm. Đánh dấu rồi quay lại thay vì sa lầy
- Câu nhiều đáp án có ghi rõ chọn bao nhiêu. Đọc dòng đó trước
- Ngân sách là 2 phút mỗi câu

## Bẫy

- Phương án dài nhất không phải phương án an toàn nhất; đề thưởng cho phương án đáp ứng ràng buộc đã nêu
- "Không làm gì" và "bỏ tác vụ" gần như luôn sai khi có cách làm tuân thủ
- Thêm dòng miễn trừ không làm nội dung sai trở thành chấp nhận được
- Model lớn hơn không sửa được vấn đề về quản trị, định dạng hay quy trình
