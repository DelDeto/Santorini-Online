# Santorini Online — V0.1 MVP

Game 2 người online dựa trên luật Santorini cơ bản, giao diện bàn 5×5 phong cách đảo Hy Lạp (hình khối tự thiết kế).

## Tính năng
- Tạo phòng, tham gia bằng mã hoặc link, hỗ trợ xem phòng khi đủ 2 ghế
- Đặt 2 quân mỗi người, di chuyển, xây 3 tầng, mái vòm và tự động xác định thắng/thua
- Xác thực nước đi tại máy chủ qua Cloudflare Durable Objects, đồng bộ WebSocket
- Reconnect dựa trên token trong trình duyệt; hỗ trợ tái đấu
- Giao diện responsive trên PC/mobile; góc nhìn phối cảnh 2.5D

## Triển khai
Yêu cầu Node.js 20+ và tài khoản Cloudflare có Workers.

```bash
npm install
npm test
npx wrangler login
npm run deploy
```

Khi Wrangler báo deployment thành công, truy cập đường dẫn workers.dev được hiển thị để tạo phòng và chia sẻ link.

Chạy local: `npm run dev`.

## Cấu trúc
- `src/game.js`: engine luật chơi
- `src/index.js`: server WebSocket + Durable Object
- `public/`: HTML/CSS/JS giao diện
- `test/`: kiểm thử engine

## Giới hạn V0.1
Chưa có BOT, God Powers, mô hình 3D thực, hệ thống tài khoản hay xếp hạng. Chỉ áp dụng luật cơ bản 2 người. Người có mã phòng có thể xem game; ghế giữ bằng token trình duyệt. Đồ họa và nội dung là bản tự thiết kế; không dùng tài sản nghệ thuật chính thức của trò chơi thương mại.

Cloudflare Free có hạn mức sử dụng, không bảo đảm hoàn toàn miễn phí ở mọi quy mô.

## Trang chơi thử V0.1

https://santorini-online-v01.duc-nguyen-ndd127.workers.dev/

Cloudflare Worker đã được đăng tải và bật route workers.dev. Khi chơi thử, tạo phòng rồi mở link mời trên một trình duyệt/thiết bị khác. Phiên bản sản xuất hiện được upload thủ công qua Cloudflare API từ mã nguồn repo, chưa thiết lập tự động deploy mỗi lần push GitHub.
