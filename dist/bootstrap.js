(function(){
  const STORAGE_KEY = 'livia-jovana-site-content-v1';
  const SUPABASE_URL = (window.__SUPABASE_URL__ || 'https://upihgyqkcyqjqvclujpm.supabase.co');
  const SUPABASE_KEY = (window.__SUPABASE_KEY__ || 'sb_publishable_ri5QOHd4SUrVkCG696PIWA_IINiPZ-y');
  const MAIN_MODULE = '/assets/index-ClI75OJ_.js';
  const ADMIN_PATCH = '/admin-enhancer.js';

  let supabasePromise = null;

  function hasConfig() {
    return !!(SUPABASE_URL && SUPABASE_KEY);
  }

  async function getSupabase() {
    if (!hasConfig()) return null;
    if (!supabasePromise) {
      supabasePromise = import('https://esm.sh/@supabase/supabase-js@2')
        .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false }
        }))
        .catch((err) => {
          console.error('[bootstrap] erro ao carregar supabase-js', err);
          return null;
        });
    }
    return supabasePromise;
  }

  async function preloadContent() {
    if (!hasConfig()) return;
    try {
      const supabase = await getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('id', 'main')
        .maybeSingle();
      if (error) throw error;
      const remoteData = data && data.data;
      if (remoteData && typeof remoteData === 'object') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteData));
      }
    } catch (err) {
      console.warn('[bootstrap] usando conteúdo local por falha no Supabase', err);
    }
  }

  function installPersistenceBridge() {
    if (!hasConfig()) return;
    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    let saveTimer = null;
    let lastPayload = null;

    async function pushContent(raw) {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        const supabase = await getSupabase();
        if (!supabase) throw new Error('Supabase indisponível');
        const { error } = await supabase.from('site_content').upsert({
          id: 'main',
          data: parsed,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
        window.dispatchEvent(new CustomEvent('supabase-save-status', { detail: { ok: true, message: 'Salvo no Supabase' } }));
      } catch (err) {
        console.error('[bootstrap] erro ao salvar no Supabase', err);
        window.dispatchEvent(new CustomEvent('supabase-save-status', { detail: { ok: false, message: 'Erro ao salvar no Supabase' } }));
      }
    }

    Storage.prototype.setItem = function(key, value) {
      originalSetItem.call(this, key, value);
      if (this === localStorage && key === STORAGE_KEY) {
        lastPayload = value;
        window.dispatchEvent(new CustomEvent('supabase-save-status', { detail: { ok: true, pending: true, message: 'Salvando...' } }));
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function(){ pushContent(lastPayload); }, 500);
      }
    };

    Storage.prototype.removeItem = function(key) {
      originalRemoveItem.call(this, key);
      if (this === localStorage && key === STORAGE_KEY) {
        lastPayload = null;
      }
    };

    window.__SITE_SUPABASE__ = {
      url: SUPABASE_URL,
      key: SUPABASE_KEY,
      storageKey: STORAGE_KEY,

      async saveImagePath(pathParts, url) {
        const supabase = await getSupabase();
        if (!supabase) throw new Error('Supabase indisponível');
        const { data: row, error: readError } = await supabase
          .from('site_content')
          .select('data')
          .eq('id', 'main')
          .maybeSingle();
        if (readError) throw readError;
        const current = row && row.data && typeof row.data === 'object' ? JSON.parse(JSON.stringify(row.data)) : {};
        let target = current;
        for (let i = 0; i < pathParts.length - 1; i += 1) {
          const key = pathParts[i];
          if (target[key] == null || typeof target[key] !== 'object') {
            target[key] = typeof pathParts[i + 1] === 'number' ? [] : {};
          }
          target = target[key];
        }
        target[pathParts[pathParts.length - 1]] = url;
        const { error: writeError } = await supabase.from('site_content').upsert({
          id: 'main',
          data: current,
          updated_at: new Date().toISOString()
        });
        if (writeError) throw writeError;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        window.dispatchEvent(new CustomEvent('site-content-updated'));
      },

      async uploadImage(file) {
        const supabase = await getSupabase();
        if (!supabase) throw new Error('Supabase indisponível');
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileName = 'site-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + (ext || 'jpg');
        const path = 'uploads/' + fileName;
        const { error } = await supabase.storage.from('site-images').upload(path, file, {
          upsert: false,
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600'
        });
        if (error) throw error;
        window.dispatchEvent(new CustomEvent('supabase-save-status', { detail: { ok: true, pending: true, message: 'Upload feito, gerando link...' } }));
        const { data } = supabase.storage.from('site-images').getPublicUrl(path);
        if (!data || !data.publicUrl) throw new Error('Falha ao obter URL pública');
        return data.publicUrl;
      }
    };
  }

  function loadApp() {
    var script = document.createElement('script');
    script.type = 'module';
    script.src = MAIN_MODULE;
    document.head.appendChild(script);

    var patch = document.createElement('script');
    patch.src = ADMIN_PATCH;
    patch.defer = true;
    document.head.appendChild(patch);
  }

 installPersistenceBridge();
  loadApp();
  preloadContent();
  });
})();
