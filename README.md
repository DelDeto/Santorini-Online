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


## V0.5 — Premium Diorama

- Môi trường bầu trời 3D sử dụng procedural atmospheric shader, quầng nắng và mây mỏng, chiếu sáng chân thực hơn.
- Hai bối cảnh ánh sáng: **Ban ngày** và **Hoàng hôn**; có nút đổi trực tiếp trong màn chơi và lưu tùy chọn.
- Biển có sóng hai lớp, vệt glint phản chiếu mặt trời, foam nhẹ quanh đảo và caustics.
- Chất lượng hình ảnh **Auto / HD / Eco**: desktop tự bật bloom nhẹ khi phù hợp, mobile ưu tiên tiết kiệm tài nguyên, có thể tùy chọn HD; tôn trọng giảm chuyển động và tiết kiệm dữ liệu.
- Kiến trúc bổ sung portal, ban công, lan can, gờ đá, ribs mái vòm gốm; tượng thứ hai có quyền trượng đặc trưng.
- Nâng hiệu ứng chiến thắng: camera tiến gần có kiểm soát, dải hoa kim loại vàng/xanh bay trên đảo.
- Vật liệu và mô hình 3D vẫn được dựng bằng code, không yêu cầu tải ảnh photogrammetry hoặc model có bản quyền.
- Các tùy chọn FX được đóng gói trong `public/premium3d.js`, có `dispose` để dọn tài nguyên WebGL khi thoát phòng.
- Kiểm tra bằng `npm test && npm run smoke`; CI xác nhận Classic/BOT và draft God Powers không bị thay đổi.

Lưu ý: Hiệu ứng bloom tăng tải GPU. Trên điện thoại yếu nên để **Auto/Eco**, và 3D có thể trở lại fallback 2D khi browser không hỗ trợ WebGL. Đây là bản dựng miniature bằng Three.js chứ không phải mesh quét thật từ hiện vật.


## V0.6 → V0.7 → V0.8 — Gameplay and social multiplayer

### V0.6 · Stability, legal moves and room management
- Fix Hermes: cho phép di chuyển qua ô cùng cao độ dù ô đó chưa có vị trí xây.
- Người chơi **Thoát phòng** gửi hành động `leave`: ghế được giải phóng; nếu trận đang diễn ra, đội còn lại thắng xử thua.
- Giữ ghế qua sự cố ngắt kết nối ngắn để người chơi có thể refresh và tiếp tục bằng token cũ; rời phòng chủ động mới giải phóng ghế.
- Tự động chọn quân nếu lượt chỉ có một quân có thể di chuyển; giảm thao tác trên màn hình cảm ứng.
- Tối ưu WebGL: tự giảm nhịp render khi không có chuyển động, tạm dừng khi tab ẩn.

### V0.7 · God Powers bot
- Solo BOT có thể chọn **God Powers** trên màn hình bắt đầu và phản ứng qua các pha kỹ năng phụ.
- BOT sử dụng các hành động hợp lệ do server tạo, xem xét cao độ, nguy cơ thắng của đối phương và vị trí xây.
- BOT 3 cấp: Dễ chọn ngẫu nhiên, Vừa cân bằng, Khó chú trọng phòng thủ; kiểm thử riêng từng God.
- Không cam kết BOT mạnh tương đương công cụ tìm kiếm nước đi nhiều tầng (minimax sâu); đây là heuristic an toàn.

### V0.8 · Team multiplayer, spectator & room stats
- Chọn **2 người (1vs1)**, **3 người (đội 2vs1)** hoặc **4 người (đội 2vs2)** ngay ở lobby.
- Với 3–4 người, game hiện dùng biến thể **hai đội**: mỗi thành viên đội 2 người điều khiển **một quân**, người chơi đơn trong đội 1 người điều khiển **hai quân**. Lượt xen kẽ theo đội và từng thành viên. Đây **không phải luật 3 người tự do**; God Powers chỉ áp dụng cho 1vs1.
- Người vào phòng có thể chọn **Xem** (khán giả, không tham gia thao tác); khi phòng đủ người, người vào sau tự thành khán giả.
- Hiển thị số khán giả, tỷ số thắng đội, tổng trận và 12 hành động gần nhất; lịch sử và điểm số thuộc phạm vi phòng chơi đó.
- Khi thành viên đến lượt bị khóa hết hành động, đội thua để không mắc kẹt.
- Hệ thống tái đấu giữ điểm tổng; làm mới lượt setup và giai đoạn chọn thần khi cần.
- Không tự động chuyển người chơi mất mạng thành khán giả để tránh mất ghế oan; nếu muốn nhường ghế phải bấm Thoát phòng.

Kiểm thử: `npm test` và `npm run smoke`, bao gồm thử God Power BOT, 3 người, 4 người, khán giả, rời phòng và WebSocket multiplayer.


