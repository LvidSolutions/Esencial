module.exports = function handler(_req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
  res.setHeader('Cache-Control', 'private, no-store')
  res.end(`(() => {
    const parentOrigin = document.querySelector('meta[name="esencial-preview-parent-origin"]')?.content;
    const route = document.body?.dataset.cmsRoute || location.pathname;
    const perspective = document.body?.dataset.cmsPerspective || 'drafts';
    const post = (message) => parentOrigin && parent !== window && parent.postMessage(message, parentOrigin);
    const inspect = () => {
      const issues = [];
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) issues.push({code:'horizontal-scroll',severity:'blocker',route,field:'page',message:'Sidan skapar horisontell scroll.',suggestion:'Låt innehållet reflowa utan att döljas.'});
      document.querySelectorAll('img[data-cms-media]').forEach((image) => { if (image.complete && !image.naturalWidth) issues.push({code:'broken-media',severity:'blocker',route,field:'heroImage',message:'Huvudbilden kunde inte laddas.',suggestion:'Kontrollera bildreferensen i Studio.'}); });
      post({type:'esencial-preview/diagnostics',version:1,route,perspective,issues});
    };
    addEventListener('load', () => { post({type:'esencial-preview/ready',version:1,route,perspective,authenticated:true,renderer:'frontend'}); inspect(); });
    document.addEventListener('click', (event) => { const target = event.target.closest('[data-cms-edit-target]'); if (!target) return; event.preventDefault(); post({type:'esencial-preview/edit',version:1,documentId:target.dataset.cmsDocumentId,path:target.dataset.cmsPath}); });
  })();`)
}
