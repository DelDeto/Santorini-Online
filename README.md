# Santorini Online — V0.2 MVP

Game Santorini cơ bản có Solo Demo đấu BOT và chế độ hai người online, giao diện bàn 5×5 phong cách đảo Hy Lạp (hình khối tự thiết kế).

## Tính năng
- Solo Demo với BOT server-side: Dễ, Vừa, Khó; tự động đặt quân và chơi lần lượt\n- Tạo phòng 2 người, tham gia bằng mã hoặc link, hỗ trợ xem phòng khi đủ 2 ghế
- Đặt 2 quân mỗi người, di chuyển, xây 3 tầng, mái vòm và tự động xác định thắng/thua
- Xác thực nước đi tại máy chủ qua Cloudflare Durable Objects, đồng bộ WebSocket
- Reconnect dựa trên token trong trình duyệt; hỗ trợ tái đấu
- Giao diện responsive một màn hình trên PC/mobile; góc nhìn phối cảnh 2.5D\n- Hiệu ứng di chuyển, nâng tầng, mái vòm và chiến thắng\n- Favicon riêng + ảnh Open Graph PNG 1200×630 cho link preview

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

## Giới hạn V0.2
Đã có BOT ba mức nhưng chưa có God Powers, mô hình 3D thực, hệ thống tài khoản hay xếp hạng. Chỉ áp dụng luật cơ bản Santorini cho hai phe (người–người hoặc người–BOT). Người có mã phòng có thể xem game; ghế giữ bằng token trình duyệt. Đồ họa và nội dung là bản tự thiết kế; không dùng tài sản nghệ thuật chính thức của trò chơi thương mại.

Cloudflare Free có hạn mức sử dụng, không bảo đảm hoàn toàn miễn phí ở mọi quy mô.

## Trang chơi thử V0.2

https://santorini-online-v01.duc-nguyen-ndd127.workers.dev/

Cloudflare Worker đã được đăng tải và bật route workers.dev. Khi chơi thử, tạo phòng rồi mở link mời trên một trình duyệt/thiết bị khác. Phiên bản sản xuất hiện được upload thủ công qua Cloudflare API từ mã nguồn repo, chưa thiết lập tự động deploy mỗi lần push GitHub.

## Solo Demo

Vào trang chủ, nhập tên, chọn độ khó và bấm **Đấu BOT**. BOT đặt hai quân sau bạn, sau đó tự di chuyển và xây dựng qua hệ thống alarm của Cloudflare. Tốc độ lượt BOT được giãn khoảng 1–1,25 giây giữa các hành động để dễ theo dõi. Dùng nút **Thoát phòng** để về màn chọn chế độ.

### Chia sẻ và biểu tượng

- `public/favicon.svg`: favicon vector.
- `public/icon-192.png`: Apple touch icon.
- `public/og.png`: ảnh preview 1200×630 cho Zalo, Facebook và các nền tảng hỗ trợ Open Graph.
- `public/og.svg`: artwork vector gốc.

Đăng tải giao diện và Worker từ GitHub bằng `npm run deploy` khi đã đăng nhập Wrangler; bản live được cập nhật thủ công qua Cloudflare API nên thay đổi trên GitHub **không tự động** triển khai cho tới khi thiết lập pipeline CI/CD phù hợp.
