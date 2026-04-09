(function(){
  var VERSION = 'ADMIN ENHANCER LJV FINAL 2';
  console.log(VERSION);

  function isAdminRoute() {
    return location.pathname === '/admin' || location.pathname.endsWith('/admin/');
  }

  function makeStatusBadge() {
    var badge = document.createElement('div');
    badge.id = 'supabase-status-badge';
    badge.style.cssText = 'padding:8px 12px;border-radius:999px;background:#fff;border:1px solid rgba(212,165,116,.35);color:#7A5637;font:600 12px/1.2 Jost,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.06)';
    badge.textContent = 'Conectando...';
    return badge;
  }

  function dispatchStatus(detail) {
    window.dispatchEvent(new CustomEvent('supabase-save-status', { detail: detail || {} }));
  }

  function installStatusBadge() {
    if (!isAdminRoute() || document.getElementById('supabase-status-badge')) return;
    var controlsButton = Array.from(document.querySelectorAll('button,a')).find(function(el){
      return el.textContent && el.textContent.indexOf('Ver site') >= 0;
    });
    var controls = controlsButton ? controlsButton.parentElement : null;
    if (!controls) return;
    controls.prepend(makeStatusBadge());
    window.addEventListener('supabase-save-status', function(event){
      var badge = document.getElementById('supabase-status-badge');
      if (!badge) return;
      var detail = event.detail || {};
      badge.textContent = detail.message || 'Pronto';
      badge.style.background = detail.ok === false ? '#fff5f5' : detail.pending ? '#fffaf2' : '#f6fff6';
      badge.style.borderColor = detail.ok === false ? '#efc2c2' : detail.pending ? '#ecd6b5' : '#b7dfb7';
      badge.style.color = detail.ok === false ? '#b14646' : detail.pending ? '#8a6b2f' : '#2b7a2b';
    });
    dispatchStatus({ ok: true, message: 'Pronto para salvar' });
  }

  function setReactInputValue(input, value) {
    var descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function compressImage(file) {
    return new Promise(function(resolve) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        resolve(file);
        return;
      }
      var img = new Image();
      var reader = new FileReader();
      reader.onerror = function(){ resolve(file); };
      reader.onload = function(e) {
        img.onerror = function(){ resolve(file); };
        img.onload = function() {
          var maxSize = 1600;
          var width = img.width;
          var height = img.height;
          if (width > maxSize || height > maxSize) {
            var ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          var canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(function(blob) {
            if (blob) {
              var safeName = (file.name || 'imagem').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-');
              resolve(new File([blob], safeName + '.jpg', { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.88);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function hasText(node, text) {
    return normalizeText((node && node.textContent) || '').indexOf(normalizeText(text)) >= 0;
  }

  function getNearestBlock(label) {
    return label.closest('section, article, form, [data-field], [class], div');
  }

  function getHeadingText(label) {
    var block = getNearestBlock(label);
    if (!block) return '';
    var heading = block.querySelector('h1, h2, h3, h4');
    return normalizeText((heading && heading.textContent) || '');
  }

  function getAncestorCardByButtonText(label, buttonText) {
    var current = label;
    var target = normalizeText(buttonText);
    while (current && current !== document.body) {
      var buttons = current.querySelectorAll ? current.querySelectorAll('button') : [];
      var match = Array.from(buttons).some(function(btn){
        return normalizeText(btn.textContent || '') === target;
      });
      if (match) return current;
      current = current.parentElement;
    }
    return null;
  }

  function getCardIndexByButtonText(buttonText, card) {
    if (!card) return -1;
    var target = normalizeText(buttonText);
    var cards = Array.from(document.querySelectorAll('button')).filter(function(btn){
      return normalizeText(btn.textContent || '') === target;
    }).map(function(btn){
      var node = btn.parentElement;
      while (node && node !== document.body) {
        if (node.querySelector && node.querySelector('input')) return node;
        node = node.parentElement;
      }
      return null;
    }).filter(Boolean);
    return cards.indexOf(card);
  }

  function getAllEnhancedImageLabels() {
    return Array.from(document.querySelectorAll('label')).filter(function(node){
      var header = node.querySelector('span');
      var labelText = normalizeText((header && header.textContent) || node.textContent || '');
      return /(^imagem$|^foto$|^image$|^photo$|banner|capa|thumb|thumbnail)/.test(labelText);
    });
  }

  function getLabelGlobalIndex(label) {
    return getAllEnhancedImageLabels().indexOf(label);
  }

  function resolveContentPath(label, input) {
    var heading = getHeadingText(label);
    var pageText = normalizeText(document.body.textContent || '');

    var heroCard = getAncestorCardByButtonText(label, 'Remover slide');
    var heroIndex = getCardIndexByButtonText('Remover slide', heroCard);
    if (heroIndex >= 0) {
      return ['heroSlides', heroIndex, 'image'];
    }

    var portfolioCard = getAncestorCardByButtonText(label, 'Remover foto');
    var portfolioIndex = getCardIndexByButtonText('Remover foto', portfolioCard);
    if (portfolioIndex >= 0) {
      return ['portfolio', 'photos', portfolioIndex, 'src'];
    }

    if (heading.indexOf('sobre') >= 0 || heading.indexOf('about') >= 0) {
      return ['about', 'image'];
    }
    if (heading.indexOf('hero') >= 0 || heading.indexOf('slide') >= 0) {
      var globalHeroIndex = getLabelGlobalIndex(label);
      return globalHeroIndex >= 0 ? ['heroSlides', globalHeroIndex, 'image'] : ['heroSlides', 0, 'image'];
    }
    if (heading.indexOf('portfolio') >= 0 || heading.indexOf('portifolio') >= 0 || heading.indexOf('portfol') >= 0) {
      var globalPortfolioIndex = getLabelGlobalIndex(label) - 4;
      return globalPortfolioIndex >= 0 ? ['portfolio', 'photos', globalPortfolioIndex, 'src'] : ['portfolio', 'photos', 0, 'src'];
    }

    var globalIndex = getLabelGlobalIndex(label);
    if (globalIndex >= 0 && globalIndex <= 2) {
      return ['heroSlides', globalIndex, 'image'];
    }
    if (globalIndex === 3) {
      return ['about', 'image'];
    }
    if (globalIndex >= 4) {
      return ['portfolio', 'photos', globalIndex - 4, 'src'];
    }

    if (pageText.indexOf('remover slide') >= 0) {
      return ['heroSlides', 0, 'image'];
    }

    return null;
  }

  function setDeepValue(target, path, value) {
    if (!target || !path || !path.length) return false;
    var current = target;
    for (var i = 0; i < path.length - 1; i += 1) {
      var key = path[i];
      if (current[key] == null || typeof current[key] !== 'object') {
        current[key] = typeof path[i + 1] === 'number' ? [] : {};
      }
      current = current[key];
    }
    current[path[path.length - 1]] = value;
    return true;
  }

  function persistImageUrl(path, url) {
    var storageKey = window.__SITE_SUPABASE__ && window.__SITE_SUPABASE__.storageKey;
    if (!storageKey) throw new Error('Storage do conteúdo indisponível');
    var raw = localStorage.getItem(storageKey);
    if (!raw) throw new Error('Conteúdo do site não encontrado');
    var parsed = JSON.parse(raw);
    var ok = setDeepValue(parsed, path, url);
    if (!ok) throw new Error('Não foi possível localizar o campo da imagem para salvar');
    localStorage.setItem(storageKey, JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent('site-content-updated'));
  }

  async function handleUpload(input, fileInput, preview, status, button, label) {
    var file = fileInput.files && fileInput.files[0];
    if (!file || !window.__SITE_SUPABASE__) return;
    var path = resolveContentPath(label, input);
    if (!path) {
      alert('Esse campo ainda não está pronto para upload direto.');
      return;
    }
    button.disabled = true;
    status.textContent = 'Preparando imagem...';
    try {
      var compressed = await compressImage(file);
      status.textContent = 'Enviando imagem...';
      dispatchStatus({ ok: true, pending: true, message: 'Enviando imagem...' });
      var url = await window.__SITE_SUPABASE__.uploadImage(compressed);
      setReactInputValue(input, url);
      preview.src = url;
      preview.style.display = 'block';
      status.textContent = 'Salvando no conteúdo...';
      await window.__SITE_SUPABASE__.saveImagePath(path, url);
      persistImageUrl(path, url);
      status.textContent = 'Imagem salva com sucesso';
      dispatchStatus({ ok: true, message: 'Imagem salva com sucesso' });
    } catch (err) {
      console.error(err);
      var msg = err && err.message ? err.message : 'Falha no upload';
      status.textContent = 'Erro no upload: ' + msg;
      dispatchStatus({ ok: false, message: 'Erro ao salvar imagem' });
      alert('Erro ao enviar imagem para o Supabase: ' + msg);
    } finally {
      button.disabled = false;
      fileInput.value = '';
    }
  }

  function enhanceImageField(label) {
    if (label.dataset.uploadEnhanced === '1') return;
    var header = label.querySelector('span');
    var labelText = normalizeText((header && header.textContent) || label.textContent || '');
    if (!/(^imagem$|^foto$|^image$|^photo$|banner|capa|thumb|thumbnail)/.test(labelText)) return;
    var input = label.querySelector('input[type="text"], input:not([type])');
    if (!input) return;
    label.dataset.uploadEnhanced = '1';

    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:grid;gap:8px;margin-top:8px';

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.cssText = 'width:100%;border-radius:12px;border:1px dashed rgba(212,165,116,.45);padding:10px;background:#fff';

    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Enviar imagem';
    button.style.cssText = 'border-radius:12px;border:none;padding:10px 14px;background:linear-gradient(135deg, #D4A574 0%, #C9956F 100%);color:#fff;font-weight:700;cursor:pointer;justify-self:start';

    var status = document.createElement('small');
    status.style.cssText = 'color:#7A5637;font:500 12px/1.4 Jost,sans-serif';
    status.textContent = 'Selecione uma imagem e envie para salvar no site';

    var preview = document.createElement('img');
    preview.alt = 'Preview';
    preview.src = input.value || '';
    preview.style.cssText = 'display:' + (input.value ? 'block' : 'none') + ';width:100%;max-width:220px;height:140px;object-fit:cover;border-radius:12px;border:1px solid rgba(212,165,116,.25);background:#f7f2eb';

    button.addEventListener('click', function(){
      if (!fileInput.files || !fileInput.files[0]) {
        alert('Escolha uma imagem primeiro.');
        return;
      }
      handleUpload(input, fileInput, preview, status, button, label);
    });

    input.addEventListener('input', function(){
      if (input.value) {
        preview.src = input.value;
        preview.style.display = 'block';
      }
    });

    wrap.appendChild(fileInput);
    wrap.appendChild(button);
    wrap.appendChild(status);
    wrap.appendChild(preview);
    label.appendChild(wrap);
  }

  function scan() {
    if (!isAdminRoute()) return;
    installStatusBadge();
    document.querySelectorAll('label').forEach(enhanceImageField);
  }

  var observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
})();
