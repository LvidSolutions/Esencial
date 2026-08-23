import type {StructureResolver} from 'sanity/structure'

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Innehåll & publicering · avancerat')
    .items([
      S.listItem()
        .title('Klar att publicera')
        .child(
          S.documentList()
            .title('Klar att publicera')
            .filter('_type == "project" && status == "review"'),
        ),
      S.listItem()
        .title('Under arbete')
        .child(
          S.documentList().title('Under arbete').filter('_type == "project" && status == "draft"'),
        ),
      S.divider(),
      S.listItem()
        .title('Startsida')
        .child(S.document().schemaType('homePage').documentId('homePage')),
      S.divider(),
      S.listItem()
        .title('Svenska projekt')
        .child(
          S.documentList()
            .title('Svenska projekt')
            .filter('_type == "project" && language == "sv"'),
        ),
      S.listItem()
        .title('Engelska projekt')
        .child(
          S.documentList()
            .title('Engelska projekt')
            .filter('_type == "project" && language == "en"'),
        ),
      S.listItem()
        .title('Projektfilter')
        .child(S.documentTypeList('filterCategory').title('Projektfilter')),
      S.listItem()
        .title('Projektrutnät och filteretiketter')
        .child(S.document().schemaType('navigationSettings').documentId('navigationSettings')),
      S.listItem()
        .title('Tjänster / Services')
        .child(S.documentTypeList('service').title('Tjänster / Services')),
      S.divider(),
      S.listItem()
        .title('Webbplatsinställningar')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    ])
