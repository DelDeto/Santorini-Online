# Santorini Online — V0.3 MVP

Game Santorini cơ bản có Solo Demo đấu BOT và chế độ hai người online, giao diện bàn 5×5 phong cách đảo Hy Lạp (hình khối tự thiết kế).

## Tính năng
- Solo Demo với BOT server-side: Dễ, Vừa, Khó; tự động đặt quân và chơi lần lượt\n- Tạo phòng 2 người, tham gia bằng mã hoặc link, hỗ trợ xem phòng khi đủ 2 ghế
- Đặt 2 quân mỗi người, di chuyển, xây 3 tầng, mái vòm và tự động xác định thắng/thua
- Xác thực nước đi tại máy chủ qua Cloudflare Durable Objects, đồng bộ WebSocket
- Reconnect dựa trên token trong trình duyệt; hỗ trợ tái đấu
- Giao diện 3D Three.js/WebGL, xoay/zoom và raycast chọn ô; tự động fallback 2D nếu WebGL không tải được\n- Hiệu ứng di chuyển, nâng tầng, mái vòm và chiến thắng\n- Favicon riêng + ảnh Open Graph PNG 1200×630 cho link preview

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

## Giới hạn V0.3
Đã có 10 God Powers cho multiplayer và bàn 3D thực. BOT vẫn chỉ hỗ trợ Classic; chưa có hệ thống tài khoản hay xếp hạng. Đã hỗ trợ luật hai người cả Classic và God Powers. Các kỹ năng được validate ở server. Người có mã phòng có thể xem game; ghế giữ bằng token trình duyệt. Đồ họa và nội dung là bản tự thiết kế; không dùng tài sản nghệ thuật chính thức của trò chơi thương mại.

Cloudflare Free có hạn mức sử dụng, không bảo đảm hoàn toàn miễn phí ở mọi quy mô.

## Trang chơi thử V0.3

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


## V0.3 — 3D thực và God Powers

- Multiplayer: chọn **God Powers** trước khi tạo phòng. Hai người chọn thần không trùng nhau rồi đặt 2 quân.
- Danh sách: Apollo, Artemis, Athena, Atlas, Demeter, Hephaestus, Hermes, Minotaur, Pan, Prometheus.
- Trong trận: kéo để xoay camera; cuộn / pinch để zoom; chạm vào quân và ô hợp lệ.
- Những lượt đặc biệt có các nút Xây trước / Đặt mái vòm / Xây ngay / Bỏ qua.
- Solo BOT tiếp tục chơi ở chế độ Classic; chưa hỗ trợ BOT God Powers.
- Three.js hiện tải từ jsDelivr CDN có ghim phiên bản, yêu cầu trình duyệt có Internet và WebGL để thấy 3D; nếu không sẽ chuyển sang fallback 2D.
- `public/board3d.js`: hình học 3D gốc, ánh sáng, vật liệu, camera, animation, raycast.
- `src/game.js`: các pha và nước đi hợp lệ của 10 vị thần.
- `test/gods.test.js`: bộ test chuyên biệt của các vị thần.
- `scripts/smoke.mjs`: kiểm thử multiplayer God Powers và Solo BOT qua WebSocket.

Giới hạn: Hermes cho phép đi ngang nhiều lần / không đi và chọn quân xây; các bước đi ngang trung gian trong bản hiện tại vẫn yêu cầu còn ô xây hợp lệ. God Powers chưa có BOT AI riêng; mô hình tượng 3D là procedural, chưa sculpt chi tiết như sản phẩm vật lý.


## V0.4 — Sculpted Island Edition

- Mô hình kiến trúc mini 3D bo góc: cột, cửa vòm, chớp xanh, lan can, gờ chỉ, mái vòm có viền kim loại.
- Quân cờ là tượng điêu khắc procedural với áo choàng tạo nếp, tay, đầu, tóc, vòng nguyệt quế, đế tượng; hai quân một đội có phụ kiện khác nhau.
- Môi trường biển Địa Trung Hải: bề mặt nước chuyển động bằng GPU shader, đảo vách đá vôi bất quy tắc, ô cờ lát đá, cây olive, gốm, đá cuội và viền sóng.
- Bóng đổ mềm, ánh sáng ban ngày, phối màu limestone/cobalt/sea teal, camera tự căn khung ở điện thoại và PC.
- Đã tối ưu cập nhật cảnh theo `game.revision`: chỉ thay công trình nếu tầng thay đổi; quân cờ giữ lại giữa các thao tác; click xuyên qua mô hình bằng raycast.
- Luật chơi Classic, Solo BOT, God Powers và WebSocket server được giữ nguyên.
- Các mô hình là điêu khắc từ hình học Three.js, chưa phải asset điêu khắc Blender/photogrammetry có texture PBR quét từ thực tế.

Kiểm tra local: `npm test && npm run smoke`. Three.js và RoundedBoxGeometry tải từ CDN jsDelivr phiên bản ghim tại `public/index.html`; fallback 2D tiếp tục hoạt động nếu WebGL không sẵn sàng.
