(() => {
    function injectCss(doc, href) {
      if (!doc || !doc.head) return;
      if (doc.getElementById('kb-cursors-css')) return;
  
      const link = doc.createElement('link');
      link.id = 'kb-cursors-css';
      link.rel = 'stylesheet';
      link.href = href;
      doc.head.appendChild(link);
    }
  
    function boot() {
      const iframe = document.getElementById('nitro');
      if (!iframe) return;
  
      const cssHref = "/assets/cursors/polar-blue/cursors.css";
  
      // aplica no TOP (toolbar, overlays)
      injectCss(document, cssHref);
  
      const applyToIframe = () => {
        try {
          injectCss(iframe.contentDocument, cssHref);
        } catch {}
      };
  
      iframe.addEventListener('load', applyToIframe);
      setTimeout(applyToIframe, 1200);
      setTimeout(applyToIframe, 3000);
    }
  
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  })();