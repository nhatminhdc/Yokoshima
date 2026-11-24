// Trang quản trị YOKOSHIMA: đăng nhập, sửa nội dung, lưu về máy chủ.
(function () {
  const $ = (id) => document.getElementById(id);
  const el = (tag, props, kids) => { const e = document.createElement(tag); Object.assign(e, props || {}); (kids || []).forEach((k) => e.append(k)); return e; };
  const api = async (url, data) => {
    const r = await fetch(url, data ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {});
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.error || 'Lỗi ' + r.status);
    return j;
  };
  let C = null, dirty = false, tab = 'products', cur = null, q = '', mode = 'login';

  const CATS = [['moto', 'Xe máy điện'], ['fashion', 'Xe đạp điện'], ['gas', 'Xe 50cc'], ['acc', 'Phụ kiện']];
  const SPECS = [['range', 'Quãng đường'], ['speed', 'Tốc độ tối đa'], ['power', 'Công suất động cơ'], ['load', 'Tải trọng'], ['battType', 'Loại pin / ắc quy'], ['battCap', 'Dung lượng'], ['charge', 'Thời gian sạc'], ['dims', 'Kích thước'], ['weight', 'Trọng lượng'], ['tire', 'Lốp / vành'], ['brake', 'Phanh'], ['light', 'Đèn'], ['lock', 'Khóa'], ['warranty', 'Bảo hành']];
  const TABS = [['products', 'Sản phẩm'], ['home', 'Trang chủ'], ['stores', 'Cửa hàng'], ['settings', 'Thông tin chung'], ['support', 'Bảo hành & câu hỏi']];

  function touch() { dirty = true; $('status').textContent = 'Có thay đổi chưa lưu'; }
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---- Cổng đăng nhập ----
  async function gate() {
    try {
      const s = await api('/api/auth');
      if (s.loggedIn) return start();
      mode = s.setup ? 'login' : 'setup';
      $('gateTitle').textContent = s.setup ? 'Đăng nhập quản trị' : 'Tạo mật khẩu quản trị';
      $('gateHint').textContent = s.setup ? '' : 'Lần đầu sử dụng: đặt mật khẩu của riêng bạn (ít nhất 8 ký tự). Hãy ghi nhớ mật khẩu này.';
      $('pwL').style.display = ''; $('pw2L').style.display = s.setup ? 'none' : '';
      $('pw').autocomplete = s.setup ? 'current-password' : 'new-password';
      $('gateBtn').style.display = ''; $('gateBtn').textContent = s.setup ? 'Đăng nhập' : 'Tạo mật khẩu';
      $('pw').focus();
    } catch (e) { $('gateTitle').textContent = 'Không mở được'; $('gateErr').textContent = e.message; }
  }
  $('gateForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('gateErr').textContent = '';
    const pw = $('pw').value;
    if (mode === 'setup' && pw !== $('pw2').value) { $('gateErr').textContent = 'Hai lần nhập chưa giống nhau.'; return; }
    $('gateBtn').disabled = true;
    try { await api('/api/auth', { action: mode, password: pw }); $('pw').value = ''; $('pw2').value = ''; await start(); }
    catch (err) { $('gateErr').textContent = err.message; }
    $('gateBtn').disabled = false;
  });
  $('outBtn').addEventListener('click', async () => {
    if (dirty && !confirm('Có thay đổi chưa lưu. Vẫn đăng xuất?')) return;
    dirty = false; await api('/api/auth', { action: 'logout' }); location.reload();
  });

  async function start() {
    C = await api('/api/content?fresh=1');
    C.products = C.products || []; C.stores = C.stores || []; C.settings = C.settings || {}; C.home = C.home || {};
    C.warranty = C.warranty || { conditions: '', rows: [] }; C.warranty.rows = C.warranty.rows || []; C.faq = C.faq || [];
    cur = C.products[0] ? C.products[0].id : null;
    $('gate').style.display = 'none'; $('app').style.display = 'block';
    render();
  }
  $('saveBtn').addEventListener('click', async () => {
    const ids = C.products.map((p) => p.id);
    if (C.products.some((p) => !p.name || !p.name.trim())) { alert('Có sản phẩm chưa có tên.'); return; }
    if (new Set(ids).size !== ids.length) { alert('Có hai sản phẩm trùng mã.'); return; }
    $('saveBtn').disabled = true; $('status').textContent = 'Đang lưu…';
    try { await api('/api/save', { content: JSON.parse(JSON.stringify(C, (k, v) => (k === '_new' ? undefined : v))) }); C.products.forEach((p) => { delete p._new; }); dirty = false; $('status').textContent = 'Đã lưu. Trang web cập nhật sau khoảng một phút.'; }
    catch (e) { $('status').textContent = 'Chưa lưu được: ' + e.message; if (/đăng nhập/i.test(e.message)) alert('Phiên đăng nhập đã hết. Hãy mở trang này ở thẻ khác để đăng nhập lại rồi bấm Lưu.'); }
    $('saveBtn').disabled = false;
  });

  // ---- Thành phần nhập liệu ----
  function field(label, obj, key, opt) {
    opt = opt || {};
    const inp = opt.area ? el('textarea', { rows: opt.rows || 3 }) : opt.options ? el('select') : el('input', { type: 'text' });
    if (opt.options) opt.options.forEach(([v, t]) => inp.append(el('option', { value: v, textContent: t })));
    inp.value = obj[key] == null || obj[key] === '—' ? '' : obj[key];
    if (opt.ph) inp.placeholder = opt.ph;
    inp.addEventListener('input', () => { obj[key] = inp.value; touch(); if (opt.on) opt.on(); });
    const l = el('label', {}, [label, inp]);
    if (opt.hint) l.append(el('span', { className: 'hint', textContent: opt.hint }));
    return l;
  }
  function resize(file) {
    return new Promise((ok, no) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1400 / Math.max(img.width, img.height));
        const c = el('canvas', { width: Math.round(img.width * k), height: Math.round(img.height * k) });
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob((b) => {
          if (b && b.type === 'image/webp') return ok(b);
          c.toBlob((b2) => (b2 ? ok(b2) : no(new Error('Không xử lý được ảnh.'))), 'image/png');
        }, 'image/webp', 0.86);
      };
      img.onerror = () => no(new Error('Tệp này không phải ảnh đọc được.'));
      img.src = u;
    });
  }
  const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
  function imageField(label, obj, key, after) {
    const box = el('div', { className: 'imgbox' });
    const draw = () => {
      box.textContent = '';
      box.append(obj[key] ? el('img', { src: obj[key], alt: '' }) : el('div', { className: 'no' }));
      const file = el('input', { type: 'file', accept: 'image/*', hidden: true });
      const up = el('button', { className: 'btn g', type: 'button', textContent: obj[key] ? 'Đổi ảnh' : 'Chọn ảnh' });
      const msg = el('span', { className: 'hint' });
      up.onclick = () => file.click();
      file.onchange = async () => {
        if (!file.files[0]) return;
        up.disabled = true; msg.textContent = 'Đang tải ảnh lên…';
        try {
          const blob = await resize(file.files[0]);
          const r = await api('/api/upload', { name: file.files[0].name, type: blob.type, data: await b64(blob) });
          obj[key] = r.url; touch(); draw(); if (after) after();
        } catch (e) { msg.textContent = e.message; up.disabled = false; }
      };
      const col = el('div', { style: 'display:flex;flex-direction:column;gap:8px;align-items:flex-start' }, [up]);
      if (obj[key]) { const rm = el('button', { className: 'btn d s', type: 'button', textContent: 'Bỏ ảnh' }); rm.onclick = () => { obj[key] = ''; touch(); draw(); if (after) after(); }; col.append(rm); }
      col.append(msg, file); box.append(col);
    };
    draw();
    return el('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [el('span', { style: 'font-size:13px;font-weight:600;color:#5a5456', textContent: label }), box]);
  }
  const card = (title, kids) => el('section', { className: 'card' }, [el('h3', { textContent: title })].concat(kids));
  const grid = (kids) => el('div', { className: 'grid' }, kids);

  // ---- Các thẻ ----
  function render() {
    const t = $('tabs'); t.textContent = '';
    TABS.forEach(([k, n]) => { const b = el('button', { textContent: n, className: k === tab ? 'on' : '' }); b.onclick = () => { tab = k; render(); window.scrollTo(0, 0); }; t.append(b); });
    const v = $('view'); v.textContent = '';
    ({ products: vProducts, home: vHome, stores: vStores, settings: vSettings, support: vSupport })[tab](v);
  }
  const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/yokoshima/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function vProducts(v) {
    const list = el('div', { className: 'plist' }), form = el('div');
    const drawList = () => {
      const keep = list.querySelector('input'); const pos = keep ? keep.selectionStart : null;
      list.textContent = '';
      const search = el('input', { type: 'text', placeholder: 'Tìm sản phẩm…', value: q });
      search.setAttribute('aria-label', 'Tìm sản phẩm');
      search.oninput = () => { q = search.value; drawList(); };
      const add = el('button', { className: 'btn k', textContent: '+ Thêm sản phẩm' });
      add.onclick = () => {
        let id = 'sp-' + Date.now().toString(36);
        C.products.unshift({ id, _new: true, name: 'Yokoshima ', cat: 'moto', line: '', badge: '', price: '', img: '', desc: '', visible: true });
        cur = id; q = ''; touch(); drawList(); drawForm();
      };
      list.append(el('div', { className: 'hd' }, [add, search]));
      const k = q.trim().toLowerCase();
      C.products.filter((p) => !k || (p.name || '').toLowerCase().includes(k)).forEach((p) => {
        const row = el('div', { className: 'pi' + (p.id === cur ? ' on' : '') + (p.visible === false ? ' off' : '') }, [
          p.img ? el('img', { src: p.img, alt: '', loading: 'lazy' }) : el('div', { className: 'no' }),
          el('div', {}, [el('b', { textContent: p.name || '(chưa có tên)' }), el('small', { textContent: (p.price ? p.price + ' ₫' : 'Liên hệ') + (p.visible === false ? ' · đang ẩn' : '') })])]);
        row.tabIndex = 0; row.setAttribute('role', 'button');
        row.onclick = () => { cur = p.id; drawList(); drawForm(); };
        row.onkeydown = (e) => { if (e.key === 'Enter') row.onclick(); };
        list.append(row);
      });
      if (keep) { search.focus(); search.setSelectionRange(pos, pos); }
    };
    const drawForm = () => {
      form.textContent = '';
      const p = C.products.find((x) => x.id === cur);
      if (!p) { form.append(card('Sản phẩm', [el('p', { textContent: 'Chọn một sản phẩm ở danh sách, hoặc bấm “Thêm sản phẩm”.' })])); return; }
      const i = C.products.indexOf(p);
      const vis = el('input', { type: 'checkbox', checked: p.visible !== false });
      vis.onchange = () => { p.visible = vis.checked; touch(); drawList(); };
      const mv = (d) => { const j = i + d; if (j < 0 || j >= C.products.length) return; C.products.splice(i, 1); C.products.splice(j, 0, p); touch(); drawList(); drawForm(); };
      const upB = el('button', { className: 'btn g s', type: 'button', textContent: '↑ Lên' }), dnB = el('button', { className: 'btn g s', type: 'button', textContent: '↓ Xuống' }), del = el('button', { className: 'btn d s', type: 'button', textContent: 'Xóa sản phẩm' });
      upB.onclick = () => mv(-1); dnB.onclick = () => mv(1);
      del.onclick = () => { if (!confirm('Xóa “' + p.name + '”? Bấm Lưu thay đổi để áp dụng.')) return; C.products.splice(i, 1); cur = (C.products[i] || C.products[i - 1] || {}).id || null; touch(); drawList(); drawForm(); };
      form.append(card('Thông tin sản phẩm', [
        grid([
          field('Tên sản phẩm', p, 'name', { on: () => { if (p._new) { const s = slug(p.name); if (s && !C.products.some((x) => x !== p && x.id === s)) { p.id = s; cur = s; } } drawList(); } }),
          field('Giá (để trống = “Liên hệ”)', p, 'price', { ph: 'Ví dụ: 13.520.000', on: drawList }),
          field('Loại', p, 'cat', { options: CATS }),
          field('Dòng xe', p, 'line', { ph: 'Vespa, Xmen, ZH, Gogo…', hint: 'Dùng cho bộ lọc ở trang chủ.' }),
          field('Nhãn', p, 'badge', { ph: 'Mới, Bán chạy…' })]),
        field('Mô tả ngắn', p, 'desc', { area: true }),
        imageField('Ảnh sản phẩm', p, 'img', drawList),
        el('label', { className: 'chk' }, [vis, 'Hiển thị trên trang web']),
        el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [upB, dnB, del])]));
      form.append(card('Thông số kỹ thuật', [el('span', { className: 'hint', textContent: 'Ô để trống sẽ hiện dấu “—” trên trang web.' }), grid(SPECS.map(([k, n]) => field(n, p, k)))]));
    };
    drawList(); drawForm();
    v.append(el('div', { className: 'pl' }, [list, form]));
  }
  function vHome(v) {
    const H = C.home;
    v.append(card('Phần mở đầu trang chủ', [
      field('Dòng chữ nhỏ phía trên', H, 'eyebrow'),
      grid([field('Tiêu đề, dòng 1', H, 'title1'), field('Tiêu đề, dòng 2 (màu cam)', H, 'title2')]),
      field('Đoạn giới thiệu', H, 'desc', { area: true }),
      imageField('Ảnh xe ở phần mở đầu', H, 'heroImg')]));
    v.append(card('Danh mục sản phẩm', [el('p', { className: 'hint', textContent: 'Trang chủ tự hiện 8 sản phẩm đầu tiên của mỗi loại. Muốn đổi sản phẩm nào lên trước, vào thẻ Sản phẩm và dùng nút “Lên / Xuống”.' })]));
  }
  function rows(title, arr, cls, cols, blank, addText) {
    const wrap = el('div');
    const draw = () => {
      wrap.textContent = '';
      arr.forEach((it, i) => {
        const rm = el('button', { className: 'btn d s', type: 'button', textContent: 'Xóa' });
        rm.onclick = () => { if (!confirm('Xóa mục này?')) return; arr.splice(i, 1); touch(); draw(); };
        wrap.append(el('div', { className: 'row ' + cls }, cols.map(([k, n, o]) => field(n, it, k, o)).concat([rm])));
      });
      const add = el('button', { className: 'btn g', type: 'button', textContent: addText, style: 'margin-top:14px' });
      add.onclick = () => { arr.push(Object.assign({}, blank)); touch(); draw(); const ins = wrap.querySelectorAll('.row'); const f = ins[ins.length - 1].querySelector('input,textarea'); if (f) f.focus(); };
      wrap.append(add);
    };
    draw();
    return card(title, [wrap]);
  }
  function vStores(v) { v.append(rows('Danh sách cửa hàng', C.stores, 'st', [['name', 'Tên cửa hàng'], ['addr', 'Địa chỉ'], ['phone', 'Điện thoại']], { name: '', addr: '', phone: '' }, '+ Thêm cửa hàng')); }
  function vSettings(v) {
    const S = C.settings;
    v.append(card('Liên hệ', [grid([field('Hotline', S, 'hotline'), field('Số Zalo nhận tin nhắn mua hàng', S, 'zalo'), field('Email', S, 'email')])]));
    v.append(card('Thông tin công ty (chân trang)', [field('Tên công ty', S, 'company'), grid([field('Mã số thuế', S, 'taxId'), field('Người đại diện', S, 'rep')]), field('Khẩu hiệu ở chân trang', S, 'slogan', { area: true, rows: 2 })]));
  }
  function vSupport(v) {
    v.append(rows('Thời hạn bảo hành', C.warranty.rows, 'kv', [['k', 'Hạng mục'], ['v', 'Thời hạn']], { k: '', v: '' }, '+ Thêm hạng mục'));
    v.append(card('Điều kiện bảo hành', [field('Nội dung', C.warranty, 'conditions', { area: true, rows: 4 })]));
    const fq = rows('Câu hỏi thường gặp', C.faq, 'fq', [['q', 'Câu hỏi'], ['a', 'Trả lời', { area: true }]], { q: '', a: '' }, '+ Thêm câu hỏi');
    v.append(fq);
  }
  gate();
})();
