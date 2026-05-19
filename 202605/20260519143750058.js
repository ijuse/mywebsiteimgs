// 增强 Markdown 显示：
// - 代码复制、行内代码复制
// - [TOC] 目录
// - 外链图标 + 新窗口打开 + 网盘/AI/代码托管等特殊图标
// - 修复 iframe 响应式
// - 自定义短代码 [i][d][w]
// - 代码高亮（Highlight.js）
// - 返回顶部 + 二维码
// - 【新增】图片增强：自动显示 alt 文字（figcaption），并绑定 Fancybox 灯箱

(function () {
  'use strict';

  // ---------- 辅助函数 ----------
  function decodeHTMLEntities(text) {
    var textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // 短代码解析（需依赖 marked）
  function parseShortcodes(text) {
    function renderMarkdown(content) {
      if (typeof marked !== 'undefined') {
        return marked.parse(content);
      }
      return content;
    }
    text = text.replace(/\[i\]([\s\S]*?)\[\/i\]/g, function(match, inner) {
      return '<div class="i" markdown="1">' + renderMarkdown(inner) + '</div>';
    });
    text = text.replace(/\[d\]([\s\S]*?)\[\/d\]/g, function(match, inner) {
      return '<div class="d" markdown="1">' + renderMarkdown(inner) + '</div>';
    });
    text = text.replace(/\[w\]([\s\S]*?)\[\/w\]/g, function(match, inner) {
      return '<div class="w" markdown="1">' + renderMarkdown(inner) + '</div>';
    });
    return text;
  }
  window.parseShortcodes = parseShortcodes;

  // 配置 marked
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      gfm: true,
      breaks: true,
      sanitize: false
    });
  }

  // ---------- 通用配置 ----------
  var TOAST_TIMEOUT = 1500;
  var TOC_ACTIVE_OFFSET = 120;

  // ---------- 复制按钮 ----------
  function createCopyButton() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy-btn';
    btn.setAttribute('aria-label', '复制代码');
    btn.innerHTML = '<span class="copy-label">复制</span>';
    return btn;
  }

  function showToast(text) {
    var existing = document.querySelector('.copy-toast');
    if (existing) {
      existing.textContent = text;
      existing.classList.add('show');
      clearTimeout(existing._hideTimer);
      existing._hideTimer = setTimeout(function () { existing.classList.remove('show'); }, TOAST_TIMEOUT);
      return;
    }
    var t = document.createElement('div');
    t.className = 'copy-toast';
    t.textContent = text;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    t._hideTimer = setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 200);
    }, TOAST_TIMEOUT);
  }

  function copyTextToClipboard(text) {
    if (!text) return Promise.reject(new Error('empty'));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error('execCommand failed'));
      } catch (err) {
        document.body.removeChild(ta);
        reject(err);
      }
    });
  }

  function enhanceCodeBlocks(root) {
    root = root || document;
    var pres = root.querySelectorAll('pre');
    pres.forEach(function (pre) {
      var code = pre.querySelector('code');
      if (!code) return;
      if (pre.dataset.copyEnhanced === '1') return;
      pre.dataset.copyEnhanced = '1';
      var style = window.getComputedStyle(pre);
      if (style.position === 'static') pre.style.position = 'relative';
      var btn = createCopyButton();
      pre.appendChild(btn);
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var text = code.innerText || code.textContent || '';
        copyTextToClipboard(text).then(function () {
          btn.classList.add('success');
          btn.querySelector('.copy-label').textContent = '已复制';
          setTimeout(function () {
            btn.classList.remove('success');
            btn.querySelector('.copy-label').textContent = '复制';
          }, 1400);
        }).catch(function () {
          showToast('复制失败，请手动复制。');
        });
      });
    });
  }

  function enhanceInlineCode(root) {
    root = root || document;
    var codes = root.querySelectorAll('code');
    codes.forEach(function (code) {
      if (code.closest('pre')) return;
      if (code.dataset.inlineCopy === '1') return;
      code.dataset.inlineCopy = '1';
      code.style.cursor = 'pointer';
      code.setAttribute('title', '点击复制');
      code.addEventListener('click', function (ev) {
        ev.preventDefault();
        var text = code.innerText || code.textContent || '';
        copyTextToClipboard(text).then(function () {
          showToast('已复制代码片段');
        }).catch(function () {
          showToast('复制失败，请手动复制。');
        });
      });
    });
  }

  // ---------- 修复 iframe ----------
  function fixEmbedIframes(container) {
    if (!container) container = document;
    var iframes = container.querySelectorAll('iframe');
    iframes.forEach(function (iframe) {
      iframe.style.position = '';
      iframe.style.top = '';
      iframe.style.left = '';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.maxWidth = '100%';
      iframe.style.border = '0';

      var parent = iframe.parentElement;
      if (!parent) return;

      if (parent.classList.contains('video-responsive')) {
        parent.style.position = 'relative';
        parent.style.width = '800px';
        parent.style.maxWidth = '100%';
        parent.style.height = '600px';
        parent.style.overflow = 'hidden';
        parent.style.paddingBottom = '';
        return;
      }

      var wrapper = document.createElement('div');
      wrapper.className = 'video-responsive';
      wrapper.style.position = 'relative';
      wrapper.style.width = '800px';
      wrapper.style.maxWidth = '100%';
      wrapper.style.height = '600px';
      wrapper.style.overflow = 'hidden';
      wrapper.style.margin = '1.5em 0';

      parent.insertBefore(wrapper, iframe);
      wrapper.appendChild(iframe);
    });
  }

  // ---------- 目录 TOC ----------
  function slugify(text) {
    return text.toString().trim()
      .toLowerCase()
      .replace(/[^\w\-\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\-+/g, '-');
  }

  function buildNestedList(headings) {
    function createNode(h) {
      return {
        level: parseInt(h.tagName.substring(1), 10),
        id: h.id,
        title: h.textContent.replace(/^\s+|\s+$/g, ''),
        children: []
      };
    }
    var root = { level: 0, children: [] };
    var stack = [root];
    headings.forEach(function (h) {
      var node = createNode(h);
      var level = node.level;
      while (stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    });
    function buildUl(nodes) {
      if (!nodes || nodes.length === 0) return null;
      var ul = document.createElement('ul');
      nodes.forEach(function (node) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + node.id;
        a.textContent = node.title;
        a.className = 'toc-link';
        li.appendChild(a);
        if (node.children.length > 0) {
          var childUl = buildUl(node.children);
          if (childUl) li.appendChild(childUl);
        }
        ul.appendChild(li);
      });
      return ul;
    }
    var rootUl = buildUl(root.children);
    return rootUl || document.createElement('ul');
  }

  function generateTOC(rootSelector) {
    var root = null;
    if (rootSelector) {
      if (typeof rootSelector === 'string') root = document.querySelector(rootSelector);
      else if (rootSelector.nodeType === 1) root = rootSelector;
    }
    root = root || document;
    var container = (root.id === 'markdown-content') ? root : root.querySelector('#markdown-content');
    if (!container) return;
    var tocPlaceholders = Array.prototype.slice.call(container.querySelectorAll('p')).filter(function (p) {
      var txt = (p.textContent || '').trim();
      txt = txt.replace(/\u00A0/g, ' ').replace(/[\u2000-\u200F]/g, '').trim();
      return /\[\s*toc\s*\]/i.test(txt);
    });
    if (!tocPlaceholders.length) return;
    var headings = Array.prototype.slice.call(container.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    if (!headings.length) {
      tocPlaceholders.forEach(function (p) { p.remove(); });
      return;
    }
    var used = {};
    headings.forEach(function (h) {
      if (!h.id) {
        var s = slugify(h.textContent || h.innerText || 'heading');
        var base = s || 'heading';
        var uniq = base;
        var i = 1;
        while (used[uniq]) { uniq = base + '-' + i++; }
        used[uniq] = true;
        h.id = uniq;
      }
    });
    var nestedList = buildNestedList(headings);
    var panel = document.createElement('div');
    panel.className = 'toc-panel';
    var header = document.createElement('div');
    header.className = 'toc-header';
    var titleSpan = document.createElement('span');
    titleSpan.className = 'toc-title';
    titleSpan.textContent = '文章目录';
    var toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'toc-toggle-btn';
    toggleBtn.setAttribute('aria-label', '展开/折叠目录');
    toggleBtn.textContent = '☰';
    header.appendChild(titleSpan);
    header.appendChild(toggleBtn);
    var listWrapper = document.createElement('div');
    listWrapper.className = 'toc-list-wrapper';
    listWrapper.appendChild(nestedList);
    panel.appendChild(header);
    panel.appendChild(listWrapper);
    var firstPlaceholder = tocPlaceholders[0];
    firstPlaceholder.parentNode.replaceChild(panel, firstPlaceholder);
    for (var i = 1; i < tocPlaceholders.length; i++) {
      tocPlaceholders[i].remove();
    }
    document.body.classList.add('has-toc');
    bindTOCInteractions(panel);
  }

  function bindTOCInteractions(panel) {
    if (!panel) return;
    var toggleBtn = panel.querySelector('.toc-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        panel.classList.toggle('expanded');
        var expanded = panel.classList.contains('expanded');
        toggleBtn.setAttribute('aria-expanded', expanded);
      });
      panel.querySelector('.toc-header').addEventListener('click', function (e) {
        if (e.target === toggleBtn) return;
        if (window.innerWidth <= 900) {
          panel.classList.toggle('expanded');
        }
      });
    }
    var links = panel.querySelectorAll('.toc-link');
    links.forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var id = a.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState && history.replaceState(null, '', '#' + id);
          if (window.innerWidth <= 900) {
            panel.classList.remove('expanded');
          }
        }
      });
    });
    var headings = Array.prototype.slice.call(document.querySelectorAll('#markdown-content h1,#markdown-content h2,#markdown-content h3,#markdown-content h4,#markdown-content h5,#markdown-content h6'));
    var linkMap = {};
    links.forEach(function (a) {
      var href = a.getAttribute('href');
      if (href && href.indexOf('#') === 0) linkMap[href.slice(1)] = a;
    });
    var ticking = false;
    function updateActive() {
      var activeId = null;
      for (var i = 0; i < headings.length; i++) {
        var rect = headings[i].getBoundingClientRect();
        if (rect.top - TOC_ACTIVE_OFFSET <= 0) activeId = headings[i].id;
      }
      if (!activeId && headings.length) activeId = headings[0].id;
      links.forEach(function (ln) { ln.classList.remove('active'); });
      if (activeId && linkMap[activeId]) {
        linkMap[activeId].classList.add('active');
        if (window.innerWidth > 900) {
          var activeEl = linkMap[activeId];
          var scrollContainer = panel;
          var aRect = activeEl.getBoundingClientRect();
          var cRect = scrollContainer.getBoundingClientRect();
          if (aRect.top < cRect.top) scrollContainer.scrollTop -= (cRect.top - aRect.top + 8);
          else if (aRect.bottom > cRect.bottom) scrollContainer.scrollTop += (aRect.bottom - cRect.bottom + 8);
        }
      }
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          updateActive();
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateActive);
    updateActive();
  }

  // ---------- 外链处理 + 域名识别 ----------
  var domainClassMap = [
    { test: /(^|\.)yunpan\.360\.cn$/i, class: 'netdisk360' },
    { test: /(^|\.)pan\.baidu\.com$/i, class: 'baidu' },
    { test: /(^|\.)cloud\.189\.cn$/i, class: 'netdisk189' },
    { test: /(^|\.)ctfile\.com$|(^|\.)u062\.com$/i, class: 'netdiskct' },
    { test: /(^|\.)share\.weiyun\.com$/i, class: 'netdiskwy' },
    { test: /lanzou?\.com$|lanzou?\.|lanz/i, class: 'netdisklzy' },
    { test: /(^|\.)aliyundrive\.com$|(^|\.)alipan\.com$/i, class: 'netdiskali' },
    { test: /(^|\.)pan\.quark\.cn$/i, class: 'netdiskquark' },
    { test: /(^|\.)115\.com$/i, class: 'netdisk115' },
    { test: /(^|\.)pan\.xunlei\.com$/i, class: 'netdiskxl' },
    { test: /(^|\.)123pan\.com$|123684\.com|123865\.com/i, class: 'netdisk123' },
    { test: /(^|\.)microsoft\.com$/i, class: 'netdiskms' },
    { test: /(^|\.)139\.com$/i, class: 'netdisk139' },
    { test: /(^|\.)4275\.com$/i, class: 'netdisk4275' },
    { test: /(^|\.)liblib\.art$/i, class: 'ailiblib' },
    { test: /(^|\.)huggingface\.co$|hf-mirror\.com/i, class: 'aihuggingface' },
    { test: /(^|\.)civitai\.com$/i, class: 'aicivitai' },
    { test: /(^|\.)tusiart\.com$/i, class: 'aitusiart' },
    { test: /(^|\.)epicgames\.com$/i, class: 'gameepic' },
    { test: /(^|\.)steampowered\.com$|(^|\.)steam$/i, class: 'gamesteam' },
    { test: /(^|\.)reddit\.com$/i, class: 'reddit' },
    { test: /(^|\.)bilibili\.com$/i, class: 'linkbilibili' },
    { test: /(^|\.)zhihu\.com$/i, class: 'linkzhihu' },
    { test: /(^|\.)smzdm\.com$/i, class: 'linksmzdm' },
    { test: /(^|\.)52pojie\.cn$/i, class: 'link52pj' },
    { test: /(^|\.)anranpay\.com$|yiranpay\.com/i, class: 'linkyiran' },
    { test: /(^|\.)drive\.google\.com$/i, class: 'diskgoogle' },
    { test: /(^|\.)dropbox\.com$/i, class: 'diskdropbox' },
    { test: /(^|\.)mediafire\.com$/i, class: 'diskmediaFire' },
    { test: /(^|\.)onedrive\.live\.com$/i, class: 'diskonedrive' },
    { test: /(^|\.)mega\.nz$/i, class: 'diskmega' },
    { test: /(^|\.)mypikpak\.com$/i, class: 'diskmypikpak' },
    { test: /(^|\.)github\.com$/i, class: 'linkgithub' },
    { test: /(^|\.)gitlab\.com$/i, class: 'linkgitlab' },
    { test: /(^|\.)gitee\.com$/i, class: 'linkgitee' }
  ];

  function addLinkIconClass(link, href, currentHost) {
    if (link.getAttribute('data-icon-enhanced') === '1') return;
    // 排除 Fancybox 图片链接
    if (link.hasAttribute('data-fancybox')) {
      link.setAttribute('data-icon-enhanced', '1');
      return;
    }
    link.setAttribute('data-icon-enhanced', '1');
    var isSelf = false;
    var url = null;
    try {
      url = new URL(href, window.location.origin);
      isSelf = (url.hostname === currentHost) ||
               (href.startsWith('#') || href.startsWith('/') && !href.startsWith('//'));
    } catch (e) {
      isSelf = true;
    }
    if (isSelf) {
      link.classList.add('selflink');
      return;
    }
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    var matched = false;
    if (url) {
      var host = url.hostname;
      for (var i = 0; i < domainClassMap.length; i++) {
        var rule = domainClassMap[i];
        if (rule.test.test(host)) {
          link.classList.add('netdiskicon', rule.class);
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      link.classList.add('outlink');
    }
  }

  function enhanceExternalLinks(container) {
    if (!container) container = document;
    var currentHost = window.location.hostname;
    var links = container.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      var href = link.getAttribute('href');
      if (!href || href.trim() === '') continue;
      if (href.startsWith('#') || href.startsWith('javascript:')) continue;
      if (link.closest('#links')) continue;
      addLinkIconClass(link, href, currentHost);
    }
  }

  function ensureOutlinkStyle() {
    if (!document.getElementById('dynamic-outlink-style')) {
      var style = document.createElement('style');
      style.id = 'dynamic-outlink-style';
      style.textContent = `
        .outlink {
          background: url("data:image/svg+xml,%3Csvg t='1778426386229' class='icon' viewBox='0 0 1333 1024' xmlns='http://www.w3.org/2000/svg' p-id='20526' width='16' height='16'%3E%3Cpath d='M702.511628 1012.093023c-276.194233 0-500.093023-223.898791-500.093023-500.093023s223.898791-500.093023 500.093023-500.093023 500.093023 223.898791 500.093023 500.093023-223.898791 500.093023-500.093023 500.093023z m0-71.44186c236.734512 0 428.651163-191.916651 428.651163-428.651163s-191.916651-428.651163-428.651163-428.651163-428.651163 191.916651-428.651163 428.651163 191.916651 428.651163 428.651163 428.651163z' fill='%231994FB' p-id='20527'%3E%3C/path%3E%3Cpath d='M234.805581 324.226977a35.72093 35.72093 0 1 1 37.10214 61.058976c-138.668651 84.253767-208.229209 171.460465-191.988093 224.637024 29.386419 96.065488 317.44 111.687442 639.09507 13.335814C1040.669767 524.907163 1270.712558 350.898605 1241.373767 254.833116c-12.073674-39.483535-113.830698-71.084651-253.809116-74.061395a35.72093 35.72093 0 1 1 1.547907-71.441861c170.555535 3.643535 295.459721 42.436465 320.583442 124.618419 46.627721 152.504558-212.277581 348.326698-569.796465 457.632744C382.380651 800.88707 58.225116 783.312372 11.597395 630.831628c-29.362605-96.041674 59.058605-206.824186 223.208186-306.580837z' fill='%231994FB' p-id='20528'%3E%3C/path%3E%3Cpath d='M821.581395 666.790698a130.976744 130.976744 0 1 1 0-261.953489 130.976744 130.976744 0 0 1 0 261.953489z m0-47.627907a83.348837 83.348837 0 1 0 0-166.697675 83.348837 83.348837 0 0 0 0 166.697675zM464.372093 381.023256a83.348837 83.348837 0 1 1 0-166.697675 83.348837 83.348837 0 0 1 0 166.697675z m0-47.627907a35.72093 35.72093 0 1 0 0-71.441861 35.72093 35.72093 0 0 0 0 71.441861z' fill='%231994FB' p-id='20529'%3E%3C/path%3E%3C/svg%3E") left center no-repeat;
          background-size: 1em;
          padding-left: 1.2em;
        }
        .selflink {
          background: url("data:image/svg+xml,%3Csvg t='1778426185864' class='icon' viewBox='0 0 1638 1024' xmlns='http://www.w3.org/2000/svg' p-id='7004' width='16' height='16'%3E%3Cpath d='M768 716.8h-51.2v-102.4h51.2a256 256 0 0 0 0-512H358.4a256 256 0 0 0 0 512h51.2v102.4H358.4A358.4 358.4 0 0 1 358.4 0h409.6a358.4 358.4 0 0 1 0 716.8z' fill='%2354C3F1' p-id='7005'%3E%3C/path%3E%3Cpath d='M1280 1024h-409.6a358.4 358.4 0 0 1 0-716.8h51.2v102.4h-51.2a256 256 0 0 0 0 512h409.6a256 256 0 0 0 0-512h-51.2V307.2h51.2a358.4 358.4 0 0 1 0 716.8z' fill='%2354C3F1' p-id='7006'%3E%3C/path%3E%3C/svg%3E") left center no-repeat;
          background-size: 1em;
          padding-left: 1.2em;
        }
        .netdiskicon {
          background-position: left center;
          background-repeat: no-repeat;
          background-size: 16px;
          padding-left: 20px;
          display: inline-block;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ---------- 返回顶部 + 二维码 ----------
  var _qrOverlay = null;
  function showPageQR() {
    if (_qrOverlay) return;
    var overlay = document.createElement('div');
    overlay.className = 'qr-overlay';
    overlay.tabIndex = -1;
    var box = document.createElement('div');
    box.className = 'qr-box';
    var title = document.createElement('div');
    title.className = 'qr-title';
    title.textContent = '扫描访问此页';
    var img = document.createElement('img');
    var src = 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=' + encodeURIComponent(location.href);
    img.src = src;
    img.alt = 'QR code';
    img.className = 'qr-image';
    box.appendChild(title);
    box.appendChild(img);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    _qrOverlay = overlay;
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) hidePageQR();
    });
    setTimeout(function () {
      document.addEventListener('click', onDocClickForQR);
    }, 0);
    window.addEventListener('keydown', onKeyDownForQR);
  }

  function onDocClickForQR(e) {
    if (!_qrOverlay) return;
    var box = _qrOverlay.querySelector('.qr-box');
    if (!box) return hidePageQR();
    if (!box.contains(e.target)) hidePageQR();
  }

  function onKeyDownForQR(e) {
    if (e.key === 'Escape' || e.key === 'Esc') hidePageQR();
  }

  function hidePageQR() {
    if (!_qrOverlay) return;
    try { document.removeEventListener('click', onDocClickForQR); } catch (e) {}
    try { window.removeEventListener('keydown', onKeyDownForQR); } catch (e) {}
    _qrOverlay.remove();
    _qrOverlay = null;
  }

  function createBackToTopAndQR() {
    if (document.querySelector('.back-to-top-wrapper')) return;
    var wrap = document.createElement('div');
    wrap.className = 'back-to-top-wrapper';
    wrap.innerHTML =
      '<button class="back-to-top" aria-label="返回顶部">▲</button>\n' +
      '<button class="qr-trigger" title="生成二维码">◷</button>';
    document.body.appendChild(wrap);
    var backBtn = wrap.querySelector('.back-to-top');
    var qrBtn = wrap.querySelector('.qr-trigger');
    function updateVisibility() {
      if (window.scrollY > 200) wrap.classList.add('visible');
      else wrap.classList.remove('visible');
    }
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    backBtn.addEventListener('click', function (e) {
      if (e.shiftKey) {
        showPageQR();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    qrBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      showPageQR();
    });
  }

  // ---------- 代码高亮 ----------
  var highlightLoaded = false;
  var highlightQueue = [];

  function loadHighlightJS(callback) {
    if (typeof hljs !== 'undefined') {
      highlightLoaded = true;
      callback && callback();
      return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/ashes.css';
    document.head.appendChild(link);
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    script.onload = function() {
      var langScript = document.createElement('script');
      langScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/go.min.js';
      document.head.appendChild(langScript);
      highlightLoaded = true;
      callback && callback();
    };
    document.head.appendChild(script);
  }

  function applyHighlightToElement(container) {
    if (!highlightLoaded) {
      highlightQueue.push(container);
      return;
    }
    if (!container || typeof hljs === 'undefined') return;
    var codeBlocks = container.querySelectorAll('pre code');
    codeBlocks.forEach(function(block) {
      if (block.parentElement.dataset.highlighted === '1') return;
      try {
        hljs.highlightElement(block);
        block.parentElement.dataset.highlighted = '1';
      } catch (e) {
        console.warn('Highlight failed:', e);
      }
    });
  }

  function initSyntaxHighlight() {
    loadHighlightJS(function() {
      var root = document.querySelector('#markdown-content');
      if (root) applyHighlightToElement(root);
      while (highlightQueue.length) {
        applyHighlightToElement(highlightQueue.shift());
      }
    });
  }

  // ========== 新增：图片增强（显示 alt 文字 + Fancybox 灯箱） ==========
  // 等待 jQuery 和 Fancybox 加载完成的辅助函数
  function waitForFancybox(callback) {
    if (typeof jQuery !== 'undefined' && jQuery.fancybox) {
      callback();
      return;
    }
    setTimeout(function() { waitForFancybox(callback); }, 100);
  }

  // 转义 HTML 特殊字符（防止 XSS）
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  // 增强单张图片：用 <figure> + <figcaption> 包裹，并绑定 fancybox
  function enhanceImageWithCaption(img) {
    if (!img || img._imgEnhanced) return;
    // 避免重复处理已经包裹过的图片
    if (img.parentElement && img.parentElement.tagName === 'A' && img.parentElement.parentElement && img.parentElement.parentElement.tagName === 'FIGURE') {
      return;
    }
    img._imgEnhanced = true;

    var $img = jQuery(img);
    var src = $img.attr('src');
    var altText = $img.attr('alt') || '';
    var caption = escapeHtml(altText);

    // 创建 <figure> 容器
    var $figure = jQuery('<figure class="img-figure" style="margin:1.5em 0; text-align:center; display:flex; flex-direction:column; align-items:center;"></figure>');
    // 创建 <a> 标签用于 Fancybox
    var $link = jQuery('<a href="' + src + '" data-fancybox="lightbox" data-caption="' + caption + '" style="display:inline-block;"></a>');
    // 将 img 移动到 <a> 中
    $img.wrap($link);
    // 将 <a> 包裹进 <figure>
    $link.wrap($figure);
    // 添加 figcaption
    if (caption) {
      $figure.append('<figcaption class="img-caption" style="font-size:0.9rem; color:#666; text-align:center; margin-top:0.6rem; font-style:italic;">' + caption + '</figcaption>');
    }
    // 鼠标指针变为放大镜
    $img.css('cursor', 'zoom-in');
  }

  function enhanceAllImagesWithCaption(container) {
    if (typeof jQuery === 'undefined') return;
    var $container = jQuery(container);
    if (!$container.length) $container = jQuery('#markdown-content');
    $container.find('img').each(function() {
      enhanceImageWithCaption(this);
    });
  }

  // 监听动态插入的图片并增强
  function observeImagesWithCaption(root) {
    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(function(node) {
            if (!node || node.nodeType !== 1) return;
            if (node.tagName === 'IMG') {
              enhanceImageWithCaption(node);
            } else if (node.querySelectorAll) {
              jQuery(node).find('img').each(function() {
                enhanceImageWithCaption(this);
              });
            }
          });
        }
      });
    });
    observer.observe(root, { childList: true, subtree: true });
    return observer;
  }

  // ---------- 动态监听其他增强 ----------
  function observeForNewMarkdown(rootSelector) {
    var root = null;
    if (rootSelector) {
      if (typeof rootSelector === 'string') root = document.querySelector(rootSelector);
      else if (rootSelector.nodeType === 1) root = rootSelector;
    }
    root = root || document.body;

    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === 'childList' && m.addedNodes.length) {
          m.addedNodes.forEach(function (node) {
            if (!node || node.nodeType !== 1) return;
            if (node.matches && node.matches('.markdown-content')) {
              generateTOC(node);
              enhanceCodeBlocks(node);
              enhanceInlineCode(node);
              enhanceExternalLinks(node);
              fixEmbedIframes(node);
              applyHighlightToElement(node);
              // 新增强图片
              enhanceAllImagesWithCaption(node);
            } else {
              if (node.querySelectorAll) {
                if (node.querySelectorAll('pre, code').length) {
                  enhanceCodeBlocks(node);
                  enhanceInlineCode(node);
                  applyHighlightToElement(node);
                }
                if (node.querySelectorAll('a').length) {
                  enhanceExternalLinks(node);
                }
                if (node.querySelectorAll('iframe').length) {
                  fixEmbedIframes(node);
                }
                if (node.querySelectorAll('img').length) {
                  enhanceAllImagesWithCaption(node);
                }
                if (node.querySelectorAll('p').length) {
                  generateTOC('#markdown-content');
                }
              }
            }
          });
        }
      });
    });
    mo.observe(root, { childList: true, subtree: true });
    return mo;
  }

  // ---------- 初始化入口 ----------
  function initMarkdownEnhance(rootSelector) {
    var root = null;
    if (rootSelector) {
      if (typeof rootSelector === 'string') root = document.querySelector(rootSelector);
      else if (rootSelector.nodeType === 1) root = rootSelector;
    }
    root = root || document;
    generateTOC(root || '#markdown-content');
    enhanceCodeBlocks(root);
    enhanceInlineCode(root);
    fixEmbedIframes(root);
    enhanceExternalLinks(root);
    // 等待 Fancybox 就绪后增强图片
    waitForFancybox(function() {
      enhanceAllImagesWithCaption(root);
    });
    observeForNewMarkdown(root);
    createBackToTopAndQR();
    initSyntaxHighlight();
    ensureOutlinkStyle();
  }

  // 自动初始化
  document.addEventListener('DOMContentLoaded', function () {
    initMarkdownEnhance('#markdown-content');
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(function () { initMarkdownEnhance('#markdown-content'); }, 0);
  }

  window.initMarkdownEnhance = initMarkdownEnhance;
  window.decodeHTMLEntities = decodeHTMLEntities;
})();