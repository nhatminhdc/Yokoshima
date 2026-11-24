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
  const TABS = [['products', 'Sản phẩm'], ['home', 'Trang chủ'], ['theme', 'Giao diện'], ['stores', 'Cửa hàng'], ['settings', 'Thông tin chung'], ['support', 'Bảo hành & câu hỏi']];

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
    C.theme = C.theme || {}; C.theme.sections = C.theme.sections || {}; C.theme.nav = C.theme.nav || [];
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
    ({ products: vProducts, home: vHome, theme: vTheme, stores: vStores, settings: vSettings, support: vSupport })[tab](v);
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
      const exp = el('button', { className: 'btn g s', type: 'button', textContent: 'Xuất Excel' });
      const imp = el('button', { className: 'btn g s', type: 'button', textContent: 'Nhập Excel' });
      const pick = el('input', { type: 'file', accept: '.xlsx,.csv', hidden: true });
      exp.onclick = exportProducts; imp.onclick = () => pick.click();
      pick.onchange = async () => { const f = pick.files[0]; pick.value = ''; if (!f) return; try { if (await importProducts(f)) { cur = C.products[0] ? C.products[0].id : null; drawList(); drawForm(); } } catch (e) { alert('Không đọc được tệp: ' + e.message); } };
      list.append(el('div', { className: 'hd' }, [add, el('div', { style: 'display:flex;gap:8px' }, [exp, imp, pick]), search]));
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
      p.colors = Array.isArray(p.colors) ? p.colors : [];
      const cw = el('div');
      const drawColors = () => {
        cw.textContent = '';
        p.colors.forEach((c, k) => {
          const rm = el('button', { className: 'btn d s', type: 'button', textContent: 'Xóa màu' });
          rm.onclick = () => { p.colors.splice(k, 1); touch(); drawColors(); };
          cw.append(el('div', { className: 'row', style: 'grid-template-columns:repeat(auto-fit,minmax(200px,1fr));align-items:start' }, [
            el('div', { style: 'display:flex;flex-direction:column;gap:12px;align-items:flex-start' }, [field('Tên màu', c, 'name', { ph: 'Ví dụ: Đỏ đô' }), color('Ô màu', c, 'hex', '#cccccc'), rm]),
            imageField('Ảnh xe màu này', c, 'img')]));
        });
        const addC = el('button', { className: 'btn g', type: 'button', textContent: '+ Thêm màu', style: 'margin-top:14px' });
        addC.onclick = () => { p.colors.push({ name: '', hex: '#cccccc', img: '' }); touch(); drawColors(); const r = cw.querySelectorAll('.row'); r[r.length - 1].querySelector('input').focus(); };
        cw.append(addC);
      };
      drawColors();
      form.append(card('Màu sắc', [el('span', { className: 'hint', textContent: 'Khách chọn màu ở trang sản phẩm; màu đầu tiên được chọn sẵn. Màu chưa có ảnh riêng sẽ dùng ảnh sản phẩm. Tin nhắn mua qua Zalo có ghi kèm màu khách chọn.' }), cw]));
      p.gallery = Array.isArray(p.gallery) ? p.gallery : [];
      const gw = el('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start' }), gmsg = el('span', { className: 'hint' });
      const drawGal = () => {
        gw.textContent = '';
        p.gallery.forEach((u, k) => {
          const rm = el('button', { className: 'btn d s', type: 'button', textContent: 'Bỏ' });
          rm.onclick = () => { p.gallery.splice(k, 1); touch(); drawGal(); };
          gw.append(el('div', { style: 'display:flex;flex-direction:column;gap:6px;align-items:center' }, [el('img', { src: u, alt: 'Ảnh thêm ' + (k + 1), style: 'width:120px;height:92px;object-fit:contain;background:#f4f3f1' }), rm]));
        });
        const file = el('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
        const addG = el('button', { className: 'btn g', type: 'button', textContent: '+ Thêm ảnh' });
        addG.onclick = () => file.click();
        file.onchange = async () => {
          addG.disabled = true;
          try { for (const f of file.files) { gmsg.textContent = 'Đang tải “' + f.name + '”…'; const blob = await resize(f); const r = await api('/api/upload', { name: f.name, type: blob.type, data: await b64(blob) }); p.gallery.push(r.url); touch(); } gmsg.textContent = ''; }
          catch (e) { gmsg.textContent = e.message; }
          drawGal();
        };
        gw.append(addG, file);
      };
      drawGal();
      form.append(card('Ảnh thêm', [el('span', { className: 'hint', textContent: 'Các ảnh này hiện thành hàng ảnh nhỏ dưới ảnh chính ở trang sản phẩm. Có thể chọn nhiều ảnh một lúc.' }), gw, gmsg]));
      p.options = Array.isArray(p.options) ? p.options : [];
      const ow = el('div');
      const drawOpts = () => {
        ow.textContent = '';
        p.options.forEach((o, k) => {
          const rm = el('button', { className: 'btn d s', type: 'button', textContent: 'Xóa' });
          rm.onclick = () => { p.options.splice(k, 1); touch(); drawOpts(); };
          ow.append(el('div', { className: 'row kv' }, [field('Tên phiên bản', o, 'name', { ph: 'Ví dụ: Ắc quy 20Ah' }), field('Giá riêng (để trống = giá sản phẩm)', o, 'price', { ph: '14.990.000' }), rm]));
        });
        const addO = el('button', { className: 'btn g', type: 'button', textContent: '+ Thêm phiên bản', style: 'margin-top:14px' });
        addO.onclick = () => { p.options.push({ name: '', price: '' }); touch(); drawOpts(); const r = ow.querySelectorAll('.row'); r[r.length - 1].querySelector('input').focus(); };
        ow.append(addO);
      };
      drawOpts();
      form.append(card('Phiên bản / tùy chọn', [el('span', { className: 'hint', textContent: 'Ví dụ loại pin, bản tiêu chuẩn hay cao cấp. Khách chọn ở trang sản phẩm; giá và tin nhắn Zalo đổi theo phiên bản.' }), ow]));
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
  function check(label, obj, key, after) {
    const c = el('input', { type: 'checkbox', checked: obj[key] !== false });
    c.onchange = () => { obj[key] = c.checked; touch(); if (after) after(); };
    return el('label', { className: 'chk' }, [c, label]);
  }
  function color(label, obj, key, def) {
    const ok = (v) => /^#[0-9a-f]{6}$/i.test(v || '');
    const pick = el('input', { type: 'color', value: ok(obj[key]) ? obj[key] : def, style: 'width:56px;height:42px;padding:2px;border:1px solid #cfcac5;background:#fff' });
    const txt = el('input', { type: 'text', value: ok(obj[key]) ? obj[key] : def, style: 'max-width:130px' });
    const reset = el('button', { className: 'btn g s', type: 'button', textContent: 'Về mặc định' });
    pick.oninput = () => { obj[key] = pick.value; txt.value = pick.value; touch(); };
    txt.oninput = () => { if (ok(txt.value)) { obj[key] = txt.value; pick.value = txt.value; touch(); } };
    reset.onclick = () => { obj[key] = def; pick.value = def; txt.value = def; touch(); };
    return el('label', {}, [label, el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, [pick, txt, reset])]);
  }
  function vTheme(v) {
    const T = C.theme;
    v.append(card('Màu sắc', [grid([color('Màu chủ đạo (nút, điểm nhấn)', T, 'primary', '#f47825'), color('Màu tối (nền tối và chữ)', T, 'dark', '#231f20')]),
      el('span', { className: 'hint', textContent: 'Chữ trên nút màu chủ đạo luôn là màu tối, nên hãy chọn màu chủ đạo sáng và màu tối đủ đậm để dễ đọc.' })]));
    const SEC = [['hero', 'Phần mở đầu (ảnh xe và tiêu đề)'], ['moto', 'Danh mục Xe máy điện'], ['fashion', 'Danh mục Xe thời trang'], ['about', 'Giới thiệu Về YOKOSHIMA'], ['stores', 'Cửa hàng'], ['testdrive', 'Dải đăng ký lái thử']];
    v.append(card('Các mục trên trang chủ', SEC.map(([k, n]) => check(n, T.sections, k))));
    v.append(card('Danh mục sản phẩm ở trang chủ', [grid([
      field('Số sản phẩm hiện cho mỗi loại', T, 'homeCount', { options: [4, 8, 12, 16].map((n) => [n, n + ' sản phẩm']) }),
      field('Số sản phẩm một hàng trên điện thoại', T, 'mobileCols', { options: [2, 3, 4].map((n) => [n, n + ' sản phẩm']) })])]));
    const nav = el('div');
    T.nav.forEach((n) => nav.append(el('div', { className: 'row kv', style: 'grid-template-columns:1.5fr auto' }, [field('Tên mục', n, 'label'), check('Hiện', n, 'show')])));
    v.append(card('Menu đầu trang', [nav.childNodes.length ? nav : el('p', { className: 'hint', textContent: 'Chưa có mục menu.' })]));
    v.append(card('Khác', [check('Nút tròn “Đăng ký lái thử” nổi ở góc màn hình điện thoại', T, 'fab')]));
  }

  // ---- Xuất / nhập sản phẩm bằng Excel (.xlsx) hoặc CSV ----
  const COLS = [['id', 'Mã'], ['name', 'Tên sản phẩm'], ['cat', 'Loại'], ['line', 'Dòng xe'], ['badge', 'Nhãn'], ['price', 'Giá'], ['desc', 'Mô tả'], ['img', 'Ảnh'], ['visible', 'Hiển thị']].concat(SPECS);
  const norm = (s) => String(s == null ? '' : s).normalize('NFC').trim().toLowerCase();
  const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u) => { let c = -1; for (let i = 0; i < u.length; i++) c = crcT[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const xesc = (s) => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colName = (i) => { let s = ''; i++; while (i) { s = String.fromCharCode(65 + (i - 1) % 26) + s; i = Math.floor((i - 1) / 26); } return s; };
  function zip(files) { // lưu không nén
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    const u16 = (n) => [n & 255, n >>> 8 & 255], u32 = (n) => [n & 255, n >>> 8 & 255, n >>> 16 & 255, n >>> 24 & 255];
    files.forEach(([name, text]) => {
      const nm = enc.encode(name), d = enc.encode(text), c = crc32(d);
      const h = [].concat(u16(20), u16(0x800), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0));
      parts.push(new Uint8Array([0x50, 0x4b, 3, 4].concat(h)), nm, d);
      cen.push(new Uint8Array([0x50, 0x4b, 1, 2].concat(u16(20), h, u16(0), u16(0), u16(0), u32(0), u32(off))), nm);
      off += 30 + nm.length + d.length;
    });
    const cl = cen.reduce((a, x) => a + x.length, 0);
    return new Blob(parts.concat(cen, [new Uint8Array([0x50, 0x4b, 5, 6].concat(u16(0), u16(0), u16(files.length), u16(files.length), u32(cl), u32(off), u16(0)))]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function makeXlsx(rowsA) {
    const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    const sheet = rowsA.map((r, i) => '<row r="' + (i + 1) + '">' + r.map((v, j) => '<c r="' + colName(j) + (i + 1) + '" t="inlineStr"' + (i ? '' : ' s="1"') + '><is><t xml:space="preserve">' + xesc(v) + '</t></is></c>').join('') + '</row>').join('');
    return zip([
      ['[Content_Types].xml', X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="San pham" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/></cellXfs></styleSheet>'],
      ['xl/worksheets/sheet1.xml', X + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="14" customWidth="1" style="0"/><col min="2" max="2" width="30" customWidth="1" style="0"/><col min="3" max="' + rowsA[0].length + '" width="20" customWidth="1" style="0"/></cols><sheetData>' + sheet + '</sheetData></worksheet>']]);
  }
  async function unzip(buf) {
    const u = new Uint8Array(buf), dv = new DataView(buf), out = {}; let e = u.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('tệp không phải Excel (.xlsx)');
    let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
    for (let i = 0; i < n; i++) {
      const method = dv.getUint16(p + 10, true), cs = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(u.subarray(p + 46, p + 46 + nl));
      if (/^xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml)$/.test(name)) {
        const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = u.subarray(ds, ds + cs);
        if (method === 0) out[name] = new TextDecoder().decode(raw);
        else if (method === 8) out[name] = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
        else throw new Error('kiểu nén không hỗ trợ');
      }
      p += 46 + nl + xl + cl;
    }
    return out;
  }
  async function readXlsx(buf) {
    const f = await unzip(buf), parse = (t) => new DOMParser().parseFromString(t, 'application/xml');
    const tx = (node) => { let s = ''; node.querySelectorAll('t').forEach((t) => { if (t.parentNode.localName !== 'rPh') s += t.textContent; }); return s; };
    const shared = f['xl/sharedStrings.xml'] ? [...parse(f['xl/sharedStrings.xml']).querySelectorAll('si')].map(tx) : [];
    let sheetName = Object.keys(f).filter((k) => /worksheets\//.test(k)).sort()[0];
    try { // trang tính đầu tiên theo thứ tự trong sổ
      const rid = parse(f['xl/workbook.xml']).querySelector('sheet').getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const rel = [...parse(f['xl/_rels/workbook.xml.rels']).querySelectorAll('Relationship')].find((r) => r.getAttribute('Id') === rid);
      const t = 'xl/' + rel.getAttribute('Target').replace(/^\/?(xl\/)?/, ''); if (f[t]) sheetName = t;
    } catch (e) {}
    if (!sheetName) throw new Error('không thấy trang tính');
    const out = [];
    parse(f[sheetName]).querySelectorAll('sheetData > row').forEach((r) => {
      const row = [];
      r.querySelectorAll('c').forEach((c, k) => {
        const ref = (c.getAttribute('r') || '').replace(/\d+/g, ''); let ci = k;
        if (ref) { ci = 0; for (const ch of ref) ci = ci * 26 + ch.charCodeAt(0) - 64; ci--; }
        const t = c.getAttribute('t'), vn = c.querySelector('v'), v = vn ? vn.textContent : '';
        row[ci] = t === 's' ? (shared[+v] || '') : t === 'inlineStr' ? tx(c) : t === 'b' ? (v === '1' ? 'Có' : 'Không') : v;
      });
      out.push(Array.from(row, (x) => (x == null ? '' : x)));
    });
    return out;
  }
  function readCsv(text) {
    text = text.replace(/^\ufeff/, ''); const first = text.split(/\r?\n/)[0], sep = (first.split(';').length > first.split(',').length) ? ';' : first.includes('\t') && !first.includes(',') ? '\t' : ',';
    const out = []; let row = [], cur2 = '', inq = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inq) { if (ch === '"') { if (text[i + 1] === '"') { cur2 += '"'; i++; } else inq = false; } else cur2 += ch; }
      else if (ch === '"') inq = true; else if (ch === sep) { row.push(cur2); cur2 = ''; }
      else if (ch === '\n') { row.push(cur2); out.push(row); row = []; cur2 = ''; } else if (ch !== '\r') cur2 += ch;
    }
    if (cur2 || row.length) { row.push(cur2); out.push(row); }
    return out;
  }
  function exportProducts() {
    const catName = Object.fromEntries(CATS);
    const data = [COLS.map((c) => c[1])].concat(C.products.map((p) => COLS.map(([k]) => k === 'cat' ? (catName[p.cat] || p.cat || '') : k === 'visible' ? (p.visible === false ? 'Không' : 'Có') : (p[k] == null || p[k] === '—' ? '' : String(p[k])))));
    const a = el('a', { href: URL.createObjectURL(makeXlsx(data)), download: 'yokoshima-san-pham.xlsx' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  async function importProducts(file) {
    const table = (/\.csv$/i.test(file.name) ? readCsv(await file.text()) : await readXlsx(await file.arrayBuffer())).filter((r) => r.some((x) => String(x).trim()));
    if (table.length < 2) throw new Error('tệp chưa có dòng sản phẩm nào');
    const head = table[0].map(norm), idx = {};
    COLS.forEach(([k, n]) => { const i = head.findIndex((h) => h === norm(n) || h === norm(k)); if (i >= 0) idx[k] = i; });
    if (idx.name == null) throw new Error('thiếu cột “Tên sản phẩm”. Hãy bấm Xuất Excel để lấy tệp mẫu');
    const catKey = (v) => { const n = norm(v); const c = CATS.find(([k, t]) => norm(t) === n || k === n); return c ? c[0] : n.includes('đạp') || n.includes('thời trang') ? 'fashion' : n.includes('50') || n.includes('xăng') ? 'gas' : n.includes('phụ') || n.includes('sạc') ? 'acc' : n ? 'moto' : null; };
    const next = C.products.map((p) => Object.assign({}, p)), used = new Set(next.map((p) => p.id)), seen = new Set(), bad = []; let added = 0, changed = 0;
    table.slice(1).forEach((r, ri) => {
      const g = (k) => (idx[k] == null ? undefined : String(r[idx[k]] == null ? '' : r[idx[k]]).trim());
      const name = g('name'); if (!name) { bad.push(ri + 2); return; }
      let id = (g('id') || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
      let p = id ? next.find((x) => x.id === id) : null;
      if (id && seen.has(id)) { bad.push(ri + 2); return; }
      if (!p) { if (!id) { const base = slug(name) || 'sp'; id = base; let n = 2; while (used.has(id)) id = base + '-' + n++; } p = { id, cat: 'moto', line: '', badge: '', price: '', img: '', desc: '', visible: true }; next.push(p); used.add(id); added++; } else changed++;
      seen.add(id);
      COLS.forEach(([k]) => {
        const v = g(k); if (v === undefined || k === 'id') return;
        if (k === 'cat') { const c = catKey(v); if (c) p.cat = c; }
        else if (k === 'visible') p.visible = !/^(không|khong|no|0|false|ẩn|an)$/i.test(v);
        else if (k === 'price') p.price = /^\d{4,}(\.0+)?$/.test(v) ? Number(v).toLocaleString('vi-VN') : v.replace(/\s*(₫|đ|vnd|vnđ)$/i, '');
        else p[k] = v;
      });
    });
    if (!added && !changed) throw new Error('không có dòng hợp lệ nào');
    const msg = 'Tệp có ' + (added + changed) + ' sản phẩm hợp lệ: thêm mới ' + added + ', cập nhật ' + changed + '.' + (bad.length ? '\nBỏ qua dòng ' + bad.join(', ') + ' (thiếu tên hoặc trùng mã).' : '') + '\nSản phẩm không có trong tệp được giữ nguyên.\n\nÁp dụng? (Sau đó vẫn phải bấm “Lưu thay đổi”.)';
    if (!confirm(msg)) return false;
    C.products = next; touch(); return true;
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