## V0.9 — Official Roxley 2017 multiplayer rules (10 Simple God Powers)

**Quy tắc V0.9 thay thế hoàn toàn biến thể 2v1/2v2 của V0.8.**

- **3 người — Free For All:** ba người chơi độc lập, mỗi người chọn một God Power không trùng, đặt hai quân riêng (xanh/cam/tím). Lượt 0→1→2 theo vòng. Khi người chơi không còn đường Move→Build hợp lệ, xóa quân và God Power; tiếp tục đến người cuối cùng hoặc có người lập tức thắng khi di chuyển lên tầng 3.
- **4 người — Team Game:** 2 đội, đội A ghế 1+3 và đội B ghế 2+4, mỗi đội chia sẻ hai quân. Mỗi ghế có God Power riêng; đồng đội không thể sử dụng kỹ năng của nhau. Ghế 1 đặt đủ hai quân xanh, ghế 2 đặt đủ hai quân cam; lượt đầu thuộc ghế 3, tiếp ghế 4→1→2.
- God Powers **bắt buộc** ở chế độ 3–4 người; toàn bộ 10 Simple God Powers đang có đều tương thích với 2, 3, 4 người theo tài liệu game.
- Athena: các đối thủ không được leo lên trong thời gian hiệu lực, bao gồm cả khi phải đợi đến lượt tiếp theo của chính người đang sở hữu thần trong trận đội.
- Điều kiện cơ bản: di chuyển lên tầng 3; thua nếu không thể Move và Build. Pan có thêm điều kiện thắng khi hạ ít nhất hai tầng.
- Giữ Solo BOT, 2-player Classic/God, phòng người xem, phòng theo mã, lịch sử, giao diện PC/mobile 3D.

**Giới hạn cần phân biệt với đầy đủ sách luật:** Ứng dụng hiện hỗ trợ 10 God Powers cơ bản trong bộ gốc, không phải toàn bộ 30 God Powers mở rộng của Roxley 2017. Màn chọn thần hiện cho phép từng ghế chọn trực tiếp từ 10 thẻ còn trống, **chưa mô phỏng thủ tục Challenger mời đúng N lá và chọn người bắt đầu**. Người bắt đầu đang cố định ở ghế 1. Do đó các luật *di chuyển, xây dựng, thắng/thua và cách chơi 3–4 người* được cập nhật theo luật Roxley, còn *quy trình setup lựa chọn thần và lượt đầu* là bản rút gọn.

Nguồn đối chiếu: https://files.roxley.com/Santorini-Rulebook-Web-2016.08.14.pdf (trang 1, 2, 6).


## V1.0 — Multiplayer BOT 3/4 người

- **Solo 2 người:** 1 người + 1 BOT (Classic/God Powers), giữ nguyên.
- **Solo 3 người:** 1 người + 2 BOT; ba người chơi độc lập, mỗi người 2 quân và 1 thần khác nhau. BOT tự chọn thần, đặt quân, đi và xây.
- **Solo 4 người:** 1 người + 3 BOT; 2 đội 2v2, mỗi ghế có God Power riêng. Người thật và BOT cùng đội dùng chung 2 quân theo lượt.
- **Phòng kết hợp:** Chủ phòng 3 hoặc 4 người có thể bấm **+ Thêm BOT** lúc chưa bắt đầu để tự điền các ghế còn trống (ví dụ 2 người thật + 1 BOT hoặc 2 người thật + 2 BOT).
- BOT được xử lý **phía server Durable Object**, có nhịp hành động để dễ theo dõi, tiếp tục tự động sau khi trình duyệt người chơi kết nối lại.
- BOT ở mọi ghế chỉ sử dụng các hành động hợp lệ, bao gồm chọn thần riêng, Artemis, Pan, Demeter, Atlas, Prometheus, Hermes và các bước xây phụ. Mức Dễ chọn ngẫu nhiên, Vừa/Khó dùng chiến thuật heuristic nhận biết tầng, trung tâm và mối đe dọa chiến thắng.
- Để thử: mở trang chính → phần **Đấu BOT · 2–4 người** → chọn `1 + 2 BOT` hoặc `1 + 3 BOT`, độ khó và **Đấu BOT**.
- Chế độ God Powers bắt buộc khi có hơn hai người; bộ 10 thần và các hạn chế setup Challenger được ghi rõ trong V0.9.
- Kiểm thử: `npm test && npm run smoke` bao gồm cả websocket phòng BOT 3/4, luồng God Powers và chuyển lượt liên tục.

Các BOT là đối thủ theo thuật toán heuristic, không phải mô hình AI học sâu; chưa bảo đảm độ mạnh ngang người chơi giàu kinh nghiệm. Không có phí API hay dịch vụ AI bên ngoài.
