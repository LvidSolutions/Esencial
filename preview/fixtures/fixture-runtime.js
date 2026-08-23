(function renderFixture() {
  'use strict'

  var params = new URLSearchParams(location.search)
  var variant = params.get('variant') || 'long-sv'
  var parentMeta = document.querySelector('meta[name="esencial-preview-parent-origin"]')
  parentMeta.setAttribute('content', location.origin)

  var validImage =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l7u0YQAAAABJRU5ErkJggg=='
  var copy = {
    'long-sv': {
      route: '/projekt/lang-svensk-fixtur/',
      title: 'Ett omsorgsfullt stadsrum för vardag, möten och långsiktigt gemensamt bruk',
      summary:
        'Projektet förenar tydliga stråk, robusta material och generösa vistelseytor. Den längre svenska texten ska radbrytas naturligt i mobil, platta och dator utan att klippas, döljas eller skapa horisontell scroll.',
    },
    'long-en': {
      route: '/projects/long-english-fixture/',
      title: 'A carefully composed civic place for everyday life, shared encounters and long-term use',
      summary:
        'The project combines legible routes, durable materials and generous places to pause. This longer English copy must reflow naturally on phone, tablet and desktop without clipping, hidden text or horizontal scrolling.',
    },
  }

  document.body.dataset.cmsPerspective = 'staging'
  if (variant === 'failure-matrix') {
    document.body.dataset.cmsRoute = '/projekt/diagnostic-fixture/'
    document.querySelector('main').innerHTML = [
      '<div class="fixture-failure-grid">',
      '<p class="fixture-clipped" data-cms-field="summary" data-cms-document-id="project-sv-diagnostic" data-cms-path="summary">Den här texten klipps medvetet för att bevisa diagnostiken.</p>',
      '<h1 class="fixture-unbroken" data-cms-field="title" data-cms-document-id="project-sv-diagnostic" data-cms-path="title">ExtremtLangtObrutetProjektnamnSomMassteBlockeraRedaktionellGranskning</h1>',
      '<p class="fixture-unsafe-measure" data-cms-field="body" data-cms-text data-cms-line-limit="75" data-cms-document-id="project-sv-diagnostic" data-cms-path="body">Detta stycke är avsiktligt mycket brett så att den beräknade radlängden överskrider en säker läsbredd och ger en konkret fältvarning.</p>',
      '<div class="fixture-overlap">',
      '<div data-cms-overlap-group="controls" data-cms-field="primaryAction" data-cms-document-id="project-sv-diagnostic" data-cms-path="title">Primär kontroll</div>',
      '<div data-cms-overlap-group="controls" data-cms-field="secondaryAction" data-cms-document-id="project-sv-diagnostic" data-cms-path="summary">Överlappande kontroll</div>',
      '</div>',
      '<div class="fixture-media-row">',
      '<img data-cms-media data-cms-field="heroImage" data-cms-document-id="project-sv-diagnostic" data-cms-path="heroImage" alt="Saknad testbild">',
      '<img data-cms-media data-cms-field="galleryImages" data-cms-document-id="project-sv-diagnostic" data-cms-path="galleryImages[0]" src="/fixtures/does-not-exist.jpg" alt="Trasig testbild">',
      '</div>',
      '<div class="fixture-force-horizontal" aria-hidden="true"></div>',
      '</div>',
    ].join('')
    return
  }

  var fixture = copy[variant] || copy['long-sv']
  document.body.dataset.cmsRoute = fixture.route
  document.querySelector('main').innerHTML = [
    '<article class="fixture-copy">',
    '<h1 data-cms-field="title" data-cms-text data-cms-line-limit="75" data-cms-document-id="project-fixture" data-cms-path="title">' + fixture.title + '</h1>',
    '<p data-cms-field="summary" data-cms-text data-cms-line-limit="75" data-cms-document-id="project-fixture" data-cms-path="summary">' + fixture.summary + '</p>',
    '</article>',
    '<img class="fixture-media" data-cms-media data-cms-field="heroImage" data-cms-document-id="project-fixture" data-cms-path="heroImage" src="' + validImage + '" alt="Neutral deterministic fixture">',
  ].join('')
})()
