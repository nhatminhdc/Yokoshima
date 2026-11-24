/* Runtime nhỏ: dựng trang từ khuôn mẫu + lớp Component (state, vòng lặp, điều kiện, sự kiện). */
(async function () {
  // Nội dung (sản phẩm, cửa hàng, thông tin chung) lấy từ API; nếu không có thì dùng bản gốc đi kèm.
  async function loadContent() {
    try { const r = await fetch('/api/content'); if (r.ok) { const j = await r.json(); if (j && j.products) return j; } } catch (e) {}
    const r = await fetch('data/seed.json'); return r.json();
  }
  const C = await loadContent();
  const SPEC = ['range', 'speed', 'power', 'load', 'battType', 'battCap', 'charge', 'dims', 'weight', 'tire', 'brake', 'light', 'lock', 'warranty'];
  const products = (C.products || []).filter((p) => p.visible !== false).map((p) => {
    const q = Object.assign({}, p);
    SPEC.forEach((k) => { if (!q[k]) q[k] = '—'; });
    q.badge = q.badge || ''; q.desc = q.desc || ''; q.img = q.img || '';
    q.noImg = !q.img;
    q.priceText = q.price ? q.price + ' ₫' : 'Liên hệ';
    q.sub = q.cat === 'acc' ? q.desc : (q.range !== '—' ? q.range + '/lần sạc · ' : '') + (q.speed !== '—' ? q.speed : '');
    return q;
  });
  const S = Object.assign({}, C.settings || {});
  S.hotlineRaw = String(S.hotline || '').replace(/\D/g, '');
  S.zaloRaw = String(S.zalo || S.hotline || '').replace(/\D/g, '');
  const H = C.home || {};
  const feat = (id) => products.find((p) => p.id === id) || products[0] || {};
  const stores = C.stores || [];
  window.YK = { products, stores, warranty: C.warranty || { rows: [] }, faq: C.faq || [],
    scope: { S, H, W: C.warranty || { rows: [] }, FAQ: C.faq || [], F0: feat((H.featured || [])[0]), F1: feat((H.featured || [])[1]), N: { stores: stores.length } } };

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(o) {
      this.state = Object.assign({}, this.state, typeof o === 'function' ? o(this.state) : o);
      if (this.__render) this.__render();
    }
    forceUpdate() { if (this.__render) this.__render(); }
  }
  const tpl = document.getElementById('dc-template').content;
  const code = document.getElementById('dc-logic').textContent;
  const Component = new Function('DCLogic', code + '\nreturn Component;')(DCLogic);
  const inst = new Component({});
  const root = document.getElementById('app');
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  const ALIAS = { 'dc-select': 'select', 'dc-option': 'option' };
  const SVG = 'http://www.w3.org/2000/svg';

  function look(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    let v = scope;
    for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, (m, p) => { const v = look(p, scope); return v == null ? '' : String(v); });
  }
  function kids(node, scope, out) { node.childNodes.forEach((c) => build(c, scope, out)); }
  function build(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = look(WHOLE.exec(node.getAttribute('list'))[1], scope) || [];
      const as = node.getAttribute('as');
      list.forEach((it, i) => { const s = Object.create(scope); s[as] = it; s.$index = i; kids(node, s, out); });
      return;
    }
    if (tag === 'sc-if') {
      if (look(WHOLE.exec(node.getAttribute('value'))[1], scope)) kids(node, scope, out);
      return;
    }
    const el = node.namespaceURI === SVG ? document.createElementNS(SVG, node.tagName) : document.createElement(ALIAS[tag] || tag);
    const later = [];
    for (const at of Array.from(node.attributes)) {
      const n = at.name, v = at.value;
      if (n.indexOf('hint-') === 0) continue;
      const w = WHOLE.exec(v);
      if (/^on[a-z]+$/.test(n) && w) {
        const fn = look(w[1], scope);
        if (typeof fn === 'function') {
          let ev = n.slice(2);
          const t = el.tagName;
          if (ev === 'change' && (t === 'TEXTAREA' || (t === 'INPUT' && el.type !== 'checkbox' && el.type !== 'radio'))) ev = 'input';
          el.addEventListener(ev, fn);
        }
        continue;
      }
      if (w) {
        const val = look(w[1], scope);
        if (n === 'value') { later.push(() => { el.value = val == null ? '' : val; }); continue; }
        if (n === 'checked') { el.checked = !!val; continue; }
        if (n.indexOf('aria-') === 0) { if (val != null) el.setAttribute(n, String(val)); continue; }
        if (val === false || val == null) continue;
        el.setAttribute(n, val === true ? '' : String(val));
        continue;
      }
      el.setAttribute(n, v.indexOf('{{') >= 0 ? interp(v, scope) : v);
    }
    kids(node, scope, el);
    later.forEach((f) => f());
    out.appendChild(el);
  }
  function pathOf(el) {
    const p = [];
    while (el && el !== root) { const par = el.parentNode; if (!par) return null; p.unshift(Array.prototype.indexOf.call(par.childNodes, el)); el = par; }
    return el === root ? p : null;
  }
  function render() {
    const act = document.activeElement;
    const path = act && root.contains(act) ? pathOf(act) : null;
    let s0 = null, s1 = null;
    try { s0 = act.selectionStart; s1 = act.selectionEnd; } catch (e) {}
    const frag = document.createDocumentFragment();
    kids(tpl, Object.assign({}, window.YK.scope, inst.renderVals() || {}), frag);
    root.replaceChildren(frag);
    if (path) {
      let el = root;
      for (const i of path) { el = el && el.childNodes[i]; }
      if (el && el.focus) { el.focus({ preventScroll: true }); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (e) {} }
    }
  }
  inst.__render = render;
  render();
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });
  if (location.hash.length > 1) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) t.scrollIntoView();
  }
})();
